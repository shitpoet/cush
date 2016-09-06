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

fun process_image_urls(decl, vars) {
  let ss = decl.value.split(' ')
  //log(ss.join(' '))
  let zz = []
  for (let s of ss) {
    if (s.startsWith('url(')) {

      if vars.wp_mode
        l('wp mode img url rewrite')
        if s.startsWith('url(../img/')
          s = 'url(/' + s.substring('url(../'.length)

      if s.startsWith('url(.') || s.startsWith('url(/')
        ;// do nothing //
      elif s.startsWith('url(img/')
        //s = 'url(../' + (s.substring('url('.length))
        s = 'url(/' + s.substring('url('.length)
      else
        //s = 'url(../img/' + (s.substring('url('.length))
        s = 'url(/img/' + s.substring('url('.length)
    }
    zz.push(s)
  }
  decl.value = zz.join(' ')
  //log(zz.join(' '))
}

fun process_links(node, vars) {
  if ('background' in node.decls) {
    process_image_urls(node.decls.background, vars)
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

fun compile_string_array(a)
  ret '[`'+a.join('`,`')+'`]'

/* ssel is described by {
    tag: reference to tag descriptor
    id: string
    classes: array of strings
    pseudos: array of strings (wo ':')
  } */
fun compile_sel(sel)
  let code = '{'
  if sel.tag
    code += 'tag: `'+sel.tag.name+'`, '
  if sel.id
    code += 'id: `'+sel.id+'`, '
  if sel.classes.len > 0
    let str = compile_string_array(sel.classes)
    code += 'classes: '+str+', '
  if sel.pseudos.len > 0
    let str = compile_string_array(sel.pseudos)
    code += 'pseudos: '+str+', '
  code += '}'
  ret code

fun compile_csel(csel)
  let code = []
  for sel of csel
    code.push( compile_sel(sel) )
  ret '['+code.join(',')+']'

fun compile_csels(csels)
  let code = []
  for csel of csels
    code.push( compile_csel(csel) )
  ret '['+code.join(',')+']'
  ret code

fun compile_decl(decl)
  let code = ''
  code += 'name: `'+decl.name+'`, '
  code += 'value: `'+decl.value+'`'
  ret '{'+code+'}'

fun compile_decls(decls)
  let code = []
  for prop_name in decls
    let decl = decls[prop_name]
    code.push( compile_decl(decl)  )
  ret code
/* node has csels, decls, failbacks and childs
  decls - declarations hash:
      [propName] => {
        name: property name string
        value: property value strin
        important: boolean
      }   */
fun compile_rule(ast)
  let code = ''
  if ast.csels.len > 0
    code += '{csels: '
    code += compile_csels(ast.csels)
    code += ","
    code += 'decls: '
    code += compile_decls(ast.decls)
    code += ","
  if ast.childs.len > 0
    let subrules = []
    for child of ast.childs
      subrules.push( compile_rule(child) )
    code += 'childs: '
    code += '['+subrules.join(',')+']'
    code += ","
  code += "},"
  ret code

fun compile_style(ast)
  ret compile_rule(ast)

export function compileStyle(ast) {

  if projectInfo.stl_compiler
    ret compile_style(ast)

  //l(util.inspect( compile_style(ast).toString() ))
  /*log(compile_style(ast, {
    test: 'hi'
  })())*/
  /*return fun()
    return ''  */
  return function(vars) {
    log('stringify stl ---------------------')
    var out = new OutStream()
    //ast.dump()
    if ('scale' in vars) {
      walk_styles(ast, scale_transform, vars)
    }
    walk_styles(ast, process_links, vars)
    walk_styles(ast, clean_fonts, vars)
    if vars.process_stl
      walk_styles(ast, vars.process_stl, vars)
    stringifyStyle(ast, out, vars, -1)
    return out.getText()
  }

}
