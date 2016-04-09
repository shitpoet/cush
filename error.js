let util = require('util')
let Module = require('module')
let fs = require('fs')
let path = require('path')

process.on('uncaughtException', (e) => {

  function output_source_line(fn,ln,col) {
    //console.log(fn+':'+ln)
    let dirname = path.dirname(fn)
    let name = path.basename(fn)
    console.log(dirname+'/\x1b[01;39m'+name+'\x1b[00;39m:'+ln)
    console.log(fs.readFileSync(fn,'utf8').split('\n')[ln-1])
    console.log(' '.repeat(col-1) + '^\n')
  }

  log('')
  let stack = e.stack
  if (typeof stack != typeof void 0) {

    let ss = stack.split('\n')
    ss = ss.filter( s=>s.trim().startsWith('at '))
    //let fn,ln,col
    //log(ss)
    let last_frames = Math.min(ss.length, 2)
    for (let frame = 0; frame < last_frames; frame++) {
      let s =  ss[frame].trim().split(' ').pop()
      if (s.startsWith('(')) s = s.slice(1,-1)
      let [fn,ln,col] = s.split(':')
      //if (fn!='native') {
      try {
        fn = require.resolve(fn)
        output_source_line(fn,ln,col)
      } catch(_) {
      }
      //if (fs.existsSync(fn)) output_source_line(fn,ln,col)
    }

    console.log(stack)
  } else {
    console.log(e)
  }
  process.exit()
});


