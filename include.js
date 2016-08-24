"use strict"

let _logging = true
function log(...args) {
  if (_logging) console.log(...args)
}
let l = log
let _timing = false
function time(...args) {
  if (_timing) console.time(...args)
}
function timeEnd(...args) {
  if (_timing) console.timeEnd(...args)
}

let hot = true
//let hot = false

let Module = require('module')
let path = require('path')
//let fs = require('fs')
let vm = require('vm')
//let buffer = require('buffer')
//let Buffer = buffer

var colors = require('colors/safe');

let chokidar
if (hot) chokidar = require('chokidar') // for hot reloading

let Debug
if (hot) Debug = v8debug.Debug

let ffi = require('ffi')
let libskim = ffi.Library('/home/ors/lab/skim/libskim.so', {
  'read_and_rewrite': [ 'string', [ 'string', 'bool' ] ]
})
function read_and_curlify(fn, expand) {
  expand = expand || false
  return libskim.read_and_rewrite(fn, expand)
}
global.read_and_curlify = read_and_curlify

let cache = new Map()

/*function getAllMatches(s, re) {
  let matches = []
  let m
  do {
    m = re.exec(s)
    if (m) matches.push( m[1] )
  } while (m)
  return matches
}*/

/* rewrite code if it is being reload

   in strong mode we can not redeclare `let` variable
   so we strip `let` to reassign module-level variables
   without redeclaration

   also in strong mode we can not redeclare functions
   declared as `function name () {}` so we rewrite
   them as `let name = function() {}`

*/
/*function rewrite_simple(code, reload) {
  code = code.replace(/^function\s+([a-zA-Z0-9_\-$]+)/gm, 'let $1 = function')
  if (reload) {
    code = code.replace(/^let\s/gm, '')
  }
}*/

/*
   this func also wrappes module into a closure
   so top level variables are local to the module
   but it also parses ES6-like `export` keywords
   and make exported keywords global
*/
function rewrite_closure(code, reload) {

  // convert func decls to var decls
  //code = code.replace(/^function\s+([a-zA-Z0-9_\-$]+)/gm, 'let $1 = function')
  //code = code.replace(/^export function\s+([a-zA-Z0-9_\-$]+)/gm, 'export let $1 = function')

  // collect es6-like exports
  //let constRe = /^export\s+const\s+([a-zA-Z0-9_\-$]+)/g
  let letRe =  /^export\s+let\s+([a-zA-Z0-9_\-$]+)/gm
  let funcRe = /^export\s+function\s+([a-zA-Z0-9_\-$]+)/gm
  let classRe = /^export\s+class\s+([a-zA-Z0-9_\-$]+)/gm
  //let consts = getAllMatches(code, constRe)
  let lets = getAllMatches(code, letRe)
  let funcs = getAllMatches(code, funcRe)
  let classes = getAllMatches(code, classRe)
  //code = code.replace(/export\s+const/,     '       const')
  code = code.replace(/^export\s+let\s/gm,      '/*ex*/ let ')
  code = code.replace(/^export\s+function\s/gm, '/*ex*/ function ')
  code = code.replace(/^export\s+class\s/gm,    '/*ex*/ class ')
  let exports = [].concat(lets).concat(funcs).concat(classes)
  if (reload) {
    //code = code.replace(/^let\s/gm, '    ')
    //code = code.replace(/^\/*ex*\/\slet\s/gm, '    ')
  }
  // add mode header
  code = '"use strict";' + code
  // add exports footer
  code = code + ';' + exports.map( (name) => ('global.'+name+'='+name) ).join(';')
  // add closure
  code = '!function(){'+code+'}()'
  return code
}

let Throwing = new Proxy({}, {
  get: function(obj, prop) {
    throw new ReferenceError('unknown property read: '+prop);
  }/*,
  set: function(obj, prop, val) {
    throw new ReferenceError('unknown property wrote: '+prop);
  }*/
})

/*let O = function(obj) {
  obj.__proto__ = throwing
  return obj
}*/

//function O(obj) { return obj }

function CheckedObject(obj) {
  //return Object.assign(obj, {__proto__: throwing})
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      this[prop] = obj[prop]
    }
  }
  //Object.seal(this)
  return this
}

CheckedObject.prototype = Throwing

function O(obj) {
  /*let obj2 = {__proto__: throwing}
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      obj2[prop] = obj[prop]
    }
  }
  return obj2*/
  //let obj2 =
  //return Object.assign({__proto__: throwing}, obj)
  return new CheckedObject(obj)
}

