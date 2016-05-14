let fs = require('fs')

export let pipeline = {
  _cache: {},
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
  get(fn) {
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
      let source = fs.readFileSync(fn,'utf8')
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
    let entry = this.get(fn)
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
    let entry = this.get(fn)
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
    let entry = this.get(fn)
    if (entry.code!==null) {
      log('cache: '+fn+' is compiled')
    } else {
      this.parse(fn)
      log('cache: '+fn+' is not compiled')
      if fn.endsWith('.tpl') {
        console.time('compileTemplate')
        entry.code = compileTemplate(entry.ast)
        console.timeEnd('compileTemplate')
      } else {
        console.time('compileStyle')
        entry.code = compileStyle(entry.ast)
        console.timeEnd('compileStyle')
      }
    }
    return entry.code
  },

  render(fn, vars) {
    let c = this._cache
    let entry = this.get(fn)
    if (entry.str!==null) {
      log('cache: '+fn+' is rendered')
    } else {
      this.compile(fn)
      log('cache: '+fn+' is not rendered')
      console.time('render')
      entry.str = entry.code(projectInfo.variables)
      console.timeEnd('render')
    }
    return entry.str
  },

  clearCache() {
    log('cache: clear')
    this._cache = {}
  }
}
