/*

  usage:

  var include = require('/include')
  include('file1 file2 file3')
  include('file4', true) // with auto reloading on change

*/

var fs = require('fs')
var vm = require('vm')
var chokidar = require('chokidar') // for hot reloading

var cache = {}

var include = module.exports = function(names, hot) {
  names = names.split(' ')
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    if (!cache[name]) {
      global.require = require
      global.exports = module.exports
      global.__dirname = __dirname
      var includeInThisContext = function(path) {
        var code = fs.readFileSync(path);
        vm.runInThisContext(code, path);
      }.bind(this)
      var fn = __dirname+"/"+name+".js"
      includeInThisContext(fn)
      if (hot) {
        chokidar.watch(fn).on('change', function(path) {
          console.log('change')
          include(name)
        })
      }
      cache[name] = true
    }
  }
}

