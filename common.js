"use strict"

// make include function accessible to included modules
// without explicit call to require
// it works because all vars from included modules are
// accessible package-wise (?)
var include = require('./include')

var assert = console.assert.bind(console)
var log = console.log.bind(console)

/*function log_call() {
  var caller = log_call.caller
  var args = [].slice.call(caller.arguments, 0)
  log(caller.name+'('+args.join(', ')+')')
}

global.log_call = log_call

function getFile(fn) {
  return fs.readFileSync(fn,'utf8')
}

function exists(fn) {
  return fs.existsSync(fn)
}

function putFile(fn, s) {
  fs.writeFileSync(fn, s)
}

if (!Array.prototype.last){
  Array.prototype.last = function(){
    return this[this.length - 1];
  };
};
*/

