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

function new_node(parent) {
  //if (parent && parent.tag) log('new node with parent '+parent.tag.name)
  //todo: refactor this goddy structure
  return seal({
    parent: parent,

    stmnt: '',
    condition: '',
    true_branch: null,
    false_branch: null,

    tag: null,
    attrs: {},
    id: '',
    classes: [],
    text: '',
    childs: [],
    cmntBefore: '',
    cmntAfter: '',

    cmnt: '',

    startTok: null,
    inTok: null,
    outTok: null,
    endTok: null,
    wsBefore: undefined, //todo: clean up ws fields
    wsAfter: undefined,
    wsIn: undefined,
    wsOut: undefined,
    innerws: null,
    outerws: null

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

  let at_include = s => s.s=='+' && s.s2=='include'

  fun parse_include(parent, s) {
    s.skip('+')
    s.skip('include')
    s.skipSp()
    let name = s.shift().s
    let fn = '_'+name+'.tpl'
    var str = fs.readFileSync(fn,'utf8')
    var toks = tokenize(fn, str)
    var s2 = new TokStream(toks)
    var ast = parse(s2)
    //ast.parent = parent
    /*for (let child of ast.childs) {
      child.parent = parent
    }*/
    return ast
    //let node = new_node(paret)
    //return parse_childs(node, s2
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

  function parse_attrs(node, s) {
    let tag = node.tag
    /*while (
      tag.attrs[s.s] && (s.s2=='=' || tag.attrs[s.s].type=='boolean') ||
      tag.attrAliases[s.s]
      (tag.attrs[s.s
      ||
      s.s.startsWith('data-')
    ) {*/
    while (true) {
      let isDataAttr = s.s.startsWith('data-')
      let attrName = s.s
      if (tag.attrAliases[attrName]) {
        attrName = tag.attrAliases[attrName].name
      }
      let attr = tag.attrs[attrName]
      if (s.s2=='=' || attr && attr.type=='boolean' || isDataAttr) {
        //let attrName = s.id()
        s.shift() // skip attr name
        let attrValue = null
        //log('attr '+attrName)
        //let attr = tag.attrs[attrName]
        if (attr || isDataAttr) {
          if (s.trySkip('=')) { // parse value
            attrValue = scanAttrValue(attr, s)
          }
          if (attrName=='id') {
            if (node.id) {
              throw s.error('duplicate id attr')
            }
            node.id = attrValue
          } else if (attrName=='class') {
            node.classes.push( attrValue )
          } else {
            node.attrs[attrName] = attrValue
          }
          s.skipSp()
        } else {
          throw s.error('unknown attr/attr-alias `'+attrName+'` for %'+node.tag.name)
        }
      } else {
        break
      }
    }
  }

  function parse_tag(parent, s) {
    let node = new_node(parent, s)
    node.startTok = s.t
    var tagName
    if (is_id(s.t)) {
      tagName = s.id()
      if (!knownTags[tagName]) {
        node.classes.push( tagName )
        tagName = 'div'
      }
    }
    while (s.s=='.' || s.s=='#') {
      if (!is_id(s.t2)) throw s.error('bad tag declaration')
      if (s.trySkip('.')) {
        node.classes.push( s.id() )
        if (!tagName) tagName = 'div'
      } else if (s.trySkip('#')) {
        node.id = s.id()
        if (!tagName) tagName = 'div'
      }
    }
    if (!tagName) throw s.error('bad tag declaration')

    //log('tag',tagName)
    node.tag = knownTags[tagName]
    if (s.s!=':' && s.s2!=' ')  {
      s.skipSp()
      parse_attrs(node, s)
      s.skipSp()
    }
    log('parsed tag: '+tagName+'.'+node.classes.join('.'))
    return node
  }

  function parseOpeningTag(parent, s) {
    s.skip('<')
    let node = parse_tag(parent, s)
    s.skipSp()
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

    if (s.t.line.obs > 0) {
      //log('### '+s.t.line.s+' -- have '+s.t.line.obs+' obs')
      //log('with {} block')
      s.t.line.obs--
      s.skip('{')
      node.childs = parseChilds(node, s, '', true)
      node.endTok = s.t
      s.skip('}')
    } else if (!node.tag.selfClosing) {
      //log('short tag without block')
      node.childs = parseChilds(node, s, '\n')
      //push_childs( node.childs, parse_text_node(parent, s) )
      //node.endTok = node.startTok.prev.prev
      node.wsBefore = tt.nl
      node.wsAfter = tt.nl
      let n = node.childs.length
      if (n > 0) node.childs[0].startTok = null
      if (n > 0) node.childs[n-1].endTok = null
    } else {
      //log('sefl closing')
    }
    return node
  }

  fun parse_short_tag(parent, s) {
    let node = parse_tag(parent, s)
    s.skipSp()
    return parse_short_tag_body(node, s)
  }

  function parse_text_node(parent, s) {
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
    //log('text',node.text)
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
    s.skipSp()
    s.skip('(')
    node.condition = s.until(')')
    s.skip(')')
    s.skipSp()
    node.true_branch = new_node(parent)
    parse_short_tag_body(node.true_branch, s)
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
    var childs = []
    //let at_start = true

    while (
      s.t && s.s!='}' && s.s!=until && !atClosingTag(s)
    ) {
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

    return childs
  }

  fun postparse_links(node){
    if (node.tag) {
      let tag_name = node.tag.name
      if tag_name=='a' {
        if (!('href' in node.attrs)) {
          node.attrs.href = '#'
        }
      } else if tag_name=='img' {
        if ('src' in node.attrs) {
          let src = node.attrs.src
          if (
            !src.startsWith('http') &&
            !src.startsWith('//')
          ) {
            node.attrs.src = 'img/'+node.attrs.src
          }
        }
      }
    }
    for (let child of node.childs)
      postparse_links(child)
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
        }
        //log('startTok',node.startTok.s)
      }
      if (node.inTok) {
        let t = node.inTok
        //if (t.s=='>') t = t.next
        //if (t) {
          if (is_nl(t)) nlIn = true
          if (is_sp(t)) spIn = true
        //}
      }
      if (node.outTok) {
        //log('outTok',node.outTok.s)
        let t = node.outTok
        if (t.s=='<') t = t.prev
        if (t) {
          if (is_nl(t)) nlOut = true
          if (is_sp(t)) spOut = true
        }
      }
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
      node.wsAfter  = (nlAfter  ? tt.nl : 0) | (spAfter  ? tt.sp : 0)
      node.wsIn     = (nlIn     ? tt.nl : 0) | (spIn     ? tt.sp : 0)
      node.wsOut    = (nlOut    ? tt.nl : 0) | (spOut    ? tt.sp : 0)
      /*node.nlAfter  = nlAfter
      node.spBefore = spBefore
      node.spAfter  = spAfter
      node.nlBefore = nlBefore
      node.nlAfter  = nlAfter
      node.spBefore = spBefore
      node.spAfter  = spAfter*/

    }

    for (var child of node.childs) {
      calcWs(child)
    }
    if (node.true_branch) calcWs(node.true_branch)
    if (node.false_branch) calcWs(node.false_branch)
  }

  function postparse(node) {
    postparse_links(node)
    calcWs(node)
  }

  var parse = this.parse = function(s) {
    let root = new_node(null)
    root.childs = parseChilds(root, s)
    postparse(root)
    return root
  }
}

