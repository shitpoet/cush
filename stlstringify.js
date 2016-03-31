
function sel_to_str(sel) {
  let str = ''
  if (sel.tag) str = sel.tag.name
  if (sel.id) str += '#'+sel.id
  str += sel.classes.reduce( (prev,s) => prev+'.'+s , '')
  str += sel.pseudos.reduce( (prev,s) => prev+':'+s , '')
  return str
}

/*function sels_to_strs(rule, sels) {
  let strs = []
  for (let sel of sels) {
    let str = sel_to_str(rule, sel).trim()
    strs.push(str)
  }
  return strs
}*/

function clone_simple_sel(sel) {
  return seal({
    tag: sel.tag,
    id: sel.id,
    classes: sel.classes.slice(0),//.splice(0),
    pseudos: sel.pseudos.slice(0)//.splice(0)
  })
}

function clone_compound_sel(csel) {
  let copy = []
  for (let sel of csel) {
    copy.push( clone_simple_sel(sel) )
  }
  return copy
}

/* build flattened, full compound selectors

  go up through rules hierarchy
  and build flat compound selectors

  one compound selector is array of simple selectors

  clones selectors while builidng to allow of mutation
  of any node without affect or another (several nodes
  may be childs of one so in flattened selectors selector
  of parent node will be repeated for all children)  */
function build_full_csels(rule) {
  let csels = rule.csels
  let full_csels = []
  if (rule.parent && rule.parent.csels.length > 0) {
    let parent_full_csels = build_full_csels(rule.parent)
    for (let parent_full_csel of parent_full_csels) {
      for (let csel of csels) {
        let full_csel = parent_full_csel.concat( csel )
        let full_csel_copy = clone_compound_sel(full_csel)
        full_csels.push(full_csel_copy)
        //full_csels.push(full_csel)
      }
    }
  } else {
    for (let csel of csels) {
      let csel_copy = clone_compound_sel(csel)
      full_csels.push( csel_copy )
      //full_csels.push( csel )
    }
  }
  return full_csels
}

// concat BEM-like class names
function process_full_csel(full_csel) {
  let pcsel = []
  let m = full_csel.length
  for (let j = 0; j < m; j++) {
    let sel = full_csel[j]
    if (sel.classes.length >= 1) {
      let cname = sel.classes[0]
      if (cname.startsWith('_')) {
        if (sel.classes.length == 1) {
          //log(`full csel ${i} simp sel ${j} cname ${cname}`)
          let k = pcsel.length
          if (k >= 1) {
            if (pcsel[k-1].classes.length == 1) {
              let parent_cname = pcsel[k-1].classes[0]
              if (parent_cname.indexOf('--') > 0) {
                parent_cname = parent_cname.split('--').shift()
                sel.classes[0] = parent_cname + '_' + cname
                pcsel.push(sel)
              } else {
                sel.classes[0] = parent_cname + '_' + cname
                pcsel[k-1] = sel
              }
            } else {
              throw new Error('cant concat classes (too many parent classes)')
            }
          } else {
            throw new Error('cant concat classes (no parent)')
          }
        } else {
          throw new Error('cant concat classes (too many child classes)')
        }
      } else { // no `_classname`
        pcsel.push(sel)
      }
    } else { // no classes
      pcsel.push(sel)
    }
  }
  return pcsel
}

function process_full_csels(full_csels) {
  let pcsels = []
  let n = full_csels.length
  for (let i = 0; i < n; i++) {
    let full_csel = full_csels[i]
    let pcsel = process_full_csel(full_csel)
    pcsels.push(pcsel)
  }
  return pcsels
}

function sels_to_strs(rule, csels) {
  let full_csels = build_full_csels(rule, csels)
  //log(util.inspect({csels},{depth:null}))

  /*log('full csels')
  for (let csel of full_csels) {
    //log('full csel')
    let s = ''
    for (let sel of csel) {
      s += sel.classes.join('.') + ' '
    }
    log(s)
  }
  log('')*/

  full_csels = process_full_csels(full_csels)

  /*log('full csels*')
  for (let csel of full_csels) {
    //log('full csel*')
    let s = ''
    for (let sel of csel) {
      s += sel.classes[0] + ' '
    }
    log(s)
  }
  log('')*/

/*    let parent_sels = rule.parent ? get_parent_sels(rule) : [null]
  for (let parent_sel of parent_sels) {
    for (let sel of sels) {
      for (let cname of sel.classes) {
        if (cname.startsWith('_')) {
          cname = parent_sel.classes[0]+'_'+cname
        }
      }
    }
  }
*/

  let strs = []
  for (let csel of full_csels) {
    let str = csel.map(sel_to_str).join(' ')
    strs.push( str )
  }
  return strs
}

fun write_sels(rule, out, rule_depth) {
  let strs = sels_to_strs(rule, rule.csels)
  out.write(strs.join(', ')+' ', rule_depth)
}

fun write_block(rule, out, rule_depth) {
  let prop_depth = rule_depth + 1
  out.write('{', rule_depth)
  out.nl()
  for name in rule.decls {
    let value = rule.decls[name].value
    out.write(name+': '+value+';', prop_depth)
    out.nl()
  }
  out.write('}', rule_depth);
}

fun stringifyRule(prefix, rule, out, scope, depth) {
  var rule_depth = 0
  if (rule) {

    if (rule.cmnt) {
      out.nlnl()
      out.write('/*'+rule.cmnt+'*/', rule_depth)
      out.nlnl()
    }

    let have_sels = rule.csels && rule.csels.length > 0
    if have_sels {
      write_sels(rule, out, rule_depth)
      write_block(rule, out, rule_depth)
      out.nlnl()
    } else if rule.atrule {
      let {name,params} = rule.atrule
      if name=='media' {
        out.write(`@${name} ${params} {`, rule_depth)
        out.nl()
        write_sels(rule.parent, out, rule_depth+1)
        write_block(rule, out, rule_depth+1)
        out.nl()
        out.write(`}`, rule_depth)
        out.nlnl()
      } else {
        out.write(`@${name} `, rule_depth)
        write_block(rule, out, rule_depth)
        out.nlnl()
      }
    }

    // nested rules
    for child of rule.childs {
      stringifyRule(prefix, child, out, scope, depth+1)
    }
  }
}

export function stringifyStyle(ast, out, scope, depth) {
  stringifyRule('', ast, out, scope, depth)
}
