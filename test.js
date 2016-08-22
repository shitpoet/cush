//console.time('TOTAL')

var fs = require('fs')
var include = require('./include')
include('toktree')
/*include('error')
include('common')
include('toker')
include('tokstream')
include('tplparse')
include('stlparse')
include('tplcompile')
include('stlcompile')

var projectInfo = require(process.cwd()+'/cush.js')
*/

function test_new_parsers() {
  log(parse_tree('index.tpl', fs.readFileSync('index.tpl', 'utf8')))
}

//testTpl()
//testStl()

test_new_parsers()

//*/

//console.timeEnd('TOTAL')
process.exit()