function Tok(obj) {
  return obj
}
Tok.prototype = Throwing

var tt = {
  sp: 1,
  nl: 2,
  ws: 1|2,
  cmnt: 4,
  int: 8,
  //float: 16,
  num: 8|16,
  id: 32,
  sig: 64,
  sqstr: 128,
  dqstr: 256,
  qstr: 128|256,
  sym: 512,
  raw: 1024,
  sol: 16384, // start of line
  flags: 16384
}

function ttToString(mask) {
  if (mask & tt.sol) mask -= tt.sol
  switch (mask) {
    case tt.sp: return 'sp';
    case tt.nl: return 'nl';
    case tt.ws: return 'ws';
    case tt.cmnt: return 'cmnt';
    case tt.int: return 'int';
    case tt.float: return 'float';
    case tt.num: return 'num';
    case tt.id: return 'id';
    case tt.sig: return 'sig';
    case tt.sqstr: return 'sqstr';
    case tt.dqstr: return 'dqstr';
    case tt.qstr: return 'qstr';
    case tt.sym: return 'sym';
    case tt.raw: return 'raw';
    default: throw new Error('unknown token type `'+mask+'`')
  }
}

//include('toks')

var
  is_sp = t => t.t & 1,
  is_nl = t => t.t & 2,
  is_ws = t => t.t & 3,
  is_cmnt = t => t.t & 4,
  is_int = t => t.t & 8,
  //is_float = t => t.t & 16,
  is_num = t => t.t & 24,
  is_id = t => t.t & 32,
  //is_sig = t => t.t & 64,
  //is_s_q_str = t => t.t & 128,
  //isDQStr = t => t.t & 128,
  is_qstr = t => t.t & 384,
  is_sym = t => t.t & 512,
  is_raw = t => t.t & 1024,
  is_sol = t => t.t & 16384,
  is_end = t => t==null

