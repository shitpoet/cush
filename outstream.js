export let OutStream = function() {
  var DEBUG = false
  var self = this
  var text = ''
  var tabChar = ' '
  var tab = tabChar+tabChar
  var maxDepth = 64
  var tabs = new Array(maxDepth+1)
  var atNl = true

  /*function log() {
    console.log.apply(console,
  }*/

  !function initTabs(){
    var indent = '';
    tabs[0] = ''
    for (var i = 1; i < maxDepth; i++)
      tabs[i] = indent, indent += tab
  }()

  var write = this.write = function(str, depth) {
    /*if (DEBUG) log('write',str,depth)
    depth = (depth ? depth : 0) >= 0 ? depth : 0
    var indent =
      (text=='' || text.endsWith('\n')) ? tabs[depth] :
      text.endsWith('\n ') ? tabs[depth].slice(0,-1) : ''*/
    var indent = atNl ? tabs[depth+1] : ''
    text += indent + str
    atNl = false
  }
  var sp = this.sp = function() {
    //if (DEBUG) log('sp')
    if (text!='') {
      if (!text.endsWith(' ')) text += ' '
    }
    atNl = false
  }
  var nl = this.nl = function() {
    //if (DEBUG) log('nl')
    if (text!='') {
      //if (!text.endsWith('\n')) text += '\n'
      if (!atNl) text += '\n'
    }
    atNl = true
  }
  var nlnl = this.nlnl = function() {
    //if (DEBUG) log('nlnl')
    if (text!='') {
      //if (text.endsWith('\n\n')) {
      if (atNl && text.endsWith('\n\n')) {
        // do nothing //
      } else {
        //if (text.endsWith('\n')) {
        if (atNl) {
          text += '\n'
        } else {
          text += '\n\n'
        }
      }
    }
    atNl = true
  }
  this.getText = function() {
    return text
  }
}
