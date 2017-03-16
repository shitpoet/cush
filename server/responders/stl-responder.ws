include('pipeline')

fun handle_error(e)
  global.handle-error(e, {fatal: false})

var lastCsss=[]

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

export let responder = {
  exts: ['stl', 'css'],
  handle: fun(url, res, opts)
    //log-call('stl resp stub')
    let {dir, name} = url
    name = name || 'index'
    dir = project.root + '/' + dir
    let stl-path  = dir+'/'+name+'.stl'
    let css-path  = dir+'/'+name+'.css'

    //todo: refact
    let stl_path = stl-path
    let css_path = css-path

    if file-exists(stl_path)
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
      fs.writeFile(css_path, stl, fun(){})
      //fs.writeFileSync(css_path, stl)


}

