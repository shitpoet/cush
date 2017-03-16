include('curlify')
include('toker')
include('tokstream')
include('tplparse')
include('tplcompile')
include('tplstringify')
include('stlparse')
include('stlcompile')
include('stlstringify')

let fs = require('fs')

let logging = true
let timing = false

//todo: refactor
export fun postprocess_php(tpl)
  tpl = tpl.replace(/\[\[(.*?)\]\]/g, '<?php if (isset($$$1)) echo $$$1?>')
  //tpl = tpl.split('[[').join('<?php echo $')
  //tpl = tpl.split(']]').join('?>')
  ret tpl
///////////////////

export let pipeline = {
  _cache: {},
  _posts: {}, // postprocessors
  /*reload(fn) {
  },*/

  getStatus: fun(fn) {
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
  get_entry: fun(fn) {
    let c = this._cache
    let mtime = fs.statSync(fn).mtime.toString()
    if (
      (fn in c) &&
      (c[fn].mtime == mtime)
    ) {
      log('cache: read  '+fn)
      return c[fn]
    } else {
      //log('cache: '+fn+' is not cached')
      //let source = fs.readFileSync(fn,'utf8')
      let source = read_and_curlify(fn)
      log('curlified source')
      log(source)
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

  tokenize: fun(fn) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (!entry.toks) {
      //log('cache: '+fn+' is not tokenized')
      log('cache: token '+fn)
      entry.toks = tokenize(fn, entry.source)
    } else {
      //log('cache: '+fn+' is tokenized')
      //log(entry.toks)
      let toks = entry.toks
      for (let tok of toks) {
        tok.line.obs = tok.line.obs0
      }
    }

    //dump_tokens(entry.toks)
    //dump-lines-flags(entry.source, entry.toks)

    return entry.toks
  },

  parse: fun(fn, opts) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (entry.ast) {
      //log('cache: '+fn+' is parsed')
      log('cache: parse '+fn)
    } else {
      let toks = this.tokenize(fn)
      //log('cache: '+fn+' is not parsed')
      var s = new TokStream(toks)
      if fn.endsWith('.tpl') {
        var tplparser = new TplParser()
        entry.ast = tplparser.parse(s, opts)
      } else if fn.endsWith('.stl') {
        var stlparser = new StlParser()
        entry.ast = stlparser.parse(s, opts)
      } else {
        throw new Error('pipeline: unknown file type '+fn)
      }
    }
    return entry.ast
  },

  compile: fun(fn, opts) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (entry.code!==null) {
      //log('cache: '+fn+' is compiled')
      log('cache: compl '+fn)
    } else {
      this.parse(fn, opts)
      //log('cache: '+fn+' is not compiled')
      if fn.endsWith('.tpl') {
        time('compileTemplate')
        entry.code = compileTemplate(entry.ast, opts)
        timeEnd('compileTemplate')
      } else {
        time('compileStyle')
        entry.code = compileStyle(entry.ast, opts)
        timeEnd('compileStyle')
      }
    }
    return entry.code
  },

  render: fun(fn, opts, vars) {
    let c = this._cache
    let entry = this.get_entry(fn)
    if (entry.str!==null) {
      //log('cache: '+fn+' is rendered')
      log('cache: render '+fn)
    } else {
      this.compile(fn, opts)
      //log('cache: '+fn+' is not rendered')
      time('pipeline.render')
      entry.str = entry.code(vars)
      timeEnd('pipeline.render')
      if fn.endsWith('.tpl')
        if opts.php_mode
          entry.str = postprocess_php(entry.str)
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

  clearCache: fun() {
    log('cache: clear')
    this._cache = {}
  },

  clear_root_templates: fun()
    log('cache: clear toot templates')
    let c = this._cache
    for fn in c
      if fn.endsWith('.tpl') && !fn.split('/').pop().startsWith('_')
        delete this._cache[fn]
  ,

  clear_root_styles: fun()
    log('cache: clear toot styles')
    let c = this._cache
    for fn in c
      if fn.endsWith('.stl') && !fn.split('/').pop().startsWith('_')
        delete this._cache[fn]
  ,

  //registerStage

  add_post: fun(fmt, cb)
    l('add_post')
    if !(fmt in this._posts)
      this._posts[fmt] = []
    if !this._posts[fmt].includes(cb)
      this._posts[fmt].push(cb)

}

