// parse command line and run tasks

require('./include')('common devserver')
//var devServer = require('./devserver.js')
//import {devServer} from './devserver.js'

var argv = process.argv.slice(2)

if (argv.length == 1 && (argv[0]=='-h' || argv[0]=='--help')) {
  log('usage: cli port ap r')
} else {
  var serverOpts = {
    port: 8888
  }
  for (var i = 0; i < argv.length; i++) {
    var num = parseInt(argv[i])
    if (num==argv[i]) {
      serverOpts.port = num
      break
    }
  }
  serverOpts.liveReload = argv.indexOf('r')>=0
  serverOpts.autoprefix = argv.indexOf('ap')>=0
  serverOpts.phpMode = argv.indexOf('php')>=0
  if (serverOpts.liveReload) log('live reloading')
  if (serverOpts.autoprefix) log('autoprefixing')
  if (serverOpts.phpMode) log('php mode')
  devServer.listen(serverOpts)
}
