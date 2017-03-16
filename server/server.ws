// server module
// start an actual server
// forward requests to the response module

const http = require('http')
include('response')

export let server = {
  listen: function(opts){
    var server = http.createServer(respond(opts))
    server.listen(opts.port)
    log('listening')
  }
}
