//todo: decouple request processing from rendering

const fs = require('fs')

var staticServer = new(require('node-static').Server)();
//require('raptor-polyfill')
let include = require('./include')

time('load bunch of modules')

include('error')
include('common')
include('pipeline')
include('toker')
include('tokstream')
include('tplparse')
include('stlparse')
include('tplcompile')
include('stlcompile')

timeEnd('load bunch of modules')

var lastTplPath='', lastStlPath=''
var lastCsss=[], lastHtmls=[]
var lastPageVars = {}
let tplParseError = null // was wo let......
let stlParseError = null

let last_mcc_opts = {}

export fun make_client_code(opts)
  let code = ''
  //code += getFile(__dirname+'/client/socket.io.js')
  code += getFile(__dirname+'/client/socketio.min.js')
  code += getFile(__dirname+'/client/reload.js').replace('SIO_PORT', opts.port*10)
  code += getFile(__dirname+'/client/client.js')
  last_mcc_opts = opts
  return code

let client_code = ''

export fun rebuild_client_code()
  client_code = make_client_code(last_mcc_opts)

/*fun renderTemplate(fn, str) {
  console.time('renderTemplate')
  let toks
  if (typeof str == 'undefined')
    toks = fileCache.tokenize(fn)
  else
    toks = tokenize(fn, str)
  //dumpTokens(toks)
  //dumpLinesFlags(str, toks)
  var s = new TokStream(toks)
  var tplparser = new TplParser()
  var ast = tplparser.parse(s)
  var func = compileTemplate(ast)
  var res = func(projectInfo.variables)
  console.timeEnd('renderTemplate')
  return res
}

fun renderStyle(fn, str) {
  console.time('renderStyle')
  let toks
  if (typeof str == 'undefined')
    toks = fileCache.tokenize(fn)
  else
    toks = tokenize(fn, str)
  //dumpTokens(toks)
  //dumpLinesFlags(str, toks)
  var s = new TokStream(toks)
  var stlparser = new StlParser()
  var ast = stlparser.parse(s)
  //log(ast)
  var func = compileStyle(ast)
  let res = func(projectInfo.variables)
  console.timeEnd('renderStyle')
  return res
}*/

fun renderTemplate(fn, opts) {
  time('renderTemplate')

  /*let ast = pipeline.parse(fn)
  console.time('compileTemplate')
  var func = compileTemplate(ast)
  var res = func(projectInfo.variables)
  console.timeEnd('compileTemplate')*/

  let res = pipeline.render(fn, opts, projectInfo.variables)

  timeEnd('renderTemplate')
  return res
}

fun renderStyle(fn) {
  time('renderStyle')
  /*let ast = pipeline.parse(fn)
  console.time('compileStyle')
  var func = compileStyle(ast)
  let res = func(projectInfo.variables)
  console.timeEnd('compileStyle')*/
  let res = pipeline.render(fn, {}, projectInfo.variables)
  timeEnd('renderStyle')
  return res
}

