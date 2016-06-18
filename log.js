fun log(...args)
  if typeof logging == 'undefined' || logging
    console.log(...args)
let l = log
fun panic(...args)
  console.log(...args)
let err = panic
fun time(...args)
  if typeof timing == 'undefined' || timing
    console.time(...args)
fun timeEnd(...args)
  if typeof timing == 'undefined' || timing
    console.timeEnd(...args)
