
function unwrap_cname(name) {
  if (name.endsWith('-wrap'))
    return name.split('-wrap')[0]
  else
    return name
}

// prefix=='' - no need for parent
fun make_full_cname(prefix, name)
  let full_name
  //if (prefix) prefix += '_'
  if name.indexOf('--') > 0
    let parts = name.split('--')
    let base = parts.shift()
    parts = parts.map( (mod) => base+'--'+mod )
    parts.unshift(base)
    parts = parts.map( (s) => prefix + s )
    full_name = parts.join(' ')
  else
    full_name = prefix + name
  return full_name

fun get_cname(node, name)
  if name!='_'
    return name
  else
    return unwrap_cname(node.parent.classes[0])

fun get_full_cname(node, name)
  name = get_cname(node, name)
  if name.startsWith('_')
    let parent = node.parent
    while parent
      if parent.classes.length > 0 && !parent.flags.wrapper
        let parent_name = get_cname(parent, parent.classes[0])
        if !parent_name.startsWith('_')
          if parent_name.indexOf('--') > 0
            parent_name = parent_name.split('--')[0]
          return make_full_cname(parent_name+'_', name)
      parent = parent.parent
    assert(false, 'no parent for '+name)
  elif name.startsWith('-')
    let parent = node.parent
    let parent_name = get_full_cname(parent, parent.classes[0])
    //let parent_name = get_cname(parent, parent.classes[0])
    return make_full_cname(parent_name, name)
  else
    return make_full_cname('', name)

/*
  d c b { _a }         -->  b__a
  d c b { __a }        -->  c__a
  d c b { ___a }       -->  d__a
  d c b--m { _a }      -->  b__a         - no modifier
  d--n c b--m { ___a } -->  c__a    - no modifier
*/
/*function get_full_cname(node, name, for_parent) {
  if (name.startsWith('__')) {
    assert(node.parent.classes.length > 0,
      'parent node has no classes for '+name)
    assert(node.parent.parent.classes.length > 0,
      'parent-parent node has no classes for '+name)
    if (name.indexOf('--')>0) {
      let ss = name.split('--')
      name = ss[0]
      let mod = ss[1]
      let full_cname = get_full_cname(
        node.parent.parent,
        node.parent.parent.classes[0],
        true
      ) + name
      //return full_cname+'.'+full_cname+'--'+mod
      if (for_parent) {
        return full_cname
      } else {
        return full_cname+' '+full_cname+'--'+mod
      }
    } else {
      return get_full_cname(
        node.parent.parent, node.parent.parent.classes[0], true
      ) + name
    }
  } else if (name.startsWith('_')) {
    assert(node.parent.classes.length > 0,
      'parent node has no classes for '+name)
    if name=='_' {
      return unwrap_class_name(
        get_full_cname(node.parent, node.parent.classes[0])
      )
    } else {


      if (node.flags.wrapper && for_parent) {
        //log(name+'  is wrapper')
        return get_full_cname(
          node.parent, node.parent.classes[0], true
        )
      } else {
        if (name.indexOf('--')>0) {
          let ss = name.split('--')
          name = ss[0]
          let mod = ss[1]
          //log(mod)
          let full_cname = get_full_cname(
            node.parent, node.parent.classes[0], true
          )+'_'+name
          if (for_parent) {
            return full_cname
          } else {
            return full_cname+' '+full_cname+'--'+mod
          }
        } else {
          return get_full_cname(
            node.parent, node.parent.classes[0], true
          )+'_'+name
        }
      }
    }
  } else {
    if (name.indexOf('--')>0) {
      let ss = name.split('--')
      name = ss[0]
      let mod = ss[1]
      if (for_parent) {
        return name
      } else {
        return name+' '+name+'--'+mod
      }
    } else {
      return name
    }
  }
}*/

