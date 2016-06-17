/* compile ast to js code */

include('tplstringify')
include('outstream')
include('scope', {sloppy: true})
//let SourceScope = require('./scope')

fun interpolate_string(str, scope) {
  if (str.indexOf('$')>=0) {
    str = str.replace(/\$\((.*)\)/g,
      (match, p1) =>{
        //log('expr',p1)
        //return 'MATCH'
        return scope.evalExpr(p1)
      }
    )
  }
  return str
}

// interpolate variables
fun apply_scope(node, scope) {
  if (node.id.indexOf('$')>=0) {
    //log(node.text)
    node.id = interpolate_string(node.id, scope)
  }
  //todo interpolate classes ?
  for (let attrname in node.attrs) {
    let attrval = node.attrs[attrname]
    if (attrval.indexOf('$')>=0) {
      node.attrs[attrname] = interpolate_string(attrval, scope)
    }
  }
  if (node.text.indexOf('$')>=0) {
    //log(node.text)
    node.text = interpolate_string(node.text, scope)
  }
  /* during applying scope there can be problems
     if inner elements introduce new variables
     now we ignore these elements (only for loops
     can introduce new variables now, so we do not
     go for `loop_branch` but go for `true_branch` (if)) */
  if (node.true_branch) {
    //HACK: workaround (or right way???) to have correct interpolations for if-blocks inside of for-loops
    node.true_branch = clone_node( node.true_branch )
    apply_scope(node.true_branch, scope)
  }
  for (let child of node.childs) {
    apply_scope(child, scope)
  }
}

fun unlogic_ast(node, scope) {
  if (node) {
    if (node.stmnt) {
      let stmnt = node.stmnt
      //log('stmnt',node.stmnt)
      if stmnt=='if' {
        let cond_val = scope.evalExpr(node.condition)
        //log({cond_val})
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
        if var_name.startsWith('let ')
          var_name = var_name.split(' ')[1]
        node.childs = []
        let for_scope = {
          '_number': 1,
          [var_name]: undefined
        }
        scope.push(for_scope)
        //let loopArray = scope.get(array_name)
        let loopArray = scope.evalExpr(array_name)
        for (let var_val of loopArray) {
          let n = clone_node( node.loop_branch )
          for_scope[var_name] = var_val
          apply_scope(n, scope)
          unlogic_ast(n, scope)
          //apply_scope(n, scope)
          node.childs.push(n)
          for_scope['_number']++
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
