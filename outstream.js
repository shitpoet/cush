var OutStream = function() {
  var DEBUG = false
  var self = this
  var text = ''
  var tabChar = ' '
  var tab = tabChar+tabChar
  var maxDepth = 255
  var tabs = new Array(maxDepth+1)

  /*function log() {
    console.log.apply(console,
  }*/

  !function initTabs(){
    var indent = '';
    for (var i = 0; i < maxDepth; i++)
      tabs[i] = indent, indent += tab
  }()

  var write = this.write = function(str, depth) {
    if (DEBUG) log('write',str,depth)
    depth = (depth ? depth : 0) >= 0 ? depth : 0
    var indent =
      (text=='' || text.endsWith('\n')) ? tabs[depth] :
      text.endsWith('\n ') ? tabs[depth].slice(0,-1) : ''
    text += indent + str
  }
  var sp = this.sp = function() {
    if (DEBUG) log('sp')
    if (text!='') {
      if (!text.endsWith(' ')) text += ' '
    }
  }
  var nl = this.nl = function() {
    if (DEBUG) log('nl')
    if (text!='') {
      if (!text.endsWith('\n')) text += '\n'
    }
  }
  var nlnl = this.nlnl = function() {
    if (DEBUG) log('nlnl')
    if (text!='') {
      if (!text.endsWith('\n\n')) text += '\n\n'
      else if (text.endsWith('\n')) text += '\n'
    }
  }
  this.getText = function() {
    return text
  }
}
