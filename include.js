"use strict" // please

//let hot = true
let hot = false

let Module = require('module')
let path = require('path')
let fs = require('fs')
let vm = require('vm')

let chokidar
if (hot) chokidar = require('chokidar') // for hot reloading

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
function rewrite_simple(code, reload) {
  code = code.replace(/^function\s+([a-zA-Z0-9_\-$]+)/gm, 'let $1 = function')
  if (reload) {
    code = code.replace(/^let\s/gm, '')
  }
}

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
  isSp = t => t.t & 1,
  isNl = t => t.t & 2,
  isWs = t => t.t & 3,
  isCmnt = t => t.t & 4,
  isInt = t => t.t & 8,
  //isFloat = t => t.t & 16,
  isNum = t => t.t & 24,
  isId = t => t.t & 32,
  //isSig = t => t.t & 64,
  //isSQStr = t => t.t & 128,
  //isDQStr = t => t.t & 128,
  isQStr = t => t.t & 384,
  isSym = t => t.t & 512,
  isRaw = t => t.t & 1024,
  isSOL = t => t.t & 16384,
  isEnd = t => t==null

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
      //t.s = isNl(t) ? '\n' : ' '
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
      /*if (isWs(t)) { // try to collapse ws
        if (isNl(t)) {
          if (isSp(prevt)) {
            prevt.t = tt.nl
            prevt.s = '\n'
            continue
          } else if (isNl(prevt)) {
            continue
          }
        } else if (isSp(t)) {
          if (isWs(prevt)) {
            continue
          }
        }
        t.s = isNl(t) ? '\n' : ' '
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

function wrapModule(name, code) {
  return '!function(exports_, require_, module_, __filename_, __dirname_){' + code + '}()'
}

function rewrite(moduleName, code, reload) {
  //code = code.trim()
  let toks = tokenize(moduleName, code)
  //let toks = []
  //log(code)
  //dumpTokens(toks)

  let patches = []
  function patch_tok(tok, str) { patches.push(O({tok, str})) }
  function apply_tok_patches() {
    //patches.sort( (a,b)=>(a.pos<b.pos?-1:(a.pos>b.pos?1:0)) )
    patches.sort( (a,b)=>(a.tok.pos<b.tok.pos?-1:(a.tok.pos>b.tok.pos?1:0)) )
    /*let n = patches.length
    for (let i = n-1; i >= 0; i--) {
      let patch = patches[i]*/
    patches.reverse()
    for (let patch of patches) {
      let pos = patch.tok.pos
      let len = patch.tok.len
      let str = patch.str
      //log(pos,len)
      code =
        code.substr(0,pos) +
        str +
        code.substr(pos+len)
    }
  }

  // collect and patch imports
  // only simple, non-aliasing imports are supported:
  //   - import {name} from './filename.js'
  //   - import {name1, name2} from 'dir/other-filename.js'
  // these imports are converted to refs to globals:
  //   - const   {name}  =    global
  //   - const   {name1, name2}  =    global
  for (let tok of toks) {
    if (isId(tok) && tok.s=='import' && isSp(tok.next)) {
      if (tok.next.next.s == '{') {
        let nameTok = tok.next.next.next
        patch_tok(tok,'const')
        while (nameTok.next.s==',') {
          nameTok = nameTok.next.next
        }
        patch_tok(nameTok.next.next.next, '=') // `from` -> `=`
        patch_tok(nameTok.next.next.next.next.next, 'global') // fn -> global
      }
    }
  }

  // collect and patch exports

  let exports = []

  for (let tok of toks) {
    if (isId(tok) && tok.s=='export' && isSp(tok.next)) {
      let kw = tok.next.next.s
      if (kw == 'var' || kw == 'let' || kw == 'function') {
        let name = tok.next.next.next.next.s
        exports.push( name )
        patch_tok(tok, '')
        patch_tok(tok.next, '')
      }
    }
  }

  //log(exports)

  apply_tok_patches()

  code = "'use strict';" + code
  /*if (reload) {
    code += ";global['__eval_"+moduleName+"_new'] = function(code) { return eval(code) }"
  } else {
    code += ";global['__eval_"+moduleName+"'] = function(code) { return eval(code) }"
  }*/
  code += ';' + exports.map( (name) => ('global.'+name+'='+name) ).join(';')
  if (reload) {
  code += ";function __eval_here(code) { 'reloaded'; return eval(code) }"
  } else {
  code += ";function __eval_here(code) { return eval(code) }"
  }
  code += ";global['__eval_"+moduleName+"'] = __eval_here"
  return wrapModule(moduleName, code)
}

/*function rewrite_strict2(moduleName, code, reload) {
  return code = "'use strict';" + code
}*/

//let rewrite = rewrite_closure
//let rewrite = rewrite_strict

/*function monkeyPatch(moduleName) {
}*/

let include = global.include = module.exports = function(names, reload) {
  //let reload = arguments.length > 1 ? arguments[1] : false
  //let reload = args.length > 0 ? args[0] : false
  //let reload = args.length > 0 ? args[0] : false
  //let reload = reload ? true : false
  names = names.split(' ')
  for (let i = 0; i < names.length; i++) {
    let name = names[i]
    if (!(name in cache) || reload) {
      log(name);

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

      let fn = __dirname+"/"+name+".js"
      /*var sandbox = {
        require,
        __dirname: path.dirname(fn),
        __filename: fn,
        log: log,
        setInterval: setInterval
      }
      var context = new vm.createContext(sandbox)*/
      let code = fs.readFileSync(fn, 'utf8')
      //log('original');log(code.trim())
      code = rewrite(name, code, reload)
      //log('rewrited');log(code.trim())
      var script = new vm.Script(code, {filename: fn})
      //global[`__script_${name}`] = script
      // simple (introduces top level variables to global scope
      //!function(){
        script.runInThisContext()
      //}.bind(global)()
      //vm.runInThisContext(code, fn)

      if (reload) {
        //monkeyPatch(name, code)
      } else if (hot) {
        chokidar.watch(fn).on('change', function(path) {
          console.log('change')
          cache.delete(name)
          include(name, true)
        })
      }
      cache[name] = true
      /*__eval: global[__eval_+name]
      }*/
    } else {
      log(name+' (cached)');
    }
  }
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
