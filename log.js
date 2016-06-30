var colors = require('colors/safe');

let logging = {
  'pipeline': true,
  'devserver': {
    log: ' ',
    //ignore: ''
  },
  log: {
    log: false
  }
}

export function get_stack() {
  var origPrepareStackTrace = Error.prepareStackTrace
  Error.prepareStackTrace = function (_, stack) {
    return stack   // just return `stack`
  }
  var err = new Error()
  var stack = err.stack
  Error.prepareStackTrace = origPrepareStackTrace
  stack.shift()
  return stack
}

fun get_caller_module_fn()
  let stack = get_stack()
  //stack.shift()
  //stack.shift()
  ret stack[3].getFileName()

fun get_file_name(path)
  ret path.split('/').pop()

fun wo_ext(fn)
  ret fn.split('.').shift()

fun get_caller_module_name()
  ret wo_ext(get_file_name(get_caller_module_fn()))

let max_mn_len = 0

fun lpad(s, w)
  let n = s.length
  let m = w - n
  if m > 0
    s = ' '.repeat(m) + s
  ret s

fun rpad(s, w)
  let n = s.length
  let m = w - n
  if m > 0
    s = s + ' '.repeat(m)
  ret s

/*log('get_stack')
time('get_stack')
for (let gs = 0; gs < 1000; gs++)
  getStack()
timeEnd('get_stack')*/

export fun log(...args)
  //if typeof logging == 'undefined' || logging
  let mn = get_caller_module_name()
  if mn.length > max_mn_len { max_mn_len = mn.length }
  //console.log(logging[mn])
  if (mn in logging && (
    logging[mn]===true || (
      typeof logging[mn] == 'object' && (
        logging[mn].log===true ||
        (args.join(' ').indexOf(logging[mn].log) >= 0) &&
        (args.join(' ').indexOf(logging[mn].ignore) < 0)
      )
    )
  ) || !(mn in logging))
    //if !(mn in logging)) { mn += '*' } // what to do???
    args.unshift(colors.gray(rpad(mn, max_mn_len)))
    console.log(...args)

let l = log

export fun panic(...args)
  console.log(...args)
let err = panic
export fun time(...args)
  let mn = get_caller_module_name()
  if (mn in logging && (
    logging[mn]===true || (
      typeof logging[mn] == 'object' && (
        (
          logging[mn].log===true ||
          !('log' in logging[mn])
        ) && (
          !('time' in logging[mn]) ||
          logging[mn].time===true
        )
      )
    )
  ) || !(mn in logging))
    console.time(...args)
export fun timeEnd(...args)
  let mn = get_caller_module_name()
  if (mn in logging && (
    logging[mn]===true || (
      typeof logging[mn] == 'object' && (
        (
          logging[mn].log===true ||
          !('log' in logging[mn])
        ) && (
          !('time' in logging[mn]) ||
          logging[mn].time===true
        )
      )
    )
  ) || !(mn in logging))
    console.timeEnd(...args)

time('xxx')
timeEnd('xxx')
