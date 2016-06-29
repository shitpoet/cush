//todo: decouple request processing from rendering

let logging = true
let timing = true

//var hotload = require('hotload')
var postcss = require('postcss')
var autoprefixer = require('autoprefixer')
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

//var projectJson = eval('('+fs.readFileSync('cush.json','utf8')+')')
//var projectInfo = require(process.cwd()+'/cush.js')
include(process.cwd()+'/cush')
//log('projectInfo',projectInfo)

var lastTplPath='', lastStlPath=''
var lastCsss=[], lastHtmls=[]
var lastPageVars = {}
let tplParseError = null // was wo let......
let stlParseError = null

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

fun renderTemplate(fn) {
  time('renderTemplate')

  /*let ast = pipeline.parse(fn)
  console.time('compileTemplate')
  var func = compileTemplate(ast)
  var res = func(projectInfo.variables)
  console.timeEnd('compileTemplate')*/

  let res = pipeline.render(fn, projectInfo.variables)

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
  let res = pipeline.postprocess(fn, projectInfo.variables)
  timeEnd('renderStyle')
  return res
}

export function respond(opts) {
  return function (req, res) {
    var renderOpts = {
      skipPhpTags: projectInfo.variables.phpMode,
      recursiveRender: !projectInfo.variables.phpMode
    }
    //log('render opts',renderOpts)









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
    var tplPath  = path+name+'.tpl'
    var htmlPath = path+name+'.html'
    var stlPath  = path+name+'.stl'
    var cssPath  = path+name+'.css'
    //log('tplPath',tplPath)
    //log('htmlPath',htmlPath)
    //log('stlPath',stlPath)
    //log('ext',ext)
    if ((ext==''||ext=='html') && exists(tplPath)) {
      var pageVars = {}
      if (ext=='') {
        log('page '+tplPath)
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
        log('template '+tplPath)
      }
      //var tpl = pipeline.get(tplPath).source
      var tpl
      res.writeHead(200, {"Content-Type": "text/html"})
      //log('---------------------------')
      //log(tpl)
      //log('---------------------------')
      lastTplPath = tplPath
      lastPageVars = pageVars
      try {
        /*if (renderOpts.skipPhpTags) {
          log('skip php tags')
          tpl = tpl.split('<?=$').join('PHP_ECHO_VAR_TAG')
          tpl = tpl.split('<?=').join('PHP_ECHO_TAG')
          tpl = tpl.split('<?php').join('PHP_OPEN_TAG')
          tpl = tpl.split('<?').join('PHP_OPEN_TAG')
          tpl = tpl.split('?>').join('PHP_CLOSE_TAG')
        }*/
        //tpl = renderTemplate(tplPath, tpl)
        tpl = renderTemplate(tplPath)
        //tpl = view.render(tplPath, tpl, lastStlPath, lastStl, [projectInfo.vars, pageVars], renderOpts).tpl
        lastHtmls[tplPath] = tpl
        //lastHtml = tpl
        /*if (renderOpts.skipPhpTags) {
          tpl = tpl.split('PHP_ECHO_VAR_TAG').join('<?php echo $')
          tpl = tpl.split('PHP_ECHO_TAG').join('<?php echo ')
          tpl = tpl.split('PHP_OPEN_TAG').join('<?php ')
          tpl = tpl.split('PHP_CLOSE_TAG').join('?>')
        }*/
        if (opts.onSetLastError) opts.onSetLastError(tplPath, null)
      } catch (e) {
        panic('catch tpl parse error')
        handle_error(e)
        if (e.stack) e = e.stack
        //panic(e)
        tpl = lastHtmls[tplPath]
        if (!tpl) tpl = '<html></html>'
        tplParseError = e
        //sendParseErrors()
        if (opts.onSetLastError) opts.onSetLastError(tplPath, e)
      }

      //log(tpl)

      fs.writeFile(htmlPath, tpl)

      //log(opts);
      if (opts.liveReload) {

        /*tpl += "<script>\n"
        tpl += getFile(__dirname+'/lib/socket.io.js')
        tpl += getFile(__dirname+'/reload.js')
        tpl += "</script>"*/
        //if (projectInfo.variables.phpMode) {
        if (tpl.indexOf('</html>')>=0) { // attach autoreload script only once
          tpl += "<script src='http://localhost:8888/RELOAD.js'></script>"
        }
        //}
      }

      res.end(tpl)
      //putFile(htmlPath, tpl)
      if (projectInfo.variables.phpMode) {
        /*if htmlPath=='index.html') { // main page
          htmlPath = 'home.php';
        } else*/ if (htmlPath.startsWith('_')) { // partial
          htmlPath = 'theme/'+htmlPath.replace('html','php')
        } else { // page
          htmlPath = 'theme/page-'+htmlPath.replace('html','php')
        }
      }

    } else if (ext=='css' && exists(stlPath)) {
    //} else if (pagename.startsWith('style.css')) {
      log('style '+stlPath)
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
      res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
      res.setHeader("Expires", "0"); // Proxies.
      res.writeHead(200, {"Content-Type": "text/css"})

      //var stl = pipeline.get(stlPath).source
      var stl
      lastStlPath = stlPath
      try {
        //stl = view.render(lastTplPath, lastTpl, stlPath, stl, [projectInfo.vars, lastPageVars]).stl
        //stl = renderStyle(stlPath, stl)
        stl = renderStyle(stlPath)
        lastCsss[stlPath] = stl
        if (opts.onSetLastError) opts.onSetLastError(stlPath, null)
      } catch(e) {
        panic('catch stl parse error')
        if (e.stack) e = e.stack
        panic(e)
        stl = lastCsss[stlPath]
        stlParseError = e
        //log('stlParseError',stlParseError)
        //sendParseErrors()
        if (opts.onSetLastError) opts.onSetLastError(stlPath, e)
      }
      if (opts.autoprefix) {
        log('apply autoprefix')
        console.time('autoprefix')
        //var cleaner  = postcss([ autoprefixer({ add: false, browsers: [] }) ]);
        var pc = postcss([
          //require('postcss-rgba-hex'),
          autoprefixer({
            browsers: ['last 2 versions', 'ios 5', 'android >= 2.1', 'ie 9']
          })
          /*autoprefixer({
            browsers: ['last 2 versions', 'ios 5', 'android >= 2.1', 'ie 8', 'ie 9']
          })*/
        ]);
        /*cleaner.process(stl).then(function (cleaned) {
          return prefixer.process(cleaned.css)
        }).then(function (result) {*/

        pc.process(stl).then(function(result) {
          stl = result.css
          console.timeEnd('autoprefix')
          res.end(stl)
          //console.log(stl);
          //log('putf',putFile)
          log('write',cssPath)
          fs.writeFile(cssPath, stl)
        }, function(error) {
          //log(Object.keys(error.source))
          log(error.toString())
          /*log(error.message)
          log('> '+source[line-1])
          log('> '+source[line])
          log('> '+source[line+1])*/
        });
      } else {
        res.end(stl)
        //log('fs.writeFile',cssPath)
        //putFile(cssPath, stl)
        log('write',cssPath)
        fs.writeFile(cssPath, stl)
      }
    } else if (fn=='RELOAD.js') {
      res.writeHead(200, {"Content-Type": "text/javascript"})
      var code = ''
      code += getFile(__dirname+'/client/socket.io.js')
      code += getFile(__dirname+'/client/reload.js').replace('SIO_PORT', opts.port+1)
      res.end(code)
    /*} else if (fn=='favicon.ico' && !fs.existsSync(fn)) {
      * if favicon requests and there no file send development icon
         to avoid 404 error message in console (because of bad browser extensions) *
      req.url = 'media/favicon.ico'
      staticServer.serve(req, res);i*/
    } else {
      //log('static file '+req.url)
      staticServer.serve(req, res);
    }
  }
}



function getStack() {
  // Save original Error.prepareStackTrace
  var origPrepareStackTrace = Error.prepareStackTrace

  // Override with function that just returns `stack`
  Error.prepareStackTrace = function (_, stack) {
    return stack
  }

  // Create a new `Error`, which automatically gets `stack`
  var err = new Error()

  // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
  var stack = err.stack

  // Restore original `Error.prepareStackTrace`
  Error.prepareStackTrace = origPrepareStackTrace

  // Remove superfluous function call on stack
  stack.shift() // getStack --> Error

  return stack
}


