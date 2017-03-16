let ffi = require('ffi')

let libskim = ffi.Library('/home/ors/lab/skim/libskim.so', {
  'read_and_rewrite': [ 'string', [ 'string', 'bool' ] ]
})

export function read_and_curlify(fn, expand) {
  expand = expand || false
  return libskim.read_and_rewrite(fn, expand)
}
