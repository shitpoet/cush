var KC_LEFT = 37
var KC_RIGHT = 39
var KC_ESC = 27

on(window, 'keydown', fun(e){
  var k = e.keyCode
  if e.altKey && k=='B'.charCodeAt(0)
    var name = prompt()
    log(name)
    if name
      document.location.href = '/'+name
  elif e.altKey && k=='O'.charCodeAt(0)
    window.open('#', '', 'titlebar=no,toolbar=no,location=no,locationbar=no,menubar=no,personalbar=no,status=no')
  log(k, e)
})

log('cush client code loaded')