export function stringifyTemplate(ast, out, depth) {
  if (ast) {

    depth = (depth) ? depth : 0
    /*log('st',depth)*/

    /*if (depth==0) {
      out.write('<!doctype html>', depth); out.nl()
    }*/
    /*if (ast.outerws=='block') out.nl();
    else if (ast.outerws=='spaces') out.sp()
    else if (ast.outerws=='before') out.sp()*/
    if (ast.wsBefore & tt.nl) out.nl(); else
    if (ast.wsBefore & tt.sp) out.sp()

    // auto add surrounding comments for section tags
    let autocmnt = ' section header footer nav '
    if (ast.tag && autocmnt.indexOf(' '+ast.tag.name+' ')>=0 && ast.classes.length>0 && !ast.cmntBefore) {
      var blockCmntName = ast.classes[0]
      //log('ADD SEC CMNT')
      if (blockCmntName.indexOf('-wrap')>=0) {
        //log('WRAP')
        blockCmntName = blockCmntName.split('-')
        blockCmntName = blockCmntName.slice(0, blockCmntName.length-1)
        blockCmntName = blockCmntName.join('-')
      }
      ast.cmntBefore = ' begin '+blockCmntName+' '
      ast.cmntAfter  = ' end '+blockCmntName+' '
    }

    if (ast.cmntBefore) {
      out.write( '<!--'+ast.cmntBefore+'-->', depth )
      out.nl()
    }
    if (ast.tag) {

      /*log('%'+ast.tag.name +
        (ast.classes ? '.'+ast.classes.join('.') : '') +
        ((ast.wsBefore & tt.nl) ? ' nl-before ' : '') +
        ((ast.wsAfter & tt.nl) ? ' nl-after ' : ''))*/

      var tagLine = ast.tag.name
      if (ast.id!='') {
        tagLine += ' id='+ast.id
      }
      if (ast.classes.length>0) {
        let classes = ast.classes
        classes = classes.map((name) => {
          return get_full_cname(ast, name)
        })
        tagLine += " class='"+classes.join(' ')+"'"
      }
      out.write( '<'+tagLine, depth )
      // stringify attrs
      var attrs = []
      for (var attrName in ast.attrs) {
        var attrValue = ast.attrs[attrName]
        if (attrValue !== null) {
          attrs.push(attrName+'='+"'"+attrValue+"'")
        } else {
          attrs.push(attrName)
        }
      }
      if (attrs.length > 0) {
        out.write( ' '+attrs.join(' ') )
      }
      out.write( '>' )

      /*if (ast.innerws=='block') {
        out.nl()
      } else if (ast.innerws=='spaces' || ast.innerws=='before') {
        out.sp()
      }*/
    }
    if (ast.cmnt) {
      out.nl()
      out.write( '<!--'+ast.cmnt+'-->', depth )
      out.nl()
    } else if (ast.text) {
      out.write( ast.text, depth )
    } else {
      /*if (ast.stmnt) {
        log('stmnt',ast.stmnt)
      }*/
      var n = ast.childs.length
      let subdepth = depth+1
      if (!ast.tag) // && !ast.cmnt && !ast.text)
        subdepth = depth
      for (var i = 0; i < n; i++) {
        var child = ast.childs[i]
        //log(ast.childs[i])
        stringifyTemplate(child, out, subdepth)
      }
    }
    if (ast.tag) {
      /*if (ast.innerws=='block') {
        out.nl()
      } else if (ast.innerws=='spaces' || ast.innerws=='after') {
        out.sp()
      }*/
    }
    //var known = typeof knownTag != 'undefined'
    var selfClosing = ast.tag && ast.tag.selfClosing
    var autoClosing = ast.tag && ast.tag.autoClosing
    if (ast.tag && !selfClosing && !autoClosing) {
      out.write( '</'+ast.tag.name+'>', depth )
    }
    /*if (ast.outerws=='block') out.nl()
    else if (ast.outerws=='spaces') out.sp()
    else if (ast.outerws=='after') out.sp()*/
    if (ast.wsAfter & tt.nl) out.nl(); else
    if (ast.wsAfter & tt.sp) out.sp()
    if (ast.cmntAfter) {
      out.nl()
      out.write( '<!--'+ast.cmntAfter+'-->', depth )
      out.nl()
    }

  }
}
