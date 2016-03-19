let fs = require('fs')
var http = require('http')
//var response = hotload('./response.js')

export let server = {

  listen = function(opts){
    var server = http.createServer(response.respond(opts))

    /*function pluralize(name) {
      return name.toLowerCase() + 's'
    }*/

    server.listen(opts.port)
    log('listening')
  }
}
