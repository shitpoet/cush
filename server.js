let fs = require('fs')
var http = require('http')
//var response = hotload('./response.js')
let include = require('./include')
include('response')

include(process.cwd()+'/cush')

export let server = {
  listen: function(opts){
    var server = http.createServer(respond(opts))

    /*function pluralize(name) {
      return name.toLowerCase() + 's'
    }*/

    server.listen(opts.port)
    log('listening')
  }
}
