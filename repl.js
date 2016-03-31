repl = require("repl")
r = repl.start({useGlobal: true})
r.on('exit', function() { process.exit() });

/*net.createServer(function (socket) {
  repl.start({
    prompt: 'Node.js via TCP socket> ',
    input: socket,
    output: socket,
    useGlobal: true
  }).on('exit', function() {
    socket.end();
  });
}).listen(5001);*/
//r = repl.start({useGlobal: true})
/*r.context.fw = fw
r.context.db = fw.db
r.context.models = fw.models
r.context.all = fw.all
r.context.listDocs = function() {
  all.find().each(function(err,doc){
    console.log(doc)
  })
}
r.context.removeAllDocs = function() {
  //all.findAndModify({}, [], {remove:true}, function(err,obj){} )
  all.remove({})
}
r.context.g = global
r.context.t = this*/