// these types of tokens are not recognized here:
// tt.sig, tt.scmnt
var tokenize = function(fn, str) {
  var srcLines = str.split('\n').concat('')
  var eof = '\0'
  var s = str + eof+eof+eof+eof+eof+eof
  var toks = []
  var sol = tt.sol // start of line flag
  var ln = 1
  var col = 0 // :=1 after first pre-shift
  var n = str.length
  var i = -1 // :=0 after first pre-shift
  var ch,ch2,ch3
  var line = {prev: null, fn: fn, s: srcLines[0], obs: 0, lastSym: ''}
  var prevt = {
    t: 0,
    s: '',
    fn: fn,
    ln: 1,
    col: 1,
    pos: 0,
    len: 0,
    line: line,
    prev: null,
    next: null
  }

  function shift() {
    //var ch0 = ch
    col++
    i++
    //if (i < n) {
      /*ch  = s[i]
      ch2 = s[i+1]
      ch3 = s[i+2]*/
      ch = ch2
      ch2 = ch3
      ch3 = s[i+2]
    /*} else {
      ch = eof
      ch2 = eof
      ch3 = eof
    }*/
    if (/*ch=='\r' ||*/ ch=='\n') {
      ln++, col = 1
      sol = tt.sol // start of line
      // create new line descriptor
      line = {prev: line, fn: fn, s: srcLines[ln-1], obs: 0, lastSym: ''}
    }
    //return ch0
  }

  shift() // load ch,ch2,ch3
  ch  = s[0]
  ch2 = s[1]
  ch3 = s[2]
  sol = tt.sol
  while (ch!=eof && i < n) {
    let t = {
      __proto__: Throwing,
      t: sol,
      s: '',
      ss: null,
      fn: fn,
      ln: ln,
      col: col,
      pos: i,
      len: 0,
      line: line,
      prev: prevt,
      next: null
    }
    Object.seal(t)
    //t.miss = 2

    let i0 = i

    if ( // id
      ch>='a'&&ch<='z' || ch>='A'&&ch<='Z' || ch=='$' || ch=='_'
    ) {
      sol = 0
      t.t |= tt.id
      while (
        ch>='a'&&ch<='z' || ch>='A'&&ch<='Z' ||
        ch=='$' || ch=='_' || ch>='0'&&ch<='9')
      {
        shift()
      }
      t.s = s.slice(i0,i)
      t.line.lastSym = ''
    } else if (ch>='0'&&ch<='9') {
      sol = 0
      t.t |= tt.num
      while (ch>='0'&&ch<='9' || ch=='.') shift()
      t.s = s.slice(i0,i)
      t.line.lastSym = ''
    } else if (ch<=' ') { // ws
      let wst = tt.sp
      while (ch<=' ') {
        if (ch=='\r' || ch=='\n') {
          wst = tt.nl
        }
        shift()
        //break
      }
      //t.s = is_nl(t) ? '\n' : ' '
      t.t |= wst
    } else if (ch=='`') { // template string
      sol = 0
      t.t |= tt.raw
      shift()
      while (ch && ch!='`') shift()
      t.s += s.slice(i0+1,i)
      shift()
      t.line.lastSym = ''
    } else if (ch=="'") {
      sol = 0
      t.t |= tt.sqstr
      shift()
      while (ch!=eof && ch!="'") shift()
      t.ss = s.slice(i0+1,i)
      shift()
      t.s = s.slice(i0,i)
      t.line.lastSym = ''
    } else if (ch=='"') {
      sol = 0
      t.t |= tt.dqstr
      while (ch!=eof && ch!='"') shift()
      t.ss = s.slice(i0+1,i)
      shift()
      t.s = s.slice(i0,i)
      t.line.lastSym = ''
    } else if (ch=='/' && ch2=='/') { // line cmnt
      while (ch!=eof && ch!='\r' && ch!='\n') shift()
      continue
    } else if (ch=='/' && ch2=='*') { // block cmnt
      //sol = 0
      /*if (ch3=='*') {
        t.t |= tt.cmnt
        shift() // /
        shift() // *
        shift() // *
        while (ch!=eof && (ch!='*' || ch2!='*' || ch3!='/')) {
          shift()
        }
        t.s = s.slice(i0+3,i)
        shift() // *
        shift() // *
        shift() // /
      } else {*/
        let wst = tt.sp
        shift(), shift() // / *
        while (ch!=eof && (ch!='*' || ch2!='/')) {
          if (ch=='\n' || ch=='\r') wst = tt.nl
          shift()
        }
        shift(), shift() // * /
        //while (ch<=' ') shift() // collapse ws between cmnts
        t.t |= wst
      //}
    /*} else if (ch=='<' && ch2=='!' && ch3=='-') {
      sol = 0
      t.t |= tt.cmnt
      shift(), shift(), shift(), shift() // <!--
      while (ch!=eof && (ch!='-' || ch2!='-' || ch3!='>')) {
        shift()
      }
      t.s = s.slice(i0+4,i)
      shift(), shift(), shift() // -->*/
    } else {
      sol = 0
      t.t |= tt.sym
      t.s = ch
      /*if (ch=='{') {
        var upline = t.line
        while (upline = upline.prev) {
          if (upline.lastSym==',') {
            upline.obs++
          } else {
            break
          }
        }
        t.line.obs++
      }*/
      //if (ch=='}') line.hasCB = true
      t.line.lastSym = ch
      shift()
    }

    //if (t.t & !tt.flags) {
      /*if (is_ws(t)) { // try to collapse ws
        if (is_nl(t)) {
          if (is_sp(prevt)) {
            prevt.t = tt.nl
            prevt.s = '\n'
            continue
          } else if (is_nl(prevt)) {
            continue
          }
        } else if (is_sp(t)) {
          if (is_ws(prevt)) {
            continue
          }
        }
        t.s = is_nl(t) ? '\n' : ' '
      }*/
      t.len = i-t.pos
      prevt.next = t
      toks.push(t)
      prevt = t
    //}
  }

  return toks
}

function dumpTokens(toks) {
  var n = toks.length
  log(n+' tokens')
  for (var i = 0; i < n; i++) {
    var tok = toks[i]
    log(
      tok.fn+':'+tok.ln+'.'+tok.col+' pos '+tok.pos+' len '+tok.len+' '+
      ttToString(tok.t)+' '+
      (tok.s=='\r'?'\\r':tok.s=='\n'?'\\n':tok.s)+' '+
      (tok.t&tt.sol?'SOL':'')
    )
  }
}

//let log_code = read_and_curlify(__dirname+'/log.js').split('\n').join(';')

//console.log(log_code)

// nodejs signature for wrapper:
//   fun exports, require, module, __filename, __dirname
// now we dont use it at all
function wrap_module(name, code, exports, opts) {
  if (!opts.sloppy) {
    code = "'use strict';" + code
  }
  code += ';' +
    exports.map(
      (name) => ('global.'+name+'='+name)
    ).join(';') +
    ';function __eval_here(code) { return eval(code) }' +
    ";global['__eval_"+name+"'] = __eval_here;"
    //+log_code;
  return '!function(){' + code + '}()'
}

