"use strict";
/*

  style sheet parser

  gets tok tree
  creates style tree

  style node (rule) descriptor:

    parent - reference

    sels - array of selectors:
      selector = {
        tag: reference to tag descriptor
        id: string
        classes: array of strings
        pseudos: array of strings (wo ':')
      }

    decls - declarations hash:
      [propName] => {
        name: property name string
        value: property value strin
        important: boolean
      }

      hacks are not supported
      !important is not supported

    childs - nested rules

*/

include('tags')
include('css')

include('ext/pseudos')

function StlParser() {
  let newRule = (parent) => ({
    parent,
    sels: [],
    decls: {},
    failbacks: {},
    childs: [],
    dirs: []
  })

  let newSel = () => ({
    /*at: '',
    params: '',*/
    tag: null,
    id: '',
    classes: [],
    pseudos: []
  })

  /*let newDecl = (name, value, important) = ({
    ...
  })*/

  /*let newDirective = () => ({
    name: '',
    params: '',
    body: {}
  })*/

  //let atRuleEnd = (s) => s.s=='}'



  function pushChilds(arr, childs) {
    if (childs) {
      if (childs.isArray && childs.isArray()) {
        arr = arr.concat(childs)
      } else {
        arr.push(childs)
      }
    }
  }

  let atNestedRule = (s) => s.t.line.obs > 0

  /*function parseDecls(node, s) {
    let decls = {}

    while (
      s.t && s.s!='}' //&& s.s!=until && !atClosingTag(s)
    ) {
      if (isWs(s.t)) {
        s.skipWs()
      } else if (atNestedRule(s)) {
        pushChilds( childs, parseRule(parent, s) )
      } else { // decl

      }
    }

    return decls
  }*/

  function scanPseudo(rule, s) {
    s.skip(':')
    let str = s.id()
    if (extPseudos[str]) {
      str = extPseudos[str](rule, str)
    } else {
      while (s.s=='(' || s.s==')' || isId(s.t) || isInt(s.t)) {
        str += s.shift().s
      }
    }
    //log('ps',str)
    return str
  }

  function parseSel(rule, s) {
    let sel = newSel()
    if (isId(s.t)) {
      let id = s.id()
      if (knownTags[id]) {
        sel.tag = knownTags[id]
      } else {
        sel.classes.push(id)
      }
    }
    while (s.s=='.' || s.s=='#') {
      if (s.trySkip('.')) {
        sel.classes.push( s.id() )
      } else if (s.trySkip('#')) {
        if (sel.id) s.warn('several ids')
        sel.id = s.id()
      }
    }
    while (s.s==':') {
      sel.pseudos.push( scanPseudo(rule, s) )
    }
    return sel
  }

  function parseSels(parent, s) {
    let sels = []
    s.skipSp()
    while (s.t && s.s!='{') {
      let sel = parseSel(parent, s)
      s.skipSp()
      if (sel) {
        sels.push(sel)
        if (s.trySkip(',')) {
          s.skipWs()
          continue
        }
      }
      break
    }
    assert(sels.length > 0, 'no selectors')
    return sels
  }

  function parseProp(rule, s) {
    let name = s.id()
    //{name,prop} = preprocessProp(rule, name)
    let alias = propAliases[name]
    if (alias) return alias
    let prop = knownProps[name]
    if (prop) return prop
    throw new s.error(`unknown property ${name}`)
  }

  function parseDecl(rule, s) {
    s.skipWs()
    if (isId(s.t)) {
      if (declAliases[s.s]) {
        let declStr = declAliases[s.id()]
        let [name, value] = declStr.split(/[:\s]\s*/)
        s.skipWs()
        return {name, value}
      } else {
        let prop = parseProp(rule, s)
        let name = prop.name
        s.trySkip(':')
        s.skipSp()
        let value = ''
        while (s.t && !isNl(s.t) && s.s!=';') {
          value += s.shift().s
        }
        value = value.trim()
        s.trySkip(';')
        s.skipWs()
        return {name, value}
      }
    } else {
      throw s.error('bad decl')
    }
  }

  function parseDecls(rule, s) {
    let decls = {}
    s.skipWs()
    while (s.t && s.s!='}' && s.t.line.obs==0) {
      let decl = parseDecl(rule, s)
      if (decl) {
        decls[decl.name] = decl
      } else {
        break
      }
    }
    return decls
  }

  function parseNestedRules(parent, s) {
    let childs = []
    //log('parse nested rules ' + s.t?s.s:'s.t==null')
    s.skipWs()
    while (
      s.t && s.s!='}' //&& s.s!=until && !atClosingTag(s)
    ) {
      //log('obs',s.t.line.obs)
      if (isWs(s.t)) {
        s.skipWs()
      } else if (atNestedRule(s)) {
        //log('nested rule '+s.s)
        pushChilds( childs, parseRule(parent, s) )
      } else { // decl
        //parseDecl
        throw s.error('nested rule expected')
      }
    }
    //todo: assert for no } for non-root rules here
    return childs
  }

  function parseRule(parent, s) {
    //log('new rule with parent ',parent)
    var rule = newRule(parent)
    rule.sels = parseSels(rule, s)
    s.skip('{')
    //s.skipWs()
    rule.decls = parseDecls(rule, s)
    //s.skipWs()
    rule.childs = parseNestedRules(rule, s)
    //s.skipWs()
    s.skip('}')
    return rule
  }

  this.parse = function(s) {
    var rule = newRule(null)
    //parseRuleBody(rule, s)
    rule.childs = parseNestedRules(rule, s)
    return rule
  }
}
