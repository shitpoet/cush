/*

  dev server

  starts normal server
  handles reloads, patches, sending errors etc

*/

var chokidar = require('chokidar')
require('./include')('server')

let sio = null

var lastServerErrors = {
}

function sendError(source, e) {
  sio.sockets.emit('error', {source: source, error: e})
}

function setLastServerError(source, e) {
  lastServerErrors[source] = e
  sendError(source, e)
}

export let devServer = {
  listen: function(opts) {
    sio = require('socket.io')(opts.port+1)

    opts.onSetLastError = setLastServerError

    server.listen(opts)

    sio.on('connection', function (socket) {
      log('io connection')
      // when the client emits 'new message', this listens and executes
      socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        log('new msg')
        socket.broadcast.emit('new message', {
          //username: socket.username,
          message: data
        });
      });
      for (var errorSource in lastServerErrors) {
        var e = lastServerErrors[errorSource]
        sendError(errorSource, e)
        lastServerErrors[errorSource] = null
      }
    });

    if (!opts.phpMode) {

      chokidar.watch([
        __dirname+'/*.js', //buggy: causes generation of unlinkDir and bugs with on 'all' events listener
        '*.tpl','*.stl','css/*.stl',
        '*.js','*.json','js/*.js'
      ]).on('change', function(path) {
        var event = 'change'
        console.log(event, path);
        if (event!='add' && event!='unlinkDir') {
          if (path.startsWith(__dirname)) {
            //log('restart')
            //process.exit(5)
            sio.sockets.emit('reload')
          } else if (path.endsWith('.stl')) {
            sio.sockets.emit('reload style')
          } else if (path.endsWith('cush.json')) {
            log('reload json')
            projectJson = eval('('+fs.readFileSync('cush.json','utf8')+')')
            styleVars = projectJson.variables
            templateVars = styleVars
            sio.sockets.emit('reload')
          } else {
            sio.sockets.emit('reload')
          }
        }
      });

    } else { // php mode

      log('php mode watch')

      chokidar.watch([
        '**/*.php',
        __dirname+'/*.js', //buggy: causes generation of unlinkDir and bugs with on 'all' events listener
        '*.tpl','*.stl','css/*.stl',
        '*.js','*.json','js/*.js'
      ]).on('change', function(path) {
        var event = 'change'
        console.log(event, path);
        if (event!='add' && event!='unlinkDir') {
          if (path.startsWith(__dirname)) {
            //log('restart')
            //process.exit(5)
            sio.sockets.emit('reload')
          } else if (path.endsWith('.stl')) {
            sio.sockets.emit('reload style')
          } else if (path.endsWith('.tpl')) {
            //sio.sockets.emit('reload style')

            //response.respond(opts)(


            //tofix: shit code make request to render tpl to php
            log('tofix: shit code make request to render tpl to php')

            var http = require('http');

            //The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
            var options = {
              host: 'localhost',
              port: 8888,
              path: '/' + path.split('.tpl')[0]
            };

            callback = function(response) {
              var str = '';

              //another chunk of data has been recieved, so append it to `str`
              response.on('data', function (chunk) {
                //str += chunk;
              });

              //the whole response has been recieved, so we just print it out here
              response.on('end', function () {

                console.log('shit rerender request', str);
              });
            }

            http.request(options, callback).end();

          } else if (path.endsWith('cush.json')) {
            log('reload json')
            projectJson = eval('('+fs.readFileSync('cush.json','utf8')+')')
            styleVars = projectJson.variables
            templateVars = styleVars
            sio.sockets.emit('reload')
          } else {
            sio.sockets.emit('reload')
          }
        }
      });

    }

    include('repl')
  }
}