function wrap_use_module(mod_name, code, exports, opts) {
  if (!opts.sloppy) {
    code = "'use strict';" + code
  }
  code += ';' +
    /*exports.map(
      (name) => ('$__modules["'+mod_name+'"].exports.'+name+'='+name)
    ).join(';') +*/
    ';function __eval_here(code) { return eval(code) }' +
    ";$__modules['"+mod_name+"'].eval = __eval_here;" +
    //+log_code;
    ";function use(name){superglobal.use(name,global)}"
  //log(code)
  return code
  //return '!function(){' + code + '}()'
}

function add_tok_patch(patches, tok, str) { patches.push({tok, str}) }

// collect and patch imports
// only simple, non-aliasing imports are supported:
//   - import {name} from './filename.js'
//   - import {name1, name2} from 'dir/other-filename.js'
// these imports are converted to refs to globals:
//   - const   {name}  =    global
//   - const   {name1, name2}  =    global
function patch_imports_v0(toks, patches) {
  for (let tok of toks) {
    if (is_id(tok) && tok.s=='import' && is_sp(tok.next)) {
      if (tok.next.next.s == '{') {
        let nameTok = tok.next.next.next
        patch_tok(tok,'const')
        while (nameTok.next.s==',') {
          nameTok = nameTok.next.next
        }
        add_tok_patch(patches, nameTok.next.next.next, '=') // `from` -> `=`
        add_tok_patch(patches, nameTok.next.next.next.next.next, 'global') // fn -> global
      }
    }
  }
}

/*function patch_imports(toks, patches) {
  let names = []
  for (let tok of toks) {
    if (is_id(tok) && tok.s=='import' && is_sp(tok.next)) {
      let name_tok = tok.next.next
      names.push( name_tok.s )
      //log('imported mod', name_tok.s)
      //patch_tok(tok,'//import')
      add_tok_patch(patches, tok, '//import')
    }
  }
  ret names
}*/

// collect and patch exports
// returns list of exported symbols
function patch_exports(toks, patches) {
  let exports = []
  for (let tok of toks) {
    if (is_id(tok) && tok.s=='export' && is_sp(tok.next)) {
      let kw = tok.next.next.s
      if (kw=='var' || kw=='let' || kw=='function' || kw=='fun') {
        let name = tok.next.next.next.next.s
        exports.push( name )
        add_tok_patch(patches, tok, '')
        add_tok_patch(patches, tok.next, '')
      }
    }
  }
  return exports
}


function patch_use_exports(toks, patches) {
  let exports = []
  for (let tok of toks) {
    if (is_id(tok) && tok.s=='export' && is_sp(tok.next)) {
      let kw = tok.next.next.s
      if (kw=='var' || kw=='let' || kw=='function' || kw=='fun') {
        let name = tok.next.next.next.next.s
        exports.push( name )
        if (kw=='var' || kw=='let') {
          add_tok_patch(patches, tok, 'global.'+name) // replace `export `
          add_tok_patch(patches, tok.next, '') // replace sp
          add_tok_patch(patches, tok.next.next, '') // replace kw
          add_tok_patch(patches, tok.next.next.next, '') // replace sp
          add_tok_patch(patches, tok.next.next.next.next, '') // replace name
        } else { // fun
          add_tok_patch(patches, tok, 'global.'+name+'=function') // replace `export `
          add_tok_patch(patches, tok.next, '') // replace sp
          add_tok_patch(patches, tok.next.next, '') // replace kw
          add_tok_patch(patches, tok.next.next.next, '') // replace sp
          add_tok_patch(patches, tok.next.next.next.next, '') // replace name
        }
      }
    }
  }
  return exports
}

// replace `fun` with `function` %]
function patch_fun(toks, patches) {
  for (let tok of toks) {
    if ( // check if it looks like a keyword....
      is_id(tok) && tok.s=='fun' &&
      (is_ws(tok.prev) || tok.prev.s=='(' || tok.prev.s=='!' ||
      tok.prev.s == ';') &&
      tok.prev.s != '.' && tok.prev.s != '[' &&
      (is_ws(tok.next) || tok.next.s=='(')
    ) {
      add_tok_patch(patches, tok, 'function')
    }
  }
}

