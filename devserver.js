/*

  dev server

  starts normal server
  handles reloads, patches, sending errors etc

*/

var chokidar = require('chokidar')
require('./include')('server')
include('pipeline')
include('prefix')

let sio = null

var lastServerErrors = {
}

function send_error(source, e) {
  sio.sockets.emit('error', {source: source, error: e})
}

fun setLastServerError(source, e)
  let errs = lastServerErrors
  if errs[source] != e
    errs[source] = e
    send_error(source, e)

export let devServer = {
  listen: function(opts) {
    if opts.autoprefix
      pipeline.add_post('stl', autoprefix_css)

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
      // resend erros on new connection
      for (var errorSource in lastServerErrors) {
        var e = lastServerErrors[errorSource]
        if e
          log('send error for '+errorSource)
          send_error(errorSource, e)
        //lastServerErrors[errorSource] = null
      }
    });

    if (!opts.phpMode) {

      chokidar.watch([
        __dirname+'/*.js', //buggy: causes generation of unlinkDir and bugs with on 'all' events listener
        '*.tpl','*.stl','css/*.stl',
        '*.js','*.json','js/*.js'
      ]).on('change', function(path) {
        var event = 'change'
        //if (event!='add' && event!='unlinkDir') {
          console.log('watcher: '+event, path)
          if (path.endsWith('.js')) {
            log('reload js')
            pipeline.clearCache()
            sio.sockets.emit('reload')
          } else if (path.startsWith(__dirname)) { // cush itself
            //log('restart')
            //process.exit(5)
            sio.sockets.emit('reload')
          } else if (path.endsWith('.tpl')) {
            if (path.startsWith('_')) {
              log('partial template - clear cache') //tofix
              pipeline.clearCache()
            }
            sio.sockets.emit('reload')
          } else if (path.endsWith('.stl')) {
            if (path.split('/').pop().startsWith('_')) {
              log('partial style - clear cache') //tofix
              pipeline.clearCache()
              // reload main style sheet
              sio.sockets.emit('reload style', 'css/style.css')
            } else {
              sio.sockets.emit('reload style', path.replace('.stl','.css'))
            }
          } else if (path.endsWith('cush.json')) {
            log('reload json')
            projectJson = eval('('+fs.readFileSync('cush.json','utf8')+')')
            styleVars = projectJson.variables
            templateVars = styleVars
            sio.sockets.emit('reload')
          } else {
            log('unk watched resource changed: '+path)
            sio.sockets.emit('reload')
          }
        //}
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
