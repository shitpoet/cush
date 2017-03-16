"use strict";
/*

  templates parser

  ---------------

  node object
  - parent
  - toks
  - childs
  //- prev - needed?
  //- next - needed?

*/

//var knownTags = require('./tags.js')


include('tags')
include('toks')
include('toker')
include('parse')
include('tokstream')
include('pipeline')

function new_node(parent) {
  //if (parent && parent.tag) log('new node with parent '+parent.tag.name)
  //todo: refactor this goddy structure
  return seal({
    parent: parent,

    stmnt: '',
    condition: '',
    true_branch: null,
    false_branch: null,
    loop_branch: null,

    tag: null,
    attrs: {},
    id: '',
    classes: [],
    text: '',
    childs: [],
    cmntBefore: '',
    cmntAfter: '',

    cmnt: '',

    flags: {},

    startTok: null,
    inTok: null,
    outTok: null,
    endTok: null,
    wsBefore: undefined, //todo: clean up ws fields
    wsAfter: undefined,
    wsIn: undefined,
    wsOut: undefined,
    //innerws: null,
    //outerws: null

  })
}

export fun clone_node(node, parent) {
  if (node) {
    let p = parent ? parent : node.parent
    let n = new_node(p)
    for (let key in node)
      n[key] = node[key]
    n.attrs = {}
    for (let attrname in node.attrs)
      n.attrs[attrname] = node.attrs[attrname]
    n.childs = []
    for (let child of node.childs) {
      n.childs.push(clone_node(child, n))
    }
    return n
  } else {
    return null
  }
}