// add brackets around conditions (if,while,for)
// also add `let` keyword after for if none is present
function patch_ifs(toks, patches) {
  for (let tok of toks) {
    if (
      (tok.s=='if' || tok.s=='while' || tok.s=='for') &&
      (tok.next.next.s!='(')
    ) {
      let kw = tok.s
      let tok2 = tok.next
      let bs = 0, cbs = 0
      while (tok2 && tok2.s!='{' && tok.ln==tok2.ln) {
        let ch = tok2.s
        if (ch=='(') bs++
        if (ch==')') bs--
        if (ch=='{') cbs++
        if (ch=='}') cbs--
        //log('tok2?',tok2.s)
        tok2 = tok2.next
      }
      if (tok2 && bs==0 && cbs==0 && tok2.s=='{') {
        //log('patch tok2',tok2.s)
        let tok3 = tok2.next
        let patch = true
        while (tok3 && !is_nl(tok3) && tok3.s!=';') {
          if (!is_ws(tok3)) {
            patch = false
            break
          }
          tok3 = tok3.next
        }
        if (patch) {
          if (kw=='for' && tok.next.next.s!='let') {
            add_tok_patch(patches, tok, 'for (let ')
          } else {
            add_tok_patch(patches, tok, kw+'(')
          }
          add_tok_patch(patches, tok2, '){')
        }
      }
    } else if (tok.s=='elif' && tok.prev.s!='.' ) {
      add_tok_patch(patches, tok, 'else if')
    }
  }
}

// make sealed object literals throwing on missing property
function patch_seals(toks, patches) {
  for (let tok of toks) {
    if ( // `seal({`
      is_id(tok) && tok.s=='seal' &&
      tok.next.s=='(' &&
      tok.next.next.s=='{'
    ) {
      add_tok_patch(patches, tok.next.next, '{__proto__:Throwing,')
    }
  }
}

global.total_patches = 0

function apply_tok_patches(code, patches) {
  patches.sort( (a,b)=>(a.tok.pos<b.tok.pos?-1:(a.tok.pos>b.tok.pos?1:0)) )

  let n = patches.length
  global.total_patches += n
  let patched = ''
  let prev = 0
  for (let i = 0; i < n; i++) {
    let patch = patches[i]
    let pos = patch.tok.pos
    let len = patch.tok.len
    let str = patch.str
    patched += code.substr(prev, pos-prev) + str
    prev = pos+len
  }
  patched += code.substr(prev)
  /*for (let i = n-1; i >= 0; i--) {
    let patch = patches[i]
    let pos = patch.tok.pos
    let len = patch.tok.len
    let str = patch.str
    code =
      code.substr(0,pos) +
      str +
      code.substr(pos+len)
  }*/
  return patched
}

function rewrite(moduleName, code, opts) {
  //code = code.trim()
  let toks = tokenize(moduleName, code)
  //log(code)
  //dumpTokens(toks)
  let patches = []
  patch_fun(toks, patches)
  patch_ifs(toks, patches)
  patch_imports(toks, patches)
  let exports = patch_exports(toks, patches)
  patch_seals(toks, patches)
  code = apply_tok_patches(code, patches)
  return wrap_module(moduleName, code, exports, opts)
}

function read_and_rewrite(fn, moduleName, opts) {
  log('read_and_curlify '+fn)
  let code = read_and_curlify(fn)
  let toks = tokenize(moduleName, code)
  opts = opts ? opts : {}
  //log(code)
  //dumpTokens(toks)
  let patches = []
  //patch_fun(toks, patches)
  //patch_ifs(toks, patches)
  //patch_imports(toks, patches)
  let exports = patch_exports(toks, patches)
  patch_seals(toks, patches)
  code = apply_tok_patches(code, patches)
  return wrap_module(moduleName, code, exports, opts)
}


/*
function prepare_module(fn, mod_name, opts) {
  //log('prepare_module '+fn)
  let code = read_and_curlify(fn)
  let toks = tokenize(mod_name, code)
  opts = opts ? opts : {}
  //log(code)
  //dumpTokens(toks)
  let patches = []
  //patch_fun(toks, patches)
  //patch_ifs(toks, patches)
  //patch_imports(toks, patches)
  //let imports = patch_imports(toks, patches)
  let exports = patch_use_exports(toks, patches)
  patch_seals(toks, patches)
  code = apply_tok_patches(code, patches)
  code = wrap_use_module(mod_name, code, exports, opts)
  let mod = $__modules[mod_name]
  let sandbox = {
    __mod: mod,
    __modname: mod_name,
    $__modules,
    process, console, require, __dirname,
  }
  sandbox.global = sandbox
  sandbox.superglobal = global
  mod.name = mod_name
  mod.exports = {}
  mod.export_names = exports
  mod.context = sandbox
  return { code, sandbox, exports }
}
*/

