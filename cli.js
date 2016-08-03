// parse command line and run tasks

const fs = require('fs')
require('./include')('common devserver')
//var devServer = require('./devserver.js')
//import {devServer} from './devserver.js'

var argv = process.argv.slice(2)

if (argv.length == 1 && (argv[0]=='-h' || argv[0]=='--help')) {
  log('usage: cli r ap php')
} else {
  var serverOpts = {
    port: parseInt(projectInfo.port)
  }
  /*for (var i = 0; i < argv.length; i++) {
    var num = parseInt(argv[i])
    if (num==argv[i]) {
      serverOpts.port = num
      break
    }
  }*/
  serverOpts.live_reload = argv.indexOf('r')>=0
  serverOpts.autoprefix = argv.indexOf('ap')>=0
  serverOpts.php_mode = argv.indexOf('php')>=0
  if (serverOpts.live_reload) log('live reloading')
  if (serverOpts.autoprefix) log('autoprefixing')
  if (serverOpts.php_mode) log('php mode')
  devServer.listen(serverOpts)
}
