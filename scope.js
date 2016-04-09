export function SourceScope(__skip) {
//function SourceScope(__skip) {
  var _objects = []
  var _skip = __skip || false

  this.push = function(scope) {
    _objects.push(scope)
  }
  this.pop = function(scope) {
    if (typeof scope != 'undefined') {
      if (_objects.last() !== scope) {
        log('scope to pop: ', scope)
        log('scope stack:')
        this.dump()
        throw new Error('unbalanced scope managment')
      }
    }
    return _objects.pop()
  }
  //tofix: slow
  this.get = function(name) {
    for (var i = _objects.length-1; i >= 0; i--) {
      if (name in _objects[i]) return _objects[i][name]
    }
    return null
  }
  this.evalExpr = function(_expr) {
    if (!_skip && _expr!='') {
      // variables are prefixed because
      // they are in scope of eval function
      //var s = 'try {', e = ''
      var _s = '', _e = ''
      //log('eval "'+expr+'" in contexts:')
      for (var _i = 0; _i < _objects.length; _i++)  {
        _s += "with(_objects["+_i+"]){"
        _e += "}"
      }
      //e += "}catch(e){}"
      //this.dump()
      //log(_s+'(  '+_expr+'  )'+_e)
      var _val =  eval(_s+'(  '+_expr+'  )'+_e)
      //log('result: '+val)
      return _val
    } else {
      return null
    }
  }
  this.dump = function() { log(_objects) }

  // internal
  this.getInternalStack = function() {
    return _objects
  }
  this.setInternalStack = function(__objects) {
    _objects = __objects
  }

  this.clone = function(opts) {
    var newScope = new SourceScope(opts)
    newScope.setInternalStack(this.getInternalStack())
    return newScope
  }

  var _skipping = __skip ? this : this.clone(true)

  this.skipping = function(skip) {
    if (skip) {
      return _skipping
    } else {
      return this
    }
  }
}

//module.exports = SourceScope
