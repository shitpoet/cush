"use strict"
/* compile ast to js code */

include('stlstringify')
include('outstream')

function compileStyle(ast) {
  return function(vars) {
    log('stringify stl ---------------------')
    var out = new OutStream()
    //ast.dump()
    stringifyStyle(ast, out, vars, -1)
    return out.getText()
  }
}
