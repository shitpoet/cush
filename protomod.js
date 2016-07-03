include('error log')

/* pipeline */

// file to string
fun read(fn)
  log('read',fn)
  let ss
  if fn=='index.tpl'
    ss = [
      'line1',
      'if (x > 0){',
      '  ggg $x',
      '}else{',
      '  lll $x',
      '}',
      '+part',
      'line2'
    ]
  else
    ss = [
      'partline1',
      'partline2',
    ]
  ret ss.join('\n')

fun lex(str)
  log('lex')
  ret str.split('\n')

fun parse(toks)
  log('parse')
  if toks[0]=='line1'
    ret {
      type: 'root',
      childs: [
        { type: 'text', s: 'line1' },
        { type: 'if', s: 'x > 0',
          true_branch: [
            { type: 'text', s: 'ggg ${x}' },
          ],
          false_branch: [
            { type: 'text', s: 'lll ${x}', }
          ],
        },
        { type: 'include', fn: 'part' },
        { type: 'text', s: 'line2' },
      ]
    }
  else
    ret {
      type: 'root',
      childs: [
        { type: 'text', s: 'partline1' },
        { type: 'text', s: 'partline2' },
      ]
    }

fun comp(ast)
  log('comp')
  let code = ["let ast = {type:'root',childs:[]};"]
  for child of ast.childs
    if child.type=='text'
      code.push(
        "ast.childs.push({type:'text',s:'"+child.s+"'});"
      )
    elif child.type=='if'
      code.push("if ("+child.s+") {")
      for ch2 of child.true_branch
        code.push(
          "ast.childs.push({type:'text',s:`"+ch2.s+"`});"
        )
      code.push("} else {")
      for ch2 of child.false_branch
        code.push(
          "ast.childs.push({type:'text',s:`"+ch2.s+"`});"
        )
      code.push("}")
  code.push("return ast;");
  ret new Function('x',code.join('\n'))

fun apply(code, x)
  log('apply')
  ret code(x)

fun stringify(ast)
  log('stringify')
  let strs = []
  for child of ast.childs
    if child.type=='text'
      strs.push('<'+child.s+'>')
    else
      strs.push('???')
  return strs.join('\n')

fun render(fn, x)
  let raw = read(fn)
  let toks = lex(raw)
  let ast = parse(toks)
  let code = comp(ast)
  let dom = apply(code, x)
  let str = stringify(dom)
  //str += stringify(apply(code, x*x))
  ret str

export fun serve()
  /*l('--- x == -1 ---')
  l(render('index.tpl', -1))*/
  l('--- x == 99 ---')
  l(render('index.tpl', 99))
