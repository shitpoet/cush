"use strict"
/* compile ast to js code */

include('tplstringify')
include('outstream')

function compileTemplate(ast) {
  return function(vars) {
    log('stringify ---------------------')
    var out = new OutStream()
    //ast.dump()
    stringifyTemplate(ast, out, -1)
    return out.getText()
  }
}
