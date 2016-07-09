  let fs = require('fs')

let logging = true
let timing = false

export let pipeline = {
  _cache: {},
  _posts: {}, // postprocessors
  /*reload(fn) {
  },*/
  getStatus(fn) {
    let c = this._cache
    if (c[fn]) {
      let mtime = fs.statSync(fn).mtime.toString()
      if (c[fn].mtime == mtime) {
        if (c[fn].toks) {
          if (c[fn].ast) {
            if (c[fn].code) {
              if (c[n].str) {
                log('rendered')
              } else {
                log('compiled')
              }
            } else {
              log('parsed')
            }
          } else {
            log('tokenized')
          }
        } else {
          log('cached')
        }
      } else {
        log('not cached')
      }
    } else {
      log('no entry')
    }
  },

  // get existing or new create cache entry for file
  get_entry(fn) {
    let c = this._cache
    let mtime = fs.statSync(fn).mtime.toString()
    if (
      (fn in c) &&
      (c[fn].mtime == mtime)
    ) {
      log('cache: '+fn+' is cached')
      return c[fn]
    } else {
      log('cache: '+fn+' is not cached')
      //let source = fs.readFileSync(fn,'utf8')
      let source = read_and_curlify(fn)
      let entry = {
        mtime,
        source,
        toks: null,
        ast: null,
        code: null,
        str: null
      }
      c[fn] = entry
      return entry
    }
  },

  tokenize(fn) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (!entry.toks) {
      log('cache: '+fn+' is not tokenized')
      entry.toks = tokenize(fn, entry.source)
    } else {
      log('cache: '+fn+' is tokenized')
      //log(entry.toks)
      let toks = entry.toks
      for (let tok of toks) {
        tok.line.obs = tok.line.obs0
      }
    }

    //dump_tokens(entry.toks)
    //dumpLinesFlags(str, toks)

    return entry.toks
  },

  parse(fn) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (entry.ast) {
      log('cache: '+fn+' is parsed')
    } else {
      let toks = this.tokenize(fn)
      log('cache: '+fn+' is not parsed')
      var s = new TokStream(toks)
      if fn.endsWith('.tpl') {
        var tplparser = new TplParser()
        entry.ast = tplparser.parse(s)
      } else if fn.endsWith('.stl') {
        var stlparser = new StlParser()
        entry.ast = stlparser.parse(s)
      } else {
        throw new Error('pipeline: unknown file type '+fn)
      }
    }
    return entry.ast
  },

  compile(fn) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (entry.code!==null) {
      log('cache: '+fn+' is compiled')
    } else {
      this.parse(fn)
      log('cache: '+fn+' is not compiled')
      if fn.endsWith('.tpl') {
        time('compileTemplate')
        entry.code = compileTemplate(entry.ast)
        timeEnd('compileTemplate')
      } else {
        time('compileStyle')
        entry.code = compileStyle(entry.ast)
        timeEnd('compileStyle')
      }
    }
    return entry.code
  },

  render(fn, vars) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (entry.str!==null) {
      log('cache: '+fn+' is rendered')
    } else {
      this.compile(fn)
      log('cache: '+fn+' is not rendered')
      time('pipeline.render')
      entry.str = entry.code(projectInfo.variables)
      timeEnd('pipeline.render')
      if fn.endsWith('.stl')
        if 'stl' in this._posts
          time('pipeline.postprocess')
          for cb of this._posts['stl']
            entry.str = cb(entry.str)
          timeEnd('pipeline.postprocess')
    }
    return entry.str
  },

  /*postprocess(fn, vars, opts) {
    let entry = this.get_entry(fn)
    if entry.poststr!==null
      log('cache: '+fn+' is postprocessed')
    else
      this.render(fn, vars)
      log('cache: '+fn+' is not postprocessed')
      if fn.endsWith('.stl')
        time('pipeline: postprocess')
        //// do autopref ///////
        timeEnd('pipeline: postprocess')
      //entry.poststr = entry.str
    return entry.poststr
  },*/

  clearCache() {
    log('cache: clear')
    this._cache = {}
  },

  clear_root_templates()
    log('cache: clear toot templates')
    let c = this._cache
    for fn in c
      if fn.endsWith('.tpl') && !fn.split('/').pop().startsWith('_')
        delete this._cache[fn]
  ,

  clear_root_styles()
    log('cache: clear toot styles')
    let c = this._cache
    for fn in c
      if fn.endsWith('.stl') && !fn.split('/').pop().startsWith('_')
        delete this._cache[fn]
  ,

  //registerStage

  add_post(fmt, cb)
    l('add_post')
    if !(fmt in this._posts)
      this._posts[fmt] = []
    if !this._posts[fmt].includes(cb)
      this._posts[fmt].push(cb)

}
