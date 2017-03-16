include('pipeline')
//include('toker')
//include('tokstream')
//include('tplparse')
//include('tplcompile')

//timeEnd('load bunch of modules')

var lastTplPath='', lastStlPath=''
var lastHtmls=[]

var lastPageVars = {}
let tplParseError = null // was wo let......
let stlParseError = null

let last_mcc_opts = {}

fun handle_error(e)
  caught.handle_error(e, {fatal: false})

export fun make_client_code(opts)
  let code = ''
  let dir = __dirname + '/../../client'
  //code += getFile(__dirname+'/client/socket.io.js')
  code += getFile(dir + '/socketio.min.js')
  code += getFile(dir + '/reload.js').replace('SIO_PORT', opts.port*10)
  code += getFile(dir + '/client.js')
  last_mcc_opts = opts
  return code

let client_code = ''

export fun rebuild_client_code()
  client_code = make_client_code(last_mcc_opts)

fun renderTemplate(fn, opts) {
  time('renderTemplate')

  /*let ast = pipeline.parse(fn)
  console.time('compileTemplate')
  var func = compileTemplate(ast)
  var res = func(projectInfo.variables)
  console.timeEnd('compileTemplate')*/

  let res = pipeline.render(fn, opts, project.locals)

  timeEnd('renderTemplate')
  return res
}

export let responder = {
  exts: ['', 'html', 'tpl'],
  handle: fun(url, res, opts)
    client_code = make_client_code(opts)
    //log-call('tpl resp stub', true)
    let {dir, name} = url
    name = name || 'index'
    dir = project.root + '/' + dir
    var tpl-path  = dir+'/'+name+'.tpl'
    var html-path = dir+'/'+name+'.html'
    log('tpl_path',tpl-path)
    log('html_path',html-path)
    res.writeHead(200, {"Content-Type": "text/html"})
    if file-exists(tpl-path)

      let tpl_path = tpl-path
      let render_opts = {}

      var tpl
      lastTplPath = tpl_path
      try {
        tpl = renderTemplate(tpl_path, render_opts)

        lastHtmls[tpl_path] = tpl
        //lastHtml = tpl

        if (opts.onSetLastError) opts.onSetLastError(tpl_path, null)
      } catch (e) {
        panic('catch tpl parse error')
        handle-error(e)
        if (e.stack) e = e.stack
        //panic(e)
        tpl = lastHtmls[tpl_path]
        if (!tpl) tpl = '<html></html>'
        tplParseError = e
        //sendParseErrors()
        if (opts.onSetLastError) opts.onSetLastError(tpl_path, e)
      }

      //log(tpl)

      fs.writeFile(html-path, tpl, fun(){})

      // add reload code to output stream
      if opts.live-reload
        if (tpl.indexOf('</html>')>=0) { // attach autoreload script only once
          tpl += "<script>\n"
          tpl += client_code
          //tpl += getFile(__dirname+'/lib/socket.io.js')
          //tpl += getFile(__dirname+'/reload.js')
          tpl += "</script>"
          //tpl += "<script src='http://localhost:8888/RELOAD.js'></script>"
        }
        //}

      res.end(tpl)
    elif file-exists(html-path)
      error('NO IMPL html serving')
}


