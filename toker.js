/*

 toks array consists of objects with props
  - s
  - t - type mask:

    ws
      sp | nl

    comments
      cmnt - block comment / ** ** /
      scmnt - structural comment \\

      `//` and `/ * * /` comments and
      strcutural comment `//` are stripped

    num
      int | float

    id
      lowercase latin letters
      successive numers and `-` or `_`syms
      are added to the t.
      also starings that start with '-' or '_'
      and have successive letters are treated as ids.
      this is useful for css (f.ex. prefixed props)

    sig - sigil - NOT IMPL YET
      $varname
      $(expr)

      only varname or expr string is saved in `s`

    qstr
      sqstr '...'
      dqstr "..."

      content of string is saved in `ss` w/o quotes:
      t.s - with quotes
      t.ss - w/o quotes

    sym - any symbol

    raw `...`

  flags:

    sol - start of line (ws ignored)

  toks array has ending tok==null

 --------------

 test for some token type:

    isWs(t)

*/

include('o')

//var log = console.log.bind(console)
/*var log = function() {
  console.log.apply(console, arguments);
}*/

export let tt = {
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
  isSig = t => t.t & 64,
  //isSQStr = t => t.t & 128,
  //isDQStr = t => t.t & 128,
  isQStr = t => t.t & 384,
  isSym = t => t.t & 512,
  isRaw = t => t.t & 1024,
  isSOL = t => t.t & 16384,
  isEnd = t => t==null

// these types of tokens are not recognized here:
// tt.sig, tt.scmnt
var tokenize = exports.tokenize = function(fn, str) {
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
  var line = {prev: null, fn: fn, s: srcLines[0], obs0: 0, obs: 0, lastSym: ''}
  var prevt = {
    t: 0,
    s: '',
    fn: fn,
    ln: 1,
    col: 1,
    line: line,
    prev: null,
    next: null
  }

  function shift() {
    var ch0 = ch
    col++
    i++
    //if (i < n) {
      ch  = s[i]
      ch2 = s[i+1]
      ch3 = s[i+2]
    /*} else {
      ch = eof
      ch2 = eof
      ch3 = eof
    }*/
    if (ch0=='\r' || ch0=='\n') {
      ln++, col = 1
      sol = tt.sol // start of line
      // create new line descriptor
      line.obs0 = line.obs
      line = {prev: line, fn: fn, s: srcLines[ln-1], obs: 0, lastSym: ''}
    }
    //return ch0
  }

  shift() // load ch,ch2,ch3
  sol = tt.sol
  while (ch!=eof && i < n) {
    var t = ({
      t: sol,
      s: '',
      ss: null,
      fn: fn,
      ln: ln,
      col: col,
      line: line,
      prev: prevt,
      next: null
    })

    var i0 = i

    if ( // id
      ch>='a'&&ch<='z' || ch=='_' || ch=='-' && (
        ch2>='a'&&ch<='z' ||
        (ch2=='-'||ch2=='_') && (
          ch3>='a' && ch3<='z'
        )
      )
    ) {
      sol = 0
      t.t |= tt.id
      while (ch>='a'&&ch<='z'||ch=='-'||ch=='_'||ch>='0'&&ch<='9') {
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
    } else if (ch=='`') { // raw text
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
      shift()
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
      if (ch3=='*') {
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
      } else {
        let wst = tt.sp
        shift(), shift() // / *
        while (ch!=eof && (ch!='*' || ch2!='/')) {
          if (ch=='\n' || ch=='\r') wst = tt.nl
          shift()
        }
        shift(), shift() // * /
        //while (ch<=' ') shift() // collapse ws between cmnts
        t.t |= wst
      }
    } else if (ch=='<' && ch2=='!' && ch3=='-') {
      sol = 0
      t.t |= tt.cmnt
      shift(), shift(), shift(), shift() // <!--
      while (ch!=eof && (ch!='-' || ch2!='-' || ch3!='>')) {
        shift()
      }
      t.s = s.slice(i0+4,i)
      shift(), shift(), shift() // -->
    } else {
      sol = 0
      t.t |= tt.sym
      t.s = ch
      if (ch=='{') {
        var upline = t.line
        while (upline = upline.prev) {
          if (upline.lastSym==',') {
            upline.obs++
          } else {
            break
          }
        }
        t.line.obs++
      }
      //if (ch=='}') line.hasCB = true
      t.line.lastSym = ch
      shift()
    }

    //if (t.t & !tt.flags) {
      if (isWs(t)) { // try to collapse ws
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
      }
      prevt.next = t
      toks.push(t)
      prevt = t
    //}
  }

  return toks
}

export function dump_tokens(toks) {
  var n = toks.length
  log(n+' tokens')
  for (var i = 0; i < n; i++) {
    var tok = toks[i]
    log(
      tok.fn+':'+tok.ln+'.'+tok.col+' '+
      ttToString(tok.t)+' '+
      (tok.s=='\r'?'\\r':tok.s=='\n'?'\\n':tok.s)+' '+
      (tok.t&tt.sol?'SOL':'')
    )
  }
}

/*function splitLines(srcLines, toks) {
  var lines = []
  var line = []
  lines.push(line)
  var lineStr = ''
  for (var t of toks) {
    if (isNl(t) && !lineStr.endsWith(',')) {
      line = []
      lines.push(line)
    } else {
      line.push(t)
      lineStr = srcLines[t.ln-1]
    }
  }
  return lines
}

function dumpTokLines(srcLines, lines) {
  for (var line of lines) {
    if (line.length > 0) {
      var printed = -1
      for (var t of line) {
        if (t.ln > printed) {
          log(srcLines[t.ln-1])
          printed = t.ln
        }
      }
    }
    log('')
  }
}*/

/*function preparseChilds(parent, fn, toks) {
  tok = toks[0]
  if (tok.line.hasOB) {
  }
  // if line contains `{` it is header of subnode
  // if line contains `}` - subnode ends
}*/

//function dumpLineStarts(toks)

function dumpLinesFlags(str, toks) {
  var srcLines = str.split('\n')
  var printed = -1
  for (var t of toks) {
    if (t.ln > printed) {
      var s = srcLines[t.ln-1]
      var m = s.length
      var n = 40
      while (m>n) n += 20
      var tab = ' '+Array(n-m).join('.')+' '
      log(
        s + tab +
        (t.line.obs? t.line.obs.toString()+' obs':'') + ' ' +
        (t.line.lastSym!=''? 'lastSym ' + t.line.lastSym : '')
      )
      printed = t.ln
    }
  }
}