export function respond(opts) {
  client_code = make_client_code(opts)
  return function (req, res) {
    var render_opts = {
      //skip_php_tags: projectInfo.variables.php_mode,
      //recursive_render: !projectInfo.variables.php_mode
      //recursive_render: !opts.php_mode
      php_mode: opts.php_mode
    }
    log('render opts', render_opts)

    //console.log('HTTP '+req.url)
    var url = req.url
    var query = url.split('/').slice(1).join('/')
    //log('query', query)
    var queryEls = query.split('?')
    var path = queryEls[0]
    var pathEls = path.split('/')
    var fn = pathEls.pop()
    fn = fn.split('__')[0] // handle forced to reload urls
    //log('fn', fn)
    path = pathEls.join('/')
    if (path != '') path += '/'
    //log('path', path)
    query = (queryEls.length > 1) ? queryEls[1] : ''
    var name = fn.split('.')[0]
    if (name=='') name = 'index'
    //log('name',name)
    var fnparts = fn.split('.')
    var ext = fnparts.length >= 2 ? fn.split('.').pop() : ''
    if (!ext) ext = ''
    var tpl_path  = path+name+'.tpl'
    var html_path = path+name+'.html'
    var stl_path  = path+name+'.stl'
    var css_path  = path+name+'.css'
    //if css_path.indexOf('/stl/') > 0
    if opts.wp_mode
      css_path = 'style.css'
    //log('tpl_path',tpl_path)
    //log('html_path',html_path)
    log('stl_path',stl_path)
    log('css_path',css_path)
    //log('ext',ext)
    if ((ext==''||ext=='html') && exists(tpl_path)) {
      var pageVars = {}
      if (ext=='') {
        log('page '+tpl_path)
        // execute page js script
        /*var svjsfn = name+'.js'
        if (exists(svjsfn)) {
          log('js file '+svjsfn+' exists')
          log('cwd',process.cwd())
          global.isClient = false
          var fullsvjsfn = process.cwd()+'/'+svjsfn
          delete require.cache[require.resolve(fullsvjsfn)]
          pageVars = require(fullsvjsfn).view()
        }*/
      } else {
        log('template '+tpl_path)
      }
      //var tpl = pipeline.get(tpl_path).source
      var tpl
      res.writeHead(200, {"Content-Type": "text/html"})
      //log('---------------------------')
      //log(tpl)
      //log('---------------------------')
      lastTplPath = tpl_path
      lastPageVars = pageVars
      try {
        /*if (render_opts.skip_php_tags) {
          log('skip php tags')
          tpl = tpl.split('<?=$').join('PHP_ECHO_VAR_TAG')
          tpl = tpl.split('<?=').join('PHP_ECHO_TAG')
          tpl = tpl.split('<?php').join('PHP_OPEN_TAG')
          tpl = tpl.split('<?').join('PHP_OPEN_TAG')
          tpl = tpl.split('?>').join('PHP_CLOSE_TAG')
        }*/
        //tpl = renderTemplate(tpl_path, tpl)
        tpl = renderTemplate(tpl_path, render_opts)
        //tpl = view.render(tpl_path, tpl, lastStlPath, lastStl, [projectInfo.vars, pageVars], render_opts).tpl

        if opts.php_mode
          tpl = postprocess_php(tpl)

        lastHtmls[tpl_path] = tpl
        //lastHtml = tpl

        if (opts.onSetLastError) opts.onSetLastError(tpl_path, null)
      } catch (e) {
        panic('catch tpl parse error')
        handle_error(e)
        if (e.stack) e = e.stack
        //panic(e)
        tpl = lastHtmls[tpl_path]
        if (!tpl) tpl = '<html></html>'
        tplParseError = e
        //sendParseErrors()
        if (opts.onSetLastError) opts.onSetLastError(tpl_path, e)
      }

      //log(tpl)

      if opts.php_mode
        html_path = html_path.replace('.html', '.php')
        // add reload code to output file
        if opts.live_reload {
          if (tpl.indexOf('</html>')>=0) { // attach autoreload script only once
            tpl += "<script>\n"
            tpl += client_code
            //tpl += getFile(__dirname+'/lib/socket.io.js')
            //tpl += getFile(__dirname+'/reload.js')
            tpl += "</script>"
            //tpl += "<script src='http://localhost:8888/RELOAD.js'></script>"
          }
          //}
        }

      if opts.php_mode
        fs.writeFileSync(html_path, tpl)
      else
        fs.writeFile(html_path, tpl)

      // add reload code to output stream
      if opts.live_reload && !opts.php_mode {

        if (tpl.indexOf('</html>')>=0) { // attach autoreload script only once
          tpl += "<script>\n"
          tpl += client_code
          //tpl += getFile(__dirname+'/lib/socket.io.js')
          //tpl += getFile(__dirname+'/reload.js')
          tpl += "</script>"
          //tpl += "<script src='http://localhost:8888/RELOAD.js'></script>"
        }
        //}
      }

      res.end(tpl)

    } else if (ext=='css' && exists(stl_path)) {
    //} else if (pagename.startsWith('style.css')) {
      log('style '+stl_path)
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
      res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
      res.setHeader("Expires", "0"); // Proxies.
      res.writeHead(200, {"Content-Type": "text/css"})

      //var stl = pipeline.get(stl_path).source
      var stl
      lastStlPath = stl_path
      try {
        //stl = view.render(lastTplPath, lastTpl, stl_path, stl, [projectInfo.vars, lastPageVars]).stl
        //stl = renderStyle(stl_path, stl)
        stl = renderStyle(stl_path)
        lastCsss[stl_path] = stl
        if (opts.onSetLastError) opts.onSetLastError(stl_path, null)
      } catch(e) {
        panic('catch stl parse error')
        handle_error(e)
        //panic(e)
        stl = lastCsss[stl_path]
        if (e.stack) e = e.stack
        stlParseError = e
        //log('stlParseError',stlParseError)
        //sendParseErrors()
        if (opts.onSetLastError) opts.onSetLastError(stl_path, e)
      }
      res.end(stl)
      log('write css',css_path)
      fs.writeFile(css_path, stl)
    /*} else if (fn=='RELOAD.js') {
      res.writeHead(200, {"Content-Type": "text/javascript"})
      var code = ''
      code += getFile(__dirname+'/client/socket.io.js')
      code += getFile(__dirname+'/client/reload.js').replace('SIO_PORT', opts.port+1)
      res.end(code)*/
    /*} else if (fn=='favicon.ico' && !fs.existsSync(fn)) {
      * if favicon requests and there no file send development icon
         to avoid 404 error message in console (because of bad browser extensions) *
      req.url = 'media/favicon.ico'
      staticServer.serve(req, res);i*/
    } else {
      //log('static file '+req.url)
      //staticServer.serve(req, res);
      req.addListener('end', function() {
        staticServer.serve(req, res)
      }).resume();

    }
  }
}




