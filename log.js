function err(...args)
  console.log(...args)
function log(...args)
  if typeof logging == 'undefined' || logging
    console.log(...args)
function time(...args)
  if typeof timing == 'undefined' || timing
    console.time(...args)
function timeEnd(...args)
  if typeof timing == 'undefined' || timing
    console.timeEnd(...args)