export function TplParser() {
  let opts = {}

  let at_include = s => s.s=='+' && s.s2=='include'

  fun parse_include(parent, s) {
    s.skip('+')
    s.skip('include')
    s.skip_sp()
    let name = s.shift().s
    let fn = '_'+name+'.tpl'

    s.skip_sp()
    let attrs = parse_attrs(s, {}, {}, '')
    //log(attrs)

    /*var str = fs.readFileSync(fn,'utf8')
    var toks = tokenize(fn, str)
    var s2 = new TokStream(toks)
    var ast = parse(s2)*/

    //todo: PL parse prduces childs==null here
    //let ast = pipeline.parse(fn)

    //log('parse include opts ',opts)

    //if !opts.php_mode {

    let toks = pipeline.tokenize(fn)

    var ts = new TokStream(toks)
    var ast = parse(ts, opts)

    if Object.keys(attrs).length > 0

      //tofix: booleans are strings after parse_attrs....
      //tofix: mb we need separate function to parse these parameters (f.ex. more javascriptish?)
      for key in attrs
        let val = attrs[key]
        if val == 'true'
          attrs[key] = true
        if val == 'false'
          attrs[key] = false

      let scope = new SourceScope()
      scope.push(projectInfo.variables)
      scope.push(attrs)
      //log('include with scope');scope.dump()
      _expand_ast(ast, scope)
      _apply_scope(ast, scope)
      fix_ast(ast)

    //ast.parent = parent
    /*for (let child of ast.childs) {
      child.parent = parent
    }*/

    if !opts.php_mode
      return ast
    else
      ast = new_node(parent)
      log('render partial '+fn)
      let vars = {}
      for k in projectInfo.variables
        vars[k] = projectInfo.variables[k]
      for k in attrs
        vars[k] = attrs[k]
      //let res = pipeline.render(fn, opts, projectInfo.variables)
      let res = pipeline.render(fn, opts, vars)
      fn = fn.replace('.tpl', '.php')
      fs.writeFile(fn, res)
      ast.text = '<?php include "'+fn+'"; ?>'
      ast.startTok = s.t
      ast.endTok = s.t
      ast.wsBefore = tt.nl
      ast.wsAfter = tt.nl
      return ast

    /*} else { // php mode

    }*/
  }

  function getKnownTag(tagName) {
    var knownTag = knownTags[tagName]
    if (knownTag) {
      return knownTag
    } else {
      throw s.error('unknown tag "'+tagName+'"')
    }
  }

  let at_statement = s => s.s=='if' || s.s=='for'

  var at_opening_tag = function(s) {
    return s.s=='<' && (
      is_id(s.t2) || s.s2=='.' || s.s2=='#'
    )
  }

  var atClosingTag = function(s) {
    return (
      s.s=='}' ||
      s.s=='<' && (s.s2=='/' || s.s2=='>')
    )
  }

  var at_short_tag = function(s, at_start) {
    return (
      s.t.line.obs > 0 ||
      (s.atLineStart() || at_start) && (
        is_id(s.t) ||
        s.s=='.' && is_id(s.t2) ||
        s.s=='#' && is_id(s.t2)
      )
    )
  }

  function scanAttrValue(attr, s) {
    if (is_qstr(s.t))
      return s.shift().ss
    else
      return s.shift().s
  }

  fun parse_attrs(s, attrs, aliases, prefix)
    let hash = {}
    while s.at_id() || s.s.startsWith('-') {
      let name = s.s
      let has_prefix = false
      if name.startsWith('-')
        name = 'data'+name
        has_prefix = true
      elif name.startsWith(prefix)
        has_prefix = true
      elif aliases[name]
        name = aliases[name].name
      let attr = attrs[name]
      //log(name, s.s2, s.s3)
      if s.s2=='=' || attr && attr.type=='boolean' || has_prefix
        s.shift() // skip attr name
        let value = null
        //log('attr '+attrName)
        //let attr = tag.attrs[attrName]
        if attr || has_prefix
          if s.try_skip('=') // parse value
            value = scanAttrValue(attr, s)
          hash[name] = value
          s.skip_sp()
        else
          throw s.error('unknown attr/attr-alias `'+name+'` for %')
      else
        break
    }
    return hash

  function parse_tag_attrs(node, s, attrs, aliases)
    if attrs == undefined
      let tag = node.tag
      attrs = tag.attrs
      aliases = tag.attrAliases
    node.attrs = parse_attrs(s, attrs, aliases, 'data-')
    /*if (attrName=='id')
      if node.id
        throw s.error('duplicate id attr')
      node.id = attrValue
    elif (attrName=='class')
      node.classes.push( attrValue )
    else     */

  fun add_class(classes, cname)
    classes.push( filter_parsed_cname(cname)  )

  function parse_tag(parent, s) {
    let node = new_node(parent, s)
    node.startTok = s.t
    var tname
    if (is_id(s.t)) {
      tname = s.id()
      let tname_expanded = filter_parsed_tname(tname)
      if known_tags[tname_expanded]
        tname = tname_expanded
      elif !known_tags[tname]
        //node.classes.push( tagName )
        add_parsed_class(node.classes, tname)
        tname = 'div'
    }
    while (s.s=='.' || s.s=='#') {
      //if (s.trySkip('.')) {
        //log(s.s)
        //if (s.s=='.' || s.s=='#') continue
      if (s.s=='.')
        while (s.trySkip('.'));
        //if (!is_id(s.t)) throw s.error('bad tag class')
        add_class(node.classes, s.id())
        if (!tname) tname = 'div'
      //elif (s.trySkip('#'))
      else
        while (s.trySkip('#'));
        //if (s.s=='.' || s.s=='#') continue
        //if (!is_id(s.t2)) throw s.error('bad tag id')
        node.id = s.id()
        if (!tname) tname = 'div'
    }
    if (!tname) throw s.error('bad tag declaration')

    if (s.trySkip('~')) {
      //log('wrapper node: ', node)
      node.flags.wrapper = true
    }

    //log('tag',tname)
    node.tag = known_tags[tname]
    if (s.s!=':' && s.s2!=' ')  {
      s.skip_sp()
      parse_tag_attrs(node, s)
      s.skip_sp()
    }
    //log('parsed tag: '+tagName+'.'+node.classes.join('.'))
    return node
  }

  function parseOpeningTag(parent, s) {
    s.skip('<')
    let node = parse_tag(parent, s)
    s.skip_sp()
    s.skip('>')
    node.inTok = s.t
    return node
  }

  function parseClosingTag(node, s) {
    node.outTok = s.t
    s.skipWs()
    s.skip('<')
    if (s.trySkip('/')) {
      if (s.s!='>') s.skip(node.tag.name)
    }
    node.endTok = s.t
    s.skip('>')
  }

  function parse_normal_tag(parent, s) {
    let node = parseOpeningTag(parent, s)
    let tag = node.tag
    if (!tag.selfClosing) {
      node.childs = parseChilds(node, s)
      parseClosingTag(node, s)
    }
    return node
  }

  fun parse_short_tag_body(node, s) {
    if s.s==':'
      s.skip(':')
      node.childs = parseChilds(node, s, '\n', true)
      node.endTok = s.t
      node.wsBefore = tt.nl
      node.wsAfter = tt.nl
      let n = node.childs.length
      if (n > 0) node.childs[0].wsBefore = tt.nl
      if (n > 0) node.childs[n - 1].wsAfter = tt.nl
      //node.wsIn = tt.nl
      //node.wsOut = tt.nl
    elif s.t.line.obs > 0
      //log('### '+s.t.line.s+' -- have '+s.t.line.obs+' obs')
      //log('with {} block')
      s.t.line.obs--
      s.skip('{')
      node.childs = parseChilds(node, s, '', true)
      node.endTok = s.t
      s.skip('}')
    elif !node.tag.selfClosing
      //log('short tag without block')
      node.childs = parseChilds(node, s, '\n')
      //push_childs( node.childs, parse_text_node(parent, s) )
      //node.endTok = node.startTok.prev.prev
      node.wsBefore = tt.nl
      node.wsAfter = tt.nl
      let n = node.childs.length
      if (n > 0) node.childs[0].startTok = null
      if (n > 0) node.childs[n - 1].endTok = null
    else
      //log('sefl closing')
      ;
    return node
  }

  fun parse_short_tag(parent, s) {
    let node = parse_tag(parent, s)
    s.skip_sp()
    return parse_short_tag_body(node, s)
  }

  function parse_text_node(parent, s) {
    //log('parse_text_node')
    let node = new_node(parent)
    node.startTok = s.t
    node.text = ''
    while (
      s.t && s.s!='\n' &&
      !at_opening_tag(s) && !atClosingTag(s)
    ) {
      //log('s.s atClosingTag?',s.s,atClosingTag(s))
      node.text += s.shift().s
    }
    log('text',node.text)
    node.text = node.text.trim()
    node.endTok = s.t.prev
    return node
  }

  fun parse_comment(parent, s) {
    let node = new_node(parent)
    node.cmnt = s.shift().s
    return node
  }

  function parse_statement(parent, s) {
    let node = new_node(parent)
    node.stmnt = s.shift().s
    s.skip_sp()
    s.skip('(')
    node.condition = s.until(')')
    s.skip(')')
    s.skip_sp()
    if (node.stmnt=='if') {
      node.true_branch = new_node(parent)
      parse_short_tag_body(node.true_branch, s)
    } else if (node.stmnt=='for') {
      node.loop_branch = new_node(parent)
      parse_short_tag_body(node.loop_branch, s)
    } else {
      s.error('unknown statement: '+node.stmnt)
    }

    //todo: `else` branch
    return node
  }

  function pushChild(arr, child) {
    arr.push(child)
  }

  function push_childs(arr, childs) {
    if (childs) {
      if ('isArray' in childs && childs.isArray()) {
        arr = arr.concat(childs)
      } else {
        arr.push(childs)
      }
    }
  }

  function parseChilds(parent, s, until, at_start) {
    //log('parse-childs')
    var childs = []
    //let at_start = true

    //log('s.s = `'+s.s+'` until = `'+until+'`')
    log(s.t && s.s!='}' && s.s!=until )//&& !atClosingTag(s))
    while (
      s.t && s.s!='}' && s.s!=until && !atClosingTag(s)
    ) {
      //log('loop')
      if (is_ws(s.t)) {
        s.skipWs()
      } else {
        if (is_cmnt(s.t)) {
          push_childs( childs, parse_comment(parent, s) )
        } else if (at_include(s)) {
          push_childs( childs, parse_include(parent, s) )
        } else if (at_statement(s)) {
          push_childs( childs, parse_statement(parent, s) )
        } else if (at_short_tag(s, at_start)) {
          push_childs( childs, parse_short_tag(parent, s) )
        } else if (at_opening_tag(s)) {
          push_childs( childs, parse_normal_tag(parent, s) )
        } else { // text
          push_childs( childs, parse_text_node(parent, s) )
        }
        at_start = false
      }
    }
    //log('end of loop')

    return childs
  }

  fun postparse_links(node){
    //if (node) {
    if node.tag {
      let tag_name = node.tag.name
      if tag_name=='a' {
        if !('href' in node.attrs)
          node.attrs.href = '#'
      } else if tag_name=='img' {
        if ('src' in node.attrs) {
          let src = node.attrs.src
          if (
            !src.startsWith('img/') &&
            !src.startsWith('http') &&
            !src.startsWith('/') &&
            !src.startsWith('../') &&
            !src.startsWith('[[')
          ) {
            src = 'img/'+node.attrs.src
            node.attrs.src = src
          }
          if (
            !src.startsWith('data') &&
            !src.startsWith('[[') && // php var
            !(src.endsWith('.png') ||
            src.endsWith('.jpg'))
          )
            src += '.png'
            node.attrs.src = src
          if opts.php_mode && !src.startsWith('/') && !src.startsWith('[[')
            src = '/'+src
            node.attrs.src = src
        }
      }
    }
    if (node.true_branch) postparse_links(node.true_branch)
    if (node.false_branch) postparse_links(node.false_branch)
    if (node.loop_branch) postparse_links(node.loop_branch)
    for (let child of node.childs)
      if (child)
        postparse_links(child)
    //}
  }

  function calcWs(node) {
    if (node.wsBefore === undefined && node.wsAfter === undefined) {

      var nlBefore, spBefore, nlAfter, spAfter
      var nlIn, spIn, nlOut, spOut
      nlBefore = spBefore = nlAfter = spAfter = false
      nlIn = spIn = nlOut = spOut = false
      if (node.startTok) {
        let before = node.startTok.prev
        if (before && before.s=='<')
          before = before.prev
        //log('before',before.s)
        if (before) {
          if (is_nl(before)) nlBefore = true
          if (is_sp(before)) spBefore = true
        } else { // start of file ???
          nlBefore = true
        }
        //log('startTok',node.startTok.s)
      }
      // add NL before first line of included partials
      if (node.parent == null) nlBefore = true
      /*if (node.inTok) {
        let t = node.inTok
        //if (t.s=='>') t = t.next
        //if (t) {
        if (is_nl(t)) nlIn = true
        if (is_sp(t)) spIn = true
        //}
      }*/
      /*if (node.outTok) {
        //log('outTok',node.outTok.s)
        let t = node.outTok
        if (t.s=='<') t = t.prev
        if (t) {
          if (is_nl(t)) nlOut = true
          if (is_sp(t)) spOut = true
        }
      }*/
      //log('nlIn spIn nlOut spOut', nlIn, spIn, nlOut, spOut)
      if (node.endTok) {
        let after = node.endTok.next
        if (after) {
          if (is_nl(after)) nlAfter = true
          if (is_sp(after)) spAfter = true
        }
      }
      /*log(node.text,'nlBefore spBefore nlAfter spAfter', nlBefore, spBefore, nlAfter, spAfter)
      let wsBefore = nlBefore || spBefore
      let wsAfter = nlAfter || spAfter
      node.outerws =
        nlBefore && nlAfter ? 'block' :
        wsBefore && wsAfter ? 'spaces' :
        wsBefore ? 'before' :
        wsAfter ? 'after' : null
      let wsIn = nlIn || spIn
      let wsOut = nlOut || spOut
      node.innerws =
        nlIn && nlOut ? 'block' :
        wsIn && wsOut ? 'spaces' :
        wsIn ? 'before' :
        wsOut ? 'after' : null*/
      node.wsBefore = (nlBefore ? tt.nl : 0) | (spBefore ? tt.sp : 0)
      node.wsAfter  = node.wsBefore
      //node.wsAfter  = (nlAfter  ? tt.nl : 0) | (spAfter  ? tt.sp : 0)
      //node.wsIn     = (nlIn     ? tt.nl : 0) | (spIn     ? tt.sp : 0)
      //node.wsOut    = node.wsIn
      //node.wsOut    = (nlOut    ? tt.nl : 0) | (spOut    ? tt.sp : 0)
      /*node.nlAfter  = nlAfter
      node.spBefore = spBefore
      node.spAfter  = spAfter
      node.nlBefore = nlBefore
      node.nlAfter  = nlAfter
      node.spBefore = spBefore
      node.spAfter  = spAfter*/

    }

    for (var child of node.childs) {
      if child // this stupid check if needed because of not very good things happening inside of tplcompile.expand_ast
        calcWs(child)
    }
    if (node.true_branch) calcWs(node.true_branch)
    if (node.false_branch) calcWs(node.false_branch)
    if (node.loop_branch) calcWs(node.loop_branch)
  }

  function postparse(node) {
    postparse_links(node)

    calcWs(node)

    // custom postparse
    //if fs.existsSync('posttpl.js'
      //log('posttpl.js !!!!!!!!!!!!!')
  }

  var parse = this.parse = fun(s, parse_opts) {
    opts = parse_opts
    let root = new_node(null)
    root.childs = parseChilds(root, s)
    postparse(root)
    return root
  }
}

