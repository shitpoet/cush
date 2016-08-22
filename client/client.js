var KC_LEFT = 37
var KC_RIGHT = 39
var KC_ESC = 27

on(window, 'keydown', function(e){
  var k = e.keyCode
  if(e.altKey && k=='B'.charCodeAt(0)) {
    var name = prompt()
    log(name)
    if(name) {
      document.location.href = '/'+name } }
  else if(e.altKey && k=='O'.charCodeAt(0)) {
    window.open('#', '', {toolbar:false}) }
  log(k, e)
})

log('cush client code loaded')
