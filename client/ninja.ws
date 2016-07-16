/* polyfills */

if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s)
      var i = matches.length
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1
    }
}

if (typeof Element.prototype.closest !== 'function') {
	Element.prototype.closest = function closest(selector) {
		var element = this;
		while (element && element.nodeType === 1) {
			if (element.matches(selector)) { return element }
			element = element.parentNode
		}
		return null
	}
}

if (!String.prototype.repeat) {
  String.prototype.repeat = function(count) {
    if (this == null) {
      throw new TypeError('can\'t convert ' + this + ' to object');
    }
    var str = '' + this;
    count = +count;
    if (count != count) {
      count = 0;
    }
    if (count < 0) {
      throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
      throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length == 0 || count == 0) {
      return '';
    }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the
    // main part. But anyway, most current (August 2014) browsers can't handle
    // strings 1 << 28 chars or longer, so:
    if (str.length * count >= 1 << 28) {
      throw new RangeError('repeat count must not overflow maximum string size');
    }
    var rpt = '';
    for (;;) {
      if ((count & 1) == 1) {
        rpt += str;
      }
      count >>>= 1;
      if (count == 0) {
        break;
      }
      str += str;
    }
    // Could we try:
    // return Array(count + 1).join(this);
    return rpt;
  }
}

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

/* utils */

if (!console || !console.log) console = { log: function(){} }
var log = console.log.bind(console)

fun atoa(x) { ret Array.prototype.slice.call(x) }

fun lpad(s, w, ch)
  ch = ch || ' '
  s = String(s)
  var n = s.length
  var m = w - n
  if m > 0
    s = ch.repeat(m) + s
  ret s

// offaxed selector
function __qs_sel(s) {
  var tags = ' * a abbr address article aside audio b body br blockquote button canvas caption code details dfn div dd dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 hr head header hgroup html i iframe img input label li link main mark meta meter nav ol optgroup option output p picture pre progress q samp script section select source span strong style sub summary sup textarea table td th thead title tr u ul video '
  if (s.indexOf('.')!=0 && s.indexOf('#')!=0) {
    var ss = s.match(/^\w+/)
    if (ss!=null && tags.indexOf(' '+ss[0]+' ')<0) {
      //log('add dot to '+s)
      return '.'+s
    }
  }
  return s
}

function qs(a,b) {
  if (typeof b == 'undefined')
    return document.querySelector(__qs_sel(a))
  else
    return a.querySelector(__qs_sel(b))
}

function qsa(a,b) {
  var els
  if (typeof b == 'undefined')
    els = document.querySelectorAll(__qs_sel(a))
  else
    els = a.querySelectorAll(__qs_sel(b))
  return Array.prototype.slice.call(els)
}

fun __decorate(f) {
  fun ff(el,a,b,c) {
    if typeof el == 'string'
      ff(qsa(el),a,b,c)
    elif Array.isArray(el)
      el.forEach(fun(el1){
        ff(el1,a,b,c)
      })
    elif Array.isArray(a)
      a.forEach(fun(a1){
        f(el,a1,b,c)
      })
    else
      ret f(el,a,b,c)
  }
  return ff
}

