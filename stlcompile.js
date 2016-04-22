/* compile ast to js code */

include('stlstringify')
include('outstream')

fun clean_fonts(node, vars) {
  let decls = node.decls
  if ('font-weight' in decls) {
    //log(decls['font-weight'])
    if (decls['font-weight'].value == '400') {
      delete decls['font-weight']
    }
  }
}

fun process_image_urls(decl) {
  let ss = decl.value.split(' ')
  //log(ss.join(' '))
  let zz = []
  for (let s of ss) {
    if (s.startsWith('url(')) {
      if (s.startsWith('url(.') || s.startsWith('url(/')) {
        // do nothing //
      } else if (s.startsWith('url(img/')) {
        s = 'url(../' + (s.substring('url('.length))
      } else {
        s = 'url(../img/' + (s.substring('url('.length))
      }
    }
    zz.push(s)
  }
  decl.value = zz.join(' ')
  //log(zz.join(' '))
}

fun process_links(node, vars) {
  if ('background' in node.decls) {
    process_image_urls(node.decls.background)
  }
}

fun scale_transform(node, vars) {
  let ignore_class_prefix = 'icon-'
  for (let csel of node.csels) {
    for (let sel of csel) {
      for (let c of sel.classes) {
        if (c.startsWith(ignore_class_prefix)) {
          //log('ignore '+c)
          return;
        }
      }
    }
  }

  let target_props = {
    'font-size': {},
    'width': {},
    'min-width': {},
    'max-width': {},
    'height': {},
    'min-height': {},
    'max-height': {},
    'padding': {},
    'padding-top': {},
    'padding-right': {},
    'padding-bottom': {},
    'padding-left': {},
    'margin': {},
    'margin-top': {},
    'margin-right': {},
    'margin-bottom': {},
    'margin-left': {},
    'line-height': {},
  }

  let decls = node.decls
  for (let target_prop in target_props) {
    if (target_prop in decls) {
      let str = decls[target_prop].value.trim()
      let strs = str.split(' ')
      let strs_new = []
      for (let str of strs) {
        if (str.endsWith('px')) {
          let px = parseInt(str)
          px = px * vars.scale
          if (px < 1) px = 1
          let str_new = px.toFixed(3)+'px'
          str = str_new
        }
        strs_new.push(str)
      }
      let str_new = strs_new.join(' ')
      //log(target_prop+' '+str+' --> '+str_new)
      node.decls[target_prop].value = str_new
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
    walk_styles(ast, process_links, vars)
    walk_styles(ast, clean_fonts, vars)
    stringifyStyle(ast, out, vars, -1)
    return out.getText()
  }
}