function prepare_module(fn, mod_name, opts) {
  //log('prepare_module '+fn)
  let code = read_and_curlify(fn)
  let toks = tokenize(mod_name, code)
  opts = opts ? opts : {}
  //log(code)
  //dumpTokens(toks)
  let patches = []
  //patch_fun(toks, patches)
  //patch_ifs(toks, patches)
  //patch_imports(toks, patches)
  //let imports = patch_imports(toks, patches)
  let exports = patch_use_exports(toks, patches)
  patch_seals(toks, patches)
  code = apply_tok_patches(code, patches)
  code = wrap_use_module(mod_name, code, exports, opts)
  let mod = $__modules[mod_name]
  let sandbox = {
    __mod: mod,
    __modname: mod_name,
    $__modules,
    process, console, require, __dirname,
  }
  sandbox.global = sandbox
  sandbox.superglobal = global
  mod.name = mod_name
  mod.exports = {}
  mod.export_names = exports
  mod.context = sandbox
  return { code, sandbox, exports }
}

function findScript(fn) {
  log('v8debug: get scripts')
  let ss = Debug.scripts()
  log('v8debug: filter scripts')
  ss = ss.filter(
    (s) => (
      typeof s.name == 'string' &&
      s.name.indexOf(fn)>=0 &&
      s.name.indexOf('(old') < 0
    )
  )
  //log(ss)
  return ss[0]
}

function update_source(script, code) {
  try {
    log('v8debug: set script source')
    let cl = []
    Debug.LiveEdit.SetScriptSource(script, code, false, cl)
    //log(cl)
  } catch(e) {
    console.error('update script')
    console.error(e)
  }
}

function update(name) {
  log('v8debug: update script '+name)
  let fn = name_to_fn(name)
  log('v8debug: fn '+fn)
  //let fn = __dirname+"/"+name+".js"
  log('v8debug: find script for '+fn)
  let script = findScript(fn)
  //log(script)
  /*log('v8debug: read file '+fn)
  let code = fs.readFileSync(fn, 'utf8')
  log('v8debug: rewrite')
  code = rewrite(name, code, true)8?*/

  time('rewrite c')
  //log('original');log(code.trim())
  let code = read_and_rewrite(fn, name, {})
  timeEnd('rewrite c')

  ///////

  update_source(script, code)

  log('v8debug: done')
}

function name_to_fn(name) {
  let fn = ''
  if (name.startsWith('/'))
    fn = name
  else
    fn = __dirname+"/"+name
  if (!fn.endsWith('.js')) fn += '.js'
  return fn
}


let include = global.include = module.exports = function(names, opts) {
  //let reload = arguments.length > 1 ? arguments[1] : false
  //let reload = args.length > 0 ? args[0] : false
  //let reload = args.length > 0 ? args[0] : false
  //let reload = reload ? true : false

  if (typeof opts == 'undefined') opts = {}

  //log(opts)

  names = names.split(' ')
  for (let i = 0; i < names.length; i++) {
    let name = names[i]
    if (!(name in cache) || opts.reload) {
      log(name+' ' + (opts.sloppy?'(sloppy)':''));

      global.require = require
      //global.exports = module.exports
      global.exports = global
      global.__dirname = __dirname

      /*let includeInThisContext = function(fn) {
        let code = fs.readFileSync(fn, 'utf8')
        //log('original');log(code.trim())
        code = rewrite(name, code, reload)
        log('rewrited');log(code.trim())
        vm.runInThisContext(code, fn)
      }.bind(this)
      let fn = __dirname+"/"+name+".js"
      includeInThisContext(fn)*/

      //(exports, require, module, __filename, __dirname) {' + code + ';};

      let fn = name_to_fn(name)
      /*var sandbox = {
        require,
        __dirname: path.dirname(fn),
        __filename: fn,
        log: log,
        setInterval: setInterval
      }
      var context = new vm.createContext(sandbox)*/

      /*console.time('rewrite js')
      let code = fs.readFileSync(fn, 'utf8')
      //log('original');log(code.trim())
      code = rewrite(name, code, opts)
      console.timeEnd('rewrite js')*/

      time('rewrite c')
      //log('original');log(code.trim())
      let code = read_and_rewrite(fn, name, opts)
      timeEnd('rewrite c')

      try {
        //log('rewrited');log(code.trim())
        var script = new vm.Script(code, {filename: fn, displayErrors: true})

        //global[`__script_${name}`] = script
        // simple (introduces top level variables to global scope
        //!function(){
        script.runInThisContext()
        //}.bind(global)()
        //vm.runInThisContext(code, fn)
      } catch (e) {
        console.error('compilation')
        console.error(e)
        return;
      }

      if (opts.reload) {
        //monkeyPatch(name, code)
        update(name)
      } else if (hot) {
        chokidar.watch(fn).on('change', function(path) {
          log('script changed')
          let opts = cache[name]
          cache.delete(name)
          opts.reload = true
          include(name, opts)
        })
      }
      cache[name] = opts
      /*__eval: global[__eval_+name]
      }*/
    } else {
      log(name+' (cached)');
    }
  }
}

