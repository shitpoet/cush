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


function TplParser() {

  function newNode(parent) {
    return {
      parent: parent,
      tag: null,
      attrs: {},
      id: '',
      classes: [],
      text: '',
      childs: [],
      startTok: null,
      inTok: null,
      outTok: null,
      endTok: null
    }
  }

  function getKnownTag(tagName) {
    var knownTag = knownTags[tagName]
    if (knownTag) {
      return knownTag
    } else {
      throw s.error('unknown tag "'+tagName+'"')
    }
  }

  var atOpeningTag = function(s) {
    return s.s=='<' && (
      isId(s.t2) || s.s2=='.' || s.s2=='#'
    )
  }

  var atClosingTag = function(s) {
    return (
      s.s=='}' ||
      s.s=='<' && (s.s2=='/' || s.s2=='>')
    )
  }

  var atShortTag = function(s) {
    return (
      s.t.line.obs > 0 ||
      s.atLineStart() && (
        isId(s.t) ||
        s.s=='.' && isId(s.t2) ||
        s.s=='#' && isId(s.t2)
      )
    )
  }

  function scanAttrValue(attr, s) {
    if (isQStr(s.t))
      return s.shift().ss
    else
      return s.shift().s
  }

  function parseAttrs(node, s) {
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

  function parseTag(parent, s) {
    let node = newNode(parent, s)
    node.startTok = s.t
    var tagName
    if (isId(s.t)) {
      tagName = s.id()
      if (!knownTags[tagName]) {
        node.classes.push( tagName )
        tagName = 'div'
      }
    }
    while (s.s=='.' || s.s=='#') {
      if (!isId(s.t2)) throw s.error('bad tag declaration')
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
      parseAttrs(node, s)
      s.skipSp()
    }
    return node
  }

  function parseOpeningTag(parent, s) {
    s.skip('<')
    let node = parseTag(parent, s)
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

  function parseNormalTag(parent, s) {
    let node = parseOpeningTag(parent, s)
    node.childs = parseChilds(node, s)
    parseClosingTag(node, s)
    return node
  }

  function parseShortTag(parent, s) {
    let node = parseTag(parent, s)
    s.skipSp()
    if (s.t.line.obs > 0) {
      s.t.line.obs--
      s.skip('{')
      node.childs = parseChilds(parent, s)
      node.endTok = s.t
      s.skip('}')
    } else {
      //log('short tag without block')
      node.childs = parseChilds(parent, s, '\n')
      //pushChilds( node.childs, parseTextNode(parent, s) )
      //node.endTok = node.startTok.prev.prev
      node.wsBefore = tt.nl
      node.wsAfter = tt.nl
      let n = node.childs.length
      if (n > 0) node.childs[0].startTok = null
      if (n > 0) node.childs[n-1].endTok = null
    }
    return node
  }

  function parseTextNode(parent, s) {
    let node = newNode(parent)
    node.startTok = s.t
    node.text = ''
    while (
      s.t && s.s!='\n' &&
      !atOpeningTag(s) && !atClosingTag(s)
    ) {
      //log('s.s atClosingTag?',s.s,atClosingTag(s))
      node.text += s.shift().s
    }
    //log('text',node.text)
    node.endTok = s.t.prev
    return node
  }

  function pushChild(arr, child) {
    arr.push(child)
  }

  function pushChilds(arr, childs) {
    if (childs) {
      if (childs.isArray && childs.isArray()) {
        arr = arr.concat(childs)
      } else {
        arr.push(childs)
      }
    }
  }

  function parseChilds(parent, s, until) {
    var childs = []

    while (
      s.t && s.s!='}' && s.s!=until && !atClosingTag(s)
    ) {
      if (isWs(s.t)) {
        s.skipWs()
      } else if (atShortTag(s)) {
        pushChilds( childs, parseShortTag(parent, s) )
      } else if (atOpeningTag(s)) {
        pushChilds( childs, parseNormalTag(parent, s) )
      } else { // text
        pushChilds( childs, parseTextNode(parent, s) )
      }
    }

    return childs
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
          if (isNl(before)) nlBefore = true
          if (isSp(before)) spBefore = true
        }
        //log('startTok',node.startTok.s)
      }
      if (node.inTok) {
        let t = node.inTok
        //if (t.s=='>') t = t.next
        //if (t) {
          if (isNl(t)) nlIn = true
          if (isSp(t)) spIn = true
        //}
      }
      if (node.outTok) {
        //log('outTok',node.outTok.s)
        let t = node.outTok
        if (t.s=='<') t = t.prev
        if (t) {
          if (isNl(t)) nlOut = true
          if (isSp(t)) spOut = true
        }
      }
      //log('nlIn spIn nlOut spOut', nlIn, spIn, nlOut, spOut)
      if (node.endTok) {
        let after = node.endTok.next
        if (after) {
          if (isNl(after)) nlAfter = true
          if (isSp(after)) spAfter = true
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
  }

  function postparse(node) {
    calcWs(node)
  }

  var parse = this.parse = function(s) {
    let root = newNode(null)
    root.childs = parseChilds(root, s)
    postparse(root)
    return root
  }
}

