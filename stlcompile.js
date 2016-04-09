/* compile ast to js code */

include('stlstringify')
include('outstream')

fun scale_transform(node, vars) {
  if ('font-size' in node.decls) {

    let fs_str = node.decls['font-size'].value
    if (fs_str.endsWith('px')) {
      let fs = parseInt(fs_str)
      log(fs)
      fs = fs * vars.scale;
      //if (fs < 14) fs = 14

      fs_str = fs.toFixed(3)+'px'
      log(fs_str)
      node.decls['font-size'].value = fs_str
    }
  }
}

fun walk_styles(node, transform, vars) {
  transform(node, vars)
  for (let child of node.childs) {
    walk_styles(child, transform, vars)
  }
}

export function compileStyle(ast) {
  return function(vars) {
    log('stringify stl ---------------------')
    var out = new OutStream()
    //ast.dump()
    if ('scale' in vars) {
      walk_styles(ast, scale_transform, vars)
    }
    stringifyStyle(ast, out, vars, -1)
    return out.getText()
  }
}