var on = __decorate(fun(el,name,cb) {
  /*if (Array.isArray(el)) {
    el.forEach(function(el1){
      on(el1,name,cb)
    })
  } else if (typeof el == 'string') {
    on(qs(el),name,cb)
  } else if (Array.isArray(name)) {
    name.forEach(function(name1){
      on(el,name1,cb)
    })
  } else {*/
  if (!cb.__on_wrap) {
    cb.__on_wrap = function(e) {
      e = e || window.event // ie8
      var result = cb.apply(this, [e])
      if (result === false) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }
  return el.addEventListener(name, cb.__on_wrap)
  //}
})

fun onclick(el,cb) { ret on(el,'click',cb) }

//function off(el,name,cb) {
var off = __decorate(fun(el,name,cb) {
  /*if (Array.isArray(el)) {
    el.forEach(function(el1){
      off(el1,name,cb)
    })
  } else if (typeof el == 'string') {
    on(qs(el),name,cb)
  } else if (Array.isArray(name)) {
    name.forEach(function(name1){
      off(el,name1,cb)
    })
  } else {*/
  if ('__on_wrap' in cb) cb = cb.__on_wrap
  return el.removeEventListener(name,cb)
  //}
})

function toCamelCase(variable) {
  return variable.replace(/-([a-z])/g, function(str, letter) {
    return letter.toUpperCase()
  })
}

function css(el,name,value) {
  if (typeof value == 'undefined') { // get
    return window.getComputedStyle(el, null).getPropertyValue(name)
  } else { // set
    el.style[toCamelCase(name)] = value
  }
}

function attr(el, name, value) {
  if (typeof value == 'undefined') { // get
    return el.getAttribute(name)
  } else { // set
    return ($(el).attr(name, value))
  }
}

function data(el,name) {
  if (typeof name == 'array') { // multiple
    var arr = name;
    var hash = {}
    for (var i = 0; i < arr.length; i++)
      hash[arr[i]] = attr(el, 'data-'+arr[i])
  } else { // single
    return attr(el, 'data-'+name)
  }
}

fun html(el, str)
  if typeof str == 'undefined'
    ret el.innerHTML
  else
    el.innerHTML = str

function hasClass(el, name) {
  if (el.classList)
    return el.classList.contains(name)
  else // ie8+
    return (new RegExp('(^| )' + name + '( |$)', 'gi').test(el.className))
}

function undot(name) {
  if (name.startsWith('.')) name = name.slice(1)
  return name
}

function addClass(el, name) {
  if (!hasClass(el, name)) {
    name = undot(name)
    if (el.classList)
      el.classList.add(name);
    else //ie8+
      el.className += ' ' + name;
  }
}

function removeClass(el, name) {
  if (hasClass(el, name)) {
    name = undot(name)
    if (el.classList)
      el.classList.remove(name);
    else //ie8+
      el.className = el.className.replace(new RegExp('(^|\\b)' + name.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
  }
}

function toggleClass(el, name, force) {
  name = undot(name)
  if (typeof force == 'undefined') {
    if (hasClass(el)) removeClass(el, name); else addClass(el, name)
  } else {
    if (force) addClass(el, name); else removeClass(el, name)
  }
}

function _getMainClass(el) {
  //if el && el.classList.length > 0
  return Array.prototype.slice.call(el.classList)[0]
  //else
}

// bem css naming convention
var elSep = '__'
var modSep = '--'

// add bem modifier in 'block__element--modifier' style
function addMod(el, name) {
  if (Array.isArray(el)) {
    el.forEach(function(el1){
      addMod(el1, name)
    })
  } else {
    var blockName = _getMainClass(el)
    addClass(el, blockName+modSep+name)
  }
}

// remove bem modifier
function removeMod(el, name) {
  if (Array.isArray(el)) {
    el.forEach(function(el1){
      removeMod(el1, name)
    })
  } else {
    var blockName = _getMainClass(el)
    removeClass(el, blockName+modSep+name)
  }
}

function hasMod(el, name) {
  var blockName = _getMainClass(el)
  var modClass = blockName+modSep+name
  return hasClass(el, modClass)
}

function toggleMod(el, name, force) {
  //log('force',name,force)
  if (typeof force == 'undefined')
    if (hasMod(el,name)) removeMod(el, name); else addMod(el, name)
  else
    if (force) addMod(el, name); else removeMod(el, name)
}

fun ready(cb)
  if document.readyState !== "loading"
    cb()
  else
    document.addEventListener("DOMContentLoaded", cb)

function getPageXY(el) {
  var box = el.getBoundingClientRect()
  var body = document.body
  var docElem = document.documentElement
  var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
  var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft
  // ie fix
  var clientTop = docElem.clientTop || body.clientTop || 0
  var clientLeft = docElem.clientLeft || body.clientLeft || 0
  // calc
  var top  = box.top +  scrollTop - clientTop
  var left = box.left + scrollLeft - clientLeft
  return { x: Math.round(left), y: Math.round(top) }
}
