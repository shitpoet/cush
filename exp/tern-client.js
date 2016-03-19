"use strong"

let fs = require('fs')
let glob = require("glob")
let tern = require('tern')

let port = 6457

let server = new tern.Server({
  //defs: defs(config.libs),
  //plugins: config.plugins,
  projectDir: '/home/ors/lab/cush'
});

let files = glob.sync("*.js")
for (let file of files) {
  console.log(file)
  server.addFile(file, fs.readFileSync(file, 'utf8'))
}

function getDefinition(file, end) {
  let def = null
  server.request({query: {
    type: "definition", end, file
  }}, function (err, response) {
    if (err) {
      console.log({err})
    } else {
      def = response
    }
  })
  return def
}

console.log(getDefinition('m2.js', {line:2,ch:0}))

//})



/*

global.server = server

let repl = require("repl")
let r = repl.start({useGlobal: true})
r.on('exit', function() { process.exit() });
*/
