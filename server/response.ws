// handle http requests:
//  - parse url
//  - call relevant responder if exists
//  - otherwise just server the file as is

let node-static = require('node-static')
let static-server = new(node-static.Server)()
include('responders')

|*
var lastTplPath='', lastStlPath=''
var lastCsss=[], lastHtmls=[]
var lastPageVars = {}
let tplParseError = null // was wo let......
let stlParseError = null
*|

fun parse-url(url)
  let relative-url = url.split('/').slice(1).join('/')
  let [query, frag] = relative-url.split('#')
  let [path, args] = query.split('?')
  var path-parts = path.split('/')
  var fn = path-parts.pop()
  fn = fn.split('__')[0] // handle forced to reload urls
  let dir = path-parts.join('/')
  let [name, ext] = fn.split('.')
  if (!ext) ext = ''
  //log('name',name)
  ret {query, path, dir, fn, name, ext, frag}

export fun respond(opts) {
  ret fun (req, res) {
    /*var render_opts = {
    }
    log('render opts', render_opts)*/

    log('GET '+req.url)

    let parsed-url = parse-url(req.url)
    let ext = parsed-url.ext

    let handled = false
    for (let resp of responders)
      //log(resp)
      if resp.exts.includes(ext)
        log(parsed-url.query, ext)
        resp.handle(parsed-url, res, opts)
        handled = true
    if !handled
      //log('static file '+req.url)
      req.add-listener('end', fun()
        static-server.serve(req, res)
      ).resume()

  }
}
