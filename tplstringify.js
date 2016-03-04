

function stringifyTemplate(ast, out, depth) {

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
  /*if (ast.tag=='section' && ast.classes.length>0 && !ast.cmntBefore) {
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
  }*/

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
      tagLine += " class='"+ast.classes.join(' ')+"'"
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
  if (ast.text) {
    out.write( ast.text, depth )
  } else if (ast.cmnt) {
    out.nl()
    out.write( '<!--'+ast.cmnt+'-->', depth )
    out.nl()
  } else {
    var n = ast.childs.length
    for (var i = 0; i < n; i++) {
      var child = ast.childs[i]
      //log(ast.childs[i])
      stringifyTemplate(child, out, depth+1)
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