let superglobal = global
global.$__modules = {}

function mod_by_ctx(ctx) {
  for (let mod_name in $__modules) {
    let mod = $__modules[mod_name]
    if (mod.context == ctx)
      return mod
  }
  return null
}

global.use = function(names, ctx, opts) {

  function update(name) {
    log('use: update script '+name)
    let fn = name_to_fn(name)
    log('use: fn '+fn)
    //let fn = __dirname+"/"+name+".js"
    log('use: find script for '+fn)
    let script = findScript(fn)
    //log(script)
    /*log('v8debug: read file '+fn)
    let code = fs.readFileSync(fn, 'utf8')
    log('v8debug: rewrite')
    code = rewrite(name, code, true)8?*/

    time('rewrite (use)')
    //log('original');log(code.trim())
    let {code} = prepare_module(fn, name, {})
    timeEnd('rewrite (use)')

    ///////

    update_source(script, code)

    log('use: done')
  }

  //log('use '+name+' ctx ',ctx)

  let parent_mod_name = ''
  if (ctx && ('__modname' in ctx)) {
    //log('parent mod name', ctx.__modname)
    parent_mod_name = ctx.__modname
  } else {
    //log('parent mod name (global)')
  }

  if (typeof opts == 'undefined') opts = {}

  names = names.split(' ')
  for (let i = 0; i < names.length; i++) {
    let name = names[i]

    if (name == parent_mod_name)
      throw err('module '+name+' uses itself')

    if (!(name in cache) || opts.reload) {
      log(name+' ' + (opts.sloppy?'(sloppy)':''));

      cache[name] = opts

      $__modules[name] = {
        exports: {},
        export_names: [],
        parent_contexts: []
      }

      let fn = name_to_fn(name)
      /*var sandbox = {
        require,
        __dirname: path.dirname(fn),
        __filename: fn,
        log: log,
        setInterval: setInterval
      }
      var context = new vm.createContext(sandbox)*/

      time('rewrite')
      //log('original');log(code.trim())
      let {code, sandbox} = prepare_module(fn, name, opts)
      timeEnd('rewrite')

      try {
        /*var script = new vm.Script(code, {filename: fn, displayErrors: true})
        script.runInThisContext()*/

        /*let sandbox  = {
          console, require,
        }
        sandbox.global = sandbox        */

        let script = new vm.Script(code, {filename: fn, displayErrors: true})
        let ctx = new vm.createContext(sandbox)
        script.runInContext(ctx)

        //log($__modules)

      } catch (e) {
        console.error('compilation error')
        console.error(e)
        return;
      }

      if (opts.reload) {
        //monkeyPatch(name, code)
        update(name)
      } else if (hot) {
        chokidar.watch(fn).on('change', function(path) {
          log('script changed')
          let opts = cache[name]
          cache.delete(name)
          opts.reload = true
          use(name, null, opts)
        })
      }

      /*__eval: global[__eval_+name]
      }*/
    } else {
      log(name+' (cached)');
    }

    // bind variables
    if (!opts.reload) {
      if (typeof ctx == 'undefined') ctx = global
      let parent_ctxs = $__modules[name].parent_contexts
      if (parent_ctxs.indexOf(ctx) < 0)
        parent_ctxs.push( ctx )
      let mod_exports = $__modules[name].export_names
      let i = 0;
      for (let parent_ctx of parent_ctxs) {
        let parent_mod_name = parent_ctx.__modname
        if (!parent_mod_name) parent_mod_name = '(global)'
        for (let exp_name of mod_exports) {
          /*let parent_mod = mod_by_ctx(parent_ctx)
          if (parent_mod) parent_mod_name = parent_mod.name;
          else parent_mod_name = '(global)'*/
          //if (exp_name == 'buffer')
          //log("bind " + name + '.' + exp_name + ' to ' + (parent_mod_name?parent_mod_name:'(global)'))
          //log("bind " + name + '.' + exp_name + ' to ctx ' + i)
          //parent_ctx[exp_name] = mod_exports[exp_name]

          //if (!(exp_name in parent_ctx)) {
          //if (!Object.hasOwnProperty(parent_ctx, exp_name)) {
          //if (  Object.keys(parent_ctx).indexOf(exp_name)<0  ) {
            log(colors.green("bind ") + name + '.' + exp_name + ' to ' + parent_mod_name)
            //log(colors.green("bind ") + name + '.' + exp_name + ' to ' + parent_mod_name+' val '+$__modules[name].context[exp_name])

            Object.defineProperty(parent_ctx, exp_name, {
              enumerable: true,
              configurable: true,
              /*configurable: false,
              configurable: ' assert fs '.indexOf(' '+exp_name+' ')>=0,*/
              get: function() {
                console.log(colors.blue('read ')+name+'.'+exp_name+' from '+parent_mod_name)
                //let val =  $__modules[name].context[exp_name];
                let val = superglobal.$__modules[name].eval(exp_name);
                console.log(colors.gray(''+val))
                return val
              },
              set: function(val) {
                console.log(colors.red('write ')+name+'.'+exp_name+colors.gray('='+val)+' from '+parent_mod_name)
                //$__modules[name].context[exp_name] = val
                superglobal.$__modules[name].context.__to_set = val
                superglobal.$__modules[name].eval(exp_name+'=__to_set')
              },
            })

            /*parent_ctx.__defineGetter__(exp_name, function() {
              console.log(colors.blue('read ')+name+'.'+exp_name)
              let val =  $__modules[name].eval(exp_name);
              console.log(''+val)
              return val
            })
            parent_ctx.__defineSetter__(exp_name, function(val) {
              console.log(colors.red('write ')+name+'.'+exp_name+'='+val)
              $__modules[name].context.__to_set = val
              $__modules[name].eval(exp_name+'=__to_set')
            })*/

          //}

          /*parent_ctx.__defineGetter__(exp_name, function() {
            console.log(colors.blue('read ')+name+'.'+exp_name)
            //return mod_exports[exp_name]
            return $__modules[name].exports[exp_name]
          })
          parent_ctx.__defineSetter__(exp_name, function(val) {
            console.log(colors.red('write ')+name+'.'+exp_name+'='+val)
            //mod_exports[exp_name] = val;
            $__modules[name].exports[exp_name] = val
          })*/

          /*parent_ctx.__defineGetter__(exp_name, function() {
            console.log(colors.blue('read ')+name+'.'+exp_name)
            //return mod_exports[exp_name]
            return $__modules[name].exports[exp_name]
          })
          parent_ctx.__defineSetter__(exp_name, function(val) {
            console.log(colors.red('write ')+name+'.'+exp_name+'='+val)
            //mod_exports[exp_name] = val;
            $__modules[name].exports[exp_name] = val
          })*/

        }
        i++
      }
    }

  } // for each name
}




