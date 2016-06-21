//require('./common.js')

include('toks')

export let TokStream = function(toks) {
  var self = this
  var n = toks.length
  var pos = 0
  var t0 = null
  this.t  = null
  this.t2 = null
  this.t3 = null
  this.s  = ''
  this.s2 = ''
  this.s3 = ''

  var shift = this.shift = function() {
    t0 = self.t
    pos++
    self.t  = self.t2
    self.s  = self.s2
    self.t2 = self.t3
    self.s2 = self.s3
    if (pos+2 < n) {
      self.t3 = toks[pos+2]
      self.s3 = self.t3.s
    } else {
      self.t3 = null
      self.s3 = ''
    }
    return t0
  }

  this.skip = function(s) {
    if (this.t) {
      if (this.t.s==s) {
        shift()
      } else {
        throw error('`'+s+'` expected but `'+this.t.s+'` found')
      }
    } else {
      throw error('`'+s+'` expected but end of stream found')
    }
  }

  this.try_skip = function(s) {
    if (this.t && this.t.s==s) {
      shift(); return true
    } else {
      return false
    }
  }
  this.trySkip = this.try_skip

  this.skip_sp = this.skipSp = function() {
    while (self.t && is_sp(self.t)) shift()
  }

  this.skip_ws = this.skipWs = function() {
    while (self.t && is_ws(self.t)) shift()
  }

  /*this.skipCmnt = function() {
    while (self.t && is_cmnt(self.t)) shift()
  }*/

  this.at_id = fun()
    ret is_id(self.t)

  this.id = function() {
    if (is_id(self.t)) {
      return shift().s
    } else {
      throw error('id expected but '+ttToString(self.t.t)+' "'+self.s+'" saw')
    }
  }

  this.at_line_start = function() {
    return is_sol(this.t)
  }
  this.atLineStart = this.at_line_start

  this.until = function(s) {
    let str = ''
    while (self.t && self.t.s != s) str += shift().s
    return str
  }

  function format_message(message) {
    var fn = self.t ? self.t.fn : t0 ? t0.fn : 'unknown'
    var ln = self.t ? self.t.ln : t0 ? t0.ln+'(?)' : '???'
    var line = self.t ? self.t.line.s : t0 ? t0.line.s : 'no source available'
    var fullMessage = fn+':'+ln+' '+message+'\n'
    //if (ln>0 && ln<=lines.length) {
      //var line = lines[ln-1]
    fullMessage += line
    //}
    return fullMessage
  }

  var warn = this.warn = function(message) {
    console.log('WARN '+format_message(message))
  }

  var error = this.error = function(message) {
    return new Error(format_message(message))
  }

  if (n > 0) { self.t  = toks[0]; self.s  = self.t.s  }
  if (n > 1) { self.t2 = toks[1]; self.s2 = self.t2.s }
  if (n > 2) { self.t3 = toks[2]; self.s3 = self.t3.s }
}
