export let responders = []

export fun add-responder(r)
  //log-call()
  responders.push( r )

let dir = __dirname+'/responders'
let fns = fs.readdir-sync(dir)
for fn of fns
  if fn.ends-with('.ws')
    let resp = use(dir+'/'+fn).responder
    if resp
      add-responder(resp)
    else
      warn('bad responder module '+fn)


