
function unwrap_class_name(name) {
  if (name.endsWith('-wrap'))
    return name.split('-wrap')[0]
  else
    return name
}

function get_full_cname(node, name, for_parent) {
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
}

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
    if (ast.tag && ast.tag.name=='section' && ast.classes.length>0 && !ast.cmntBefore) {
      var blockCmntName = ast.classes[0]
      //log('ADD SEC CMNT')
      if (blockCmntName.indexOf('-wrap')>=0) {
        //log('WRAP')
        blockCmntName = blockCmntName.split('-')
        blockCmntName = blockCmntName.slice(0, blockCmntName.length-1)
        blockCmntName = blockCmntName.join('-')
      }
      ast.cmntBefore = ' BEGIN '+blockCmntName+' '
      ast.cmntAfter  = ' END '+blockCmntName+' '
    }

    if (ast.cmntBefore) {
      out.write( '<!--'+ast.cmntBefore+'-->', depth )
      out.nl()
    }
    if (ast.tag) {
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
      if (ast.innerws=='block') {
        out.nl()
      } else if (ast.innerws=='spaces' || ast.innerws=='before') {
        out.sp()
      }
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
      if (!ast.tag && !ast.cmnt && !ast.text)
        subdepth = depth
      for (var i = 0; i < n; i++) {
        var child = ast.childs[i]
        //log(ast.childs[i])
        stringifyTemplate(child, out, subdepth)
      }
    }
    if (ast.tag) {
      if (ast.innerws=='block') {
        out.nl()
      } else if (ast.innerws=='spaces' || ast.innerws=='after') {
        out.sp()
      }
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
