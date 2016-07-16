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
  log(k, e)
})

log('cush client code loaded')
