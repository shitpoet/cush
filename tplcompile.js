/* compile ast to js code */

include('tplstringify')
include('outstream')
include('scope', {sloppy: true})
//let SourceScope = require('./scope')

// interpolate variables
fun apply_scope(node, scope) {
  if (node.text.indexOf('$')>=0) {
    //log(node.text)
    node.text = node.text.replace(/\$\((.*)\)/g,
      (match, p1) =>{
        //log('expr',p1)
        //return 'MATCH'
        return scope.evalExpr(p1)
      }
    )
  }
  for (let child of node.childs) {
    apply_scope(child, scope)
  }
}

fun unlogic_ast(node, scope) {
  if (node) {
    if (node.stmnt) {
      let stmnt = node.stmnt
      log('ntmnt',node.stmnt)
      if stmnt=='if' {
        let cond_val = scope.evalExpr(node.condition)
        log({cond_val})
        let n = cond_val ?
          node.true_branch :
          node.false_branch
        n = clone_node(n, node.parent)
        node.childs = [n]
        for (let child of node.childs) {
          unlogic_ast(child, scope)
        }
      } else if stmnt=='for' {
        let s = node.condition
        let [var_name,array_name] = s.split(' of ')
        node.childs = []
        let for_scope = {
          [var_name]: undefined
        }
        scope.push(for_scope)
        for (let var_val of scope.get(array_name)) {
          let n = clone_node( node.true_branch )
          for_scope[var_name] = var_val
          apply_scope(n, scope)
          unlogic_ast(n, scope)
          node.childs.push(n)
        }
        scope.pop()
      }
    } else {
      for (let child of node.childs) {
        unlogic_ast(child, scope)
      }
    }
  }
}

export fun compileTemplate(ast) {

  return function(vars) {
    log('stringify ---------------------')
    var out = new OutStream()
    //ast.dump()
    let scope = new SourceScope()
    scope.push(vars)
    unlogic_ast(ast, scope)
    stringifyTemplate(ast, out, -1)
    return out.getText()
  }
}
