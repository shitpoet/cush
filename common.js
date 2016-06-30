export let util = require('util')

// make include function accessible to included modules
// without explicit call to require
// it works because all vars from included modules are
// accessible package-wise (?)
var include = require('./include')

export let assert = console.assert.bind(console)
//export let log = console.log.bind(console)

/*function log_call() {
  var caller = log_call.caller
  var args = [].slice.call(caller.arguments, 0)
  log(caller.name+'('+args.join(', ')+')')
}

global.log_call = log_call*/

export function getFile(fn) {
  return fs.readFileSync(fn,'utf8')
}
export let get_file = getFile

export function exists(fn) {
  return fs.existsSync(fn)
}

/*function putFile(fn, s) {
  fs.writeFileSync(fn, s)
}

if (!Array.prototype.last){
  Array.prototype.last = function(){
    return this[this.length - 1];
  };
};
*/

Object.defineProperty(String.prototype, 'len', {
  get: fun()
    ret this.length
});

if !Array.prototype.first
  Object.defineProperty(Array.prototype, 'first', {
    get: fun()
      ret this[0]
  });

if !Array.prototype.last
  Object.defineProperty(Array.prototype, 'last', {
    get: fun()
      ret this[this.length - 1]
  });

Object.defineProperty(Array.prototype, 'len', {
  get: fun()
    ret this.length
});

/*export fun is_undefined(x)
  return typeof x === 'undefined'*/

include('log')
