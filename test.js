console.time('TOTAL')

var fs = require('fs')
var include = require('./include')
include('error')
include('common')
include('toker')
include('tokstream')
include('tplparse')
include('stlparse')
include('tplcompile')
include('stlcompile')

var projectInfo = require(process.cwd()+'/cush.js')

function testTpl() {
  var fn = 'index.tpl'
  var str = fs.readFileSync(fn,'utf8')
  var toks = tokenize(fn, str)
  //dumpTokens(toks)
  //dumpLinesFlags(str, toks)
  var s = new TokStream(toks)
  var tplparser = new TplParser()
  var ast = tplparser.parse(s)
  log({projectInfo})
  var fun = compileTemplate(ast, projectInfo.variables)
  log(fun())
}

function testStl() {
  var fn = 'style.stl'
  var str = fs.readFileSync(fn,'utf8')
  var toks = tokenize(fn, str)
  //dumpTokens(toks)
  //dumpLinesFlags(str, toks)
  var s = new TokStream(toks)
  var stlparser = new StlParser()
  var ast = stlparser.parse(s)
  //log(ast)
  var fun = compileStyle(ast)
  log(fun())
  //*/
}

testTpl()
//testStl()

//*/

console.timeEnd('TOTAL')
log({total_patches})
process.exit()
