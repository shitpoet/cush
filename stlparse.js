/*

  style sheet parser

  gets tok tree
  creates style tree

  style node (rule) descriptor:

    parent - reference

    sels - array of selectors:
      {
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

export function StlParser() {
  let media_atrule_name = 'media'
  let fontface_atrule_name = 'font-face'
  let known_atrules = [media_atrule_name, fontface_atrule_name]

  let new_rule = (parent) => seal({
    parent,
    csels: [], // compound sels
    decls: {},
    failbacks: {},
    childs: [],
    atrule: null /* {
      name - font-face, media, charset etc
      params - query for @media
    } */,
    cmnt: ''
  })

  let new_simple_sel = () => seal({
    tag: null,
    id: '',
    classes: [],
    pseudos: []
  })

  function push_childs(arr, childs) {
    if (childs) {
      if ('isArray' in childs && childs.isArray()) {
        arr = arr.concat(childs)
      } else {
        arr.push(childs)
      }
    }
  }

  let at_atrule = (s) => s.s=='@'
  let at_nested_rule = (s) => s.t.line.obs > 0

  function parse_atrule_header(rule, s) {
    //throw 'parse_atrule not impl'
    s.shift() // @
    let name, params
    if is_int(s.t) {
      name = 'media'
      params = 'only screen and (max-width: '+s.shift().s+'px)'
    } else {
      name = s.id()
      params = s.until('{')
    }
    return seal({name,params})
  }

  function scan_pseudo(rule, s) {
    s.skip(':')
    let str = ''
    if (s.trySkip(':')) str = ':' // 2nd `:`
    str += s.id()
    if (extPseudos[str]) {
      str = extPseudos[str](rule, str)
    } else {
      while (s.s=='(' || s.s==')' || is_id(s.t) || is_int(s.t)) {
        str += s.shift().s
      }
    }
    //log('ps',str)
    return str
  }

  function parse_simple_sel(rule, s) {
    let sel = new_simple_sel()
    if (s.s==='*' || is_id(s.t)) {
      let id = s.shift().s
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
      sel.pseudos.push( scan_pseudo(rule, s) )
      //log(sel.pseudos,s.s,s.s==':')
    }
    if (
      !sel.tag && !sel.id &&
      sel.classes.length==0 &&
      sel.pseudos.length==0
    ) {
      throw s.error('cant parse simple selector staring with `'+s.s+'`')
    }
    return sel
  }

  function parse_compound_sel(parent, s) {
    let csel = []
    s.skipSp()
    while (s.t && s.s!='{') {
      let ssel = parse_simple_sel(parent, s)
      csel.push(ssel)
      if (is_sp(s.t)) {
        s.skipSp()
      } else {
        break
      }
    }
    return csel
  }

  function parse_compound_sels(parent, s) {
    let csels = []
    s.skipSp()
    while (s.t && s.s!='{') {
      let csel = parse_compound_sel(parent, s)
      s.skipSp()
      csels.push(csel)
      if (s.trySkip(',')) {
        s.skipWs()
        continue
      }
      break
    }
    assert(csels.length > 0, 'no selectors')
    return csels
  }

  function parse_prop(rule, s) {
    let name = s.id()
    //{name,prop} = preprocessProp(rule, name)
    let alias = propAliases[name]
    if (alias) return alias
    let prop = knownProps[name]
    if (prop) return prop
    throw new s.error(`unknown property ${name}`)
  }

  fun scan_word(s) {
    let str = ''
    while (
      s.t && !is_sp(s.t) && !is_nl(s.t) &&
      s.t.s!='}' && s.t.s!=';'
    ) {
      str += s.shift().s
    }
    return str
  }

  fun parse_prop_arg(prop, arg, s) {
    let val
    if (arg.type == 'len') {
      val = scan_word(s)
      if (/^[.\d]+$/.test(val) && val!='0') {
        val += 'px'
      }
    } else if (arg.type == 'num') {
      val = scan_word(s)
    } else if (arg.type == 'color') {
      if (s.t.s=='#') { // color code
        val = s.shift().s
        let code = scan_word(s).toLowerCase()
        if (code.length == 1) {
          val += code + code + code
        } else {
          val += code
        }
      } else { // color name or url...
        val = scan_word(s)
      }
    } else if (arg.type == 'url') {
      val = scan_word(s)
    } else if (arg.type == 'str') {
      val = scan_word(s)
    } else if (arg.type == '%') {
      val = scan_word(s)
    } else if arg.type == 'enum' {
      val = s.shift().s
      let values = arg.values
      if (val in arg.aliases) {
        val = arg.aliases[val]
      }
      if !(val in values) {
        s.error('unknown enum value for '+prop.name)
      }
    //REFACT special cases
    } else if arg.type == 'line-height' {
      val = scan_word(s)
      if (/^\d+$/.test(val)) {
        let f = parseFloat(val)
        if (f >= 6) {
          val += 'px'
        }
      }
    } else s.error('unk arg type '+arg.type)
    return val
  }

  fun parse_prop_value(prop, s) {
    let args = prop.args
    let value = ''
    let lastSym = ' '
    if (args.length > 0) {
      for (let arg of args) {
        let val = parse_prop_arg(prop, arg, s)
        s.skipSp()
        value += val
        value += ' '
        if (!(
          s.t && !is_nl(s.t) && s.s!=';' && s.s!='}'
        )) break
      }
    } else {
      while (
        s.t &&
        ( !is_nl(s.t) || lastSym==',' ) &&
        s.s!=';' && s.s!='}'
      ) {
        lastSym = s.t.line.lastSym
        value += s.shift().s
      }
    }
    value = value.trim()
    return value
  }

  function parse_decl(rule, s) {
    s.skipWs()
    if (is_id(s.t)) {
      if (declAliases[s.s]) {
        let declStr = declAliases[s.id()]
        let [name, value] = declStr.split(/[:\s]\s*/)
        s.skipWs()
        return {name, value}
      } else {
        let prop = parse_prop(rule, s)
        let name = prop.name
        s.trySkip(':')
        s.skipSp()
        let value  = parse_prop_value(prop, s)
        s.trySkip(';')
        s.skipWs()
        return {name, value}
      }
    } else {
      throw s.error('parse_decl: prop name expected')
    }
  }

  function parse_decls(rule, s) {
    let decls = {}
    s.skipWs()
    while (s.t && s.s!='}' && s.t.line.obs==0) {
      let decl = parse_decl(rule, s)
      if (decl) {
        decls[decl.name] = decl
      } else {
        break
      }
    }
    return decls
  }

  function parse_nested_rules(parent, s) {
    let childs = []
    //log('parse nested rules ' + s.t?s.s:'s.t==null')
    s.skipWs()
    while (
      s.t && s.s!='}' //&& s.s!=until && !atClosingTag(s)
    ) {
      //log('obs',s.t.line.obs)
      if (is_ws(s.t)) {
        s.skipWs()
      } else if (is_cmnt(s.t)) {
        s.skipCmnt()
      } else if (at_nested_rule(s)) {
        //log('nested rule '+s.s)
        push_childs( childs, parse_rule(parent, s) )
      } else { // decl
        //parse_decl
        throw s.error('nested rule expected')
      }
    }
    return childs
  }

  function parse_rule(parent, s) {
    //log('new rule with parent ',parent)
    var rule = new_rule(parent)
    if (at_atrule(s)) {
      rule.atrule = parse_atrule_header(rule, s)
    } else {
      rule.csels = parse_compound_sels(rule, s)
    }
    s.skipSp()
    s.t.line.obs--
    s.skip('{')
    rule.decls = parse_decls(rule, s)
    rule.childs = parse_nested_rules(rule, s)
    s.skip('}')
    return rule
  }

  this.parse = function(s) {
    var rule = new_rule(null)
    //parse_ruleBody(rule, s)
    rule.childs = parse_nested_rules(rule, s)
    return rule
  }
}
