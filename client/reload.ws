"use strict"

var hostname = document.location.toString().split('/')[2].split(':')[0]
console.log('hostname '+hostname)
var socket = io('http://'+hostname+':SIO_PORT')
//var socket = io('http://localhost:SIO_PORT')

var cssVer = 0

var cush_opts = {}

function getScrollTop() {
  return document.documentElement.scrollTop || document.body.scrollTop
}
function setScrollTop(y) {
  //document.documentElement.scrollTop = document.body.scrollTop = y
  window.scrollTo(0,y)
}

fun full_reload()
  document.location.reload()

function executeScriptNode(node) {
  var parent = node.parentElement, d = document.createElement('script')
  d.async = node.async
  d.src = node.src
  parent.insertBefore(d,node)
  parent.removeChild(node)
}

// execute script tags in code added through innerHTML
function executeScripts(wrap) {
  var s = wrap.getElementsByTagName('script')
  for (var i = 0; i < s.length ; i++) {
    if s[i].src.indexOf('RELOAD.js') < 0
      executeScriptNode(s[i])
  }
}

fun reload_html(name) {
  var href = document.location.href
  var page = href.split(/[\/#\?]/).pop().split('.').shift()
  if (page=='') page = 'index'
  console.log({page, name})
  if name==page // reload html only w/o resources
    fetch(page).then(fun(r){
      r.text().then(fun(text){
        //console.log(text)
        document.querySelector('html').innerHTML = text
        executeScripts(document)
        //todo: handle the case script links were added/removed
      })
    })
  else // full reload
    full_reload()
}

function reloadStyle(path) {
  var head = document.getElementsByTagName('head')[0]
  var styles = document.getElementsByTagName('link')
  var style1, ref1
  for (var i = 0; i < styles.length; i++) {
    var style = styles[i]
    var ref = style.href
    //if (style.rel=='stylesheet' && ref.indexOf('style.css')>=0) {
    if (style.rel=='stylesheet' && ref.indexOf(path)>=0) {
      ref1 = ref
      style1 = styles[i]
      break
    }
  }
  var style2 = document.createElement("link")
  var scrollPos = getScrollTop()
  var body = document.body
  body.style['min-height'] = (scrollPos+1000)+'px'
  console.log(ref)
  style2.rel = 'stylesheet'
  //style2.href = 'http://localhost:8888/style.css?'+(cssVer++)
  ref = ref.split('__')[0]
  style2.href = ref+'__v'+(Math.round(Math.random()*1000000000))
  //style2.href = 'http://localhost:8888/style.css?v'+(Math.round(Math.random()*1000000000))
  //head.replaceChild(style2, style1)

  head.appendChild(style2)
  var h = document.body.offsetHeight // trigger reflow - update styles
  //setTimeout(function(){
  head.removeChild(style1)
  var h2 = document.body.offsetHeight // trigger reflow - update styles
    /*setScrollTop(scrollPos)
  }, 200)*/

  /*setTimeout( function() {

  }, 500)*/

  //body.style['min-height'] = null

  return h+h2
}

socket.on('connect', function(){
  console.log('sio connect')
});
socket.on('event', function(data){
  console.log('sio event')
});
socket.on('disconnect', function(){
  console.log('sio disconnect')
});
socket.on('opts', function(data){
  console.log('sio opts', data)
  cush_opts = data
})
socket.on('reload', function(data){
  console.log('sio reload')
  document.location.reload()
})
socket.on('reload html', function(data){
  console.log('sio reload html')
  reload_html(data)
})
socket.on('reload style', function(data){
  console.log('sio reload style '+data)
  reloadStyle(data)
})

var serverErrors = {}

socket.on('error', function(data){
  //console.log('error on request '+data.url)
  console.error('server error', data)
  //alert(data.url+'\n\n'+data.message)
  //alert(data)
  var source = data.source
  var message = data.error
  var body = document.body
  if (message!==null) {
    if (serverErrors[source])
      serverErrors[source].el.remove()
    var errorEl = document.createElement('div')
    errorEl.style.position = 'fixed'
    errorEl.style.zIndex = '9999999'
    errorEl.style.left = '0'
    errorEl.style.top = '0'
    errorEl.style.right = '0'
    errorEl.style.bottom = '0'
    errorEl.style.padding = '10px'
    errorEl.style.background = 'white'
    errorEl.style.opacity = '.9'
    errorEl.innerHTML = '<xmp>'+message+'\n</xmp>'
    errorEl.onclick = function(){
      body.removeChild(errorEl)
      serverErrors[source] = null
    }
    body.appendChild(errorEl)
    serverErrors[source] = {message: message, el: errorEl}
  } else {
    if (serverErrors[source]) {
      //body.removeChild(serverErrors[source].el)
      serverErrors[source].el.remove()
      serverErrors[source] = null
    }
  }
})
