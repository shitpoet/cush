// dev server
// start normal server
// activate dev extensions
/*
const http = require('http')*/
const chokidar = require('chokidar')
include('server')
include('pipeline')
/*include('prefix')*/

export let sio = null
let sio_port = 33330 //projectInfo.port*10

var lastServerErrors = {}

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
    /*
    if opts.autoprefix
      pipeline.add_post('stl', autoprefix_css)
    */

    if opts.live-reload
      sio = require('socket.io')(sio_port)

    opts.onSetLastError = setLastServerError

    server.listen(opts)


    if opts.live_reload
      sio.on('connection', function (socket) {
        log('io connection')
        // set opts
        sio.sockets.emit('opts', opts)
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

    chokidar.watch([
      __dirname+'/*.js', //buggy: causes generation of unlinkDir and bugs with on 'all' events listener
      __dirname+'/client/*.ws', //buggy: causes generation of unlinkDir and bugs with on 'all' events listener
      '*.tpl','*.stl','css/*.stl',
      '*.js','*.json','js/*.js',
      'js/*.ws'
    ]).on('change', function(path) {
      var event = 'change'
      //if (event!='add' && event!='unlinkDir') {
      console.log('watcher: '+event, path)
      if path.endsWith('.js')
        log('reload js')
        pipeline.clearCache()
        sio.sockets.emit('reload')
      elif path.endsWith('.ws')
        log('reload ws '+path)
        // expand site scripts (for deploying)
        // keep cush scripts compact (for debbuging)
        let expand = !opts.live_reload && path.indexOf(__dirname) != 0
        let js_path = path.replace(/\.ws$/, '.js')
        fs.writeFileSync(js_path, read_and_curlify(path, expand))
        rebuild_client_code()
        sio.sockets.emit('reload')
      else if (path.startsWith(__dirname)) { // cush itself
        //log('restart')
        //process.exit(5)
        sio.sockets.emit('reload')
      } else if (path.endsWith('.tpl')) {
        if opts.php_mode
          // produce php

          touch_url('localhost', opts.port, '/' + path.split('.tpl')[0])

        elif path.startsWith('_')
          log('partial template - clear root tpl cache') //tofix: add dependencies or make something to do clearing of the cache smarter
          pipeline.clear_root_templates()
          sio.sockets.emit('reload')
        else
          sio.sockets.emit('reload html',
            path.split('/').pop().split('.')[0]
          )
      } else if (path.endsWith('.stl')) {

        let css_path = path.replace('.stl','.css')
        if opts.php_mode
          pipeline.clear_root_styles()
          touch_url('localhost', opts.port, '/css/style.css')
        else
          if path.split('/').pop().startsWith('_')
            log('partial style - clear cache') //tofix
            pipeline.clear_root_styles()
            // reload main style sheet
            sio.sockets.emit('reload style', 'css/style.css')
          else
            sio.sockets.emit('reload style', css_path)

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
    });

    include('repl')
  }
}
