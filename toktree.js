include('common')

fun calc_indent(s)
  let n = s.length
  let i = 0
  let indent = 0
  while i < n && s[i]==' '
    indent++
    i++
  ret indent

// split lines
// strip empty lines and comments
// calc indents
fun parse_lines(fn, str)
  let lines = []
  let line = {
    fn,
    ln: 1,
    s: ''
  }
  let n = str.length
  let i = -1, ln = 1, c, cc

  fun shift(m)
    m = m || 1
    for j = 0; j < m; j++
      i++
      if i < n
        c = str[i]
      else
        c = '\0'
      if i+1 < n
        cc = str[i+1]
      else
        cc = '\0'

  shift()
  while i < n
    let s = ''

    while c != '\n'
      if c=='/' && cc=='/'
        shift(2)
        while i < n && c!='\n'
          shift()
        break

      elif c=='/' && cc=='*'
        shift(2)
        while i < n && (c!='*' || cc!='/')
          if (c=='\n') ln++
          shift()
        if c=='*' && cc=='/'
          shift(2)
        continue
      s += c
      shift()
    if s.trim() != ''
      lines.push({
        fn, ln, s: s.trim(), indent: calc_indent(s)
      })
    while c == '\n'
      shift()
      ln++

  ret lines

fun dump_lines(lines)
  log(lines)

fun build_str_tree(lines)
  let n = lines.len

  fun new_node(line)
    ret {
      fn: line.fn,
      ln: line.ln,
      s: line.s,
      childs: []
    }

  fun build(parent, i, indent)
    let last_node = null
    while i < n
      let line = lines[i]
      if line.indent == indent
        last_node = new_node(line)
        parent.childs.push(last_node)
        i++
      elif line.indent > indent
        i = build(last_node, i, line.indent)
      else
        ret i
    ret i


  if n > 0
    root = {
      fn: lines[0].fn,
      ln: 0,
      s: '',
      childs: []
    }
    build(root, 0, 0)
    ret root
  else
    ret null

// draw str tree as ascii art
fun dump_str_tree(root)
  fun dump_str_subtree(parent, depth)
    log('-'.repeat(depth*2)+parent.s)
    for node of parent.childs
      dump_str_subtree(node, depth+1)
  for node of root.childs
    dump_str_subtree(node, 0)

export fun parse_tree(fn, str)
  let lines = parse_lines(fn, str)
  dump_lines(lines)
  let str_tree =  build_str_tree(lines)
  dump_str_tree(str_tree)
  ret {}

