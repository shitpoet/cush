"use strict";

function stringifyRule(prefix, ast, out, scope, depth) {
  var DBG = false

  function selToString(sel) {
    var str = ''
    if (sel.tag) str = sel.tag.name
    if (sel.id) str += '#'+sel.id
    str += sel.classes.reduce( (prev,s) => prev+'.'+s , '')
    str += sel.pseudos.reduce( (prev,s) => prev+':'+s , '')
    return str
  }

  function writeSels(rule, ruleDepth) {
    //log(rule.sels)
    if (rule.parent) {
      writeSels(rule.parent, ruleDepth)
    }
    let sels = rule.sels
    let n = sels.length
    let selStrs = sels.map(selToString)
    if (selStrs.length > 0) {
      out.write(selStrs.join(', ')+' ', ruleDepth)
    }
  }

  var ruleDepth = 0
  var propDepth = 1
  if (ast) {

    if (ast.cmnt) {
      out.nlnl()
      out.write('/*'+ast.cmnt+'*/', ruleDepth)
      out.nlnl()
    }

    var ismq = false
    if (ast.sels && ast.sels.length > 0) {
      writeSels(ast, ruleDepth)
      out.write('{', ruleDepth)
      out.nl()
      for (let name in ast.decls) {
        let value = ast.decls[name].value
        out.write(name+': '+value+';', propDepth)
        out.nl()
      }
    }
    if (ast.sels && ast.sels.length > 0) {
      out.write('}', ruleDepth);
      if (ismq) {
        ruleDepth--, propDepth--
        out.nl()
        out.write('}', ruleDepth)
      }
      out.nlnl()
    }

    // nested rules
    if (ast.childs.length > 0) {
      for (var i = 0; i < ast.childs.length; i++) {
        var child = ast.childs[i]
        stringifyRule(prefix, child, out, scope, depth+1)
      }
    }
  }
}

function stringifyStyle(ast, out, scope, depth) {
  stringifyRule('', ast, out, scope, depth)
}
