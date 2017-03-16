// boostrap module
// parse command line, load project config and run

const fs = require('fs')
let caught = require('caught')
caught.opts.exitCode = 8
global.handleError = caught.handleError
require('slowmod')
use({fatal: true, restart:true})
include('log')
include('ubiq')
include('core/common')
include('server/devserver')
include('core/project')

let argv = process.argv.slice(2)

if (argv.length == 1 && (argv[0]=='-h' || argv[0]=='--help')) {
  log('usage: cli r ap php wp')
} else {
  let serverOpts = {
    port: parseInt(project.port)
  }
  /*for (var i = 0; i < argv.length; i++) {
    var num = parseInt(argv[i])
    if (num==argv[i]) {
      serverOpts.port = num
      break
    }
  }*/
  serverOpts.liveReload = argv.indexOf('r')>=0
  serverOpts.autoprefix = argv.indexOf('ap')>=0
  serverOpts.phpMode = argv.indexOf('php')>=0
  serverOpts.wpMode = argv.indexOf('wp')>=0
  if (serverOpts.liveReload) log('live reloading')
  if (serverOpts.autoprefix) log('autoprefixing')
  if (serverOpts.phpMode) log('php mode')
  if (serverOpts.wpMode) log('wp mode')
  devServer.listen(serverOpts)
}

