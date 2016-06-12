let ffi = require('ffi')

let libcrab = ffi.Library('~/lab/crab/libcrab.so', {
  'read_and_rewrite': [ 'string', [ 'string' ] ]
})

export fun read_and_curlify(fn) {
  return libcrab.read_and_rewrite(fn)
}