//load('./m1.js')

/*let modules = {}

global.registerObject = function(modName, name, obj) {
  if (modName in modules) {
    let mod = modules[modName]
    let objs = mod.objects
    if (name in objs) {
      log('patch old objects')
      let keys = Object.keys(obj)
      for (let oldObj of objs[name]) {
        let oldKeys = Object.keys(oldObj)
        for (let key of oldKeys) {
          if (key in keys) {
            oldObj[key] = obj[key]
          }
        }
        for (let key of keys) {
          if (!(key in oldKeys)) {
            oldObj[key] = obj[key]
          }
        }
      }
      mod.objects[name].push( obj )
    } else {
      log('object registered in existing module')
      mod.objects[name] = [obj]
    }
  } else {
    log('module registered with one object')
    let objects = {}
    objects[name] = [obj]
    modules[modName] = {
      objects
    }
  }
}*/

/*
//let mn = 'm0'
let mn = 'css'
let fn = mn+'.js'
let code0 = fs.readFileSync(fn,'utf8')
let code = code0
console.time('REWRITE')
code = rewrite(mn, code, false)
fs.writeFileSync('/tmp/1', code0)
fs.writeFileSync('/tmp/2', code)
//log(code)
console.timeEnd('REWRITE')
//*/

/*
let throwing_READ = new Proxy({}, {
  get: function(obj, prop) {
    throw new ReferenceError('unknown property read: '+prop);
  }
})

function K(obj) {
  //return Object.assign(obj, {__proto__: throwing})
  //return obj
  //ject.assign(this, obj)
  //this.f = obj.f
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      this[prop] = obj[prop]
    }
  }
  Object.seal(this)
  return this
}


*/

//todo: chokidar takes ~60 ms to start - consider sending message from editor

