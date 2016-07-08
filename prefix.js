var postcss = require('postcss')
var autoprefixer = require('autoprefixer')

export fun autoprefix_css(str)
  log('apply autoprefix')
  time('autoprefix')
  var pc = postcss([
    //require('postcss-rgba-hex'),
    autoprefixer({
      browsers: ['last 2 versions', 'ios 5', 'android >= 4.1']
    })
    /*autoprefixer({
      browsers: ['last 2 versions', 'ios 5', 'android >= 2.2', 'ie 8', 'ie 9']
    })*/
  ])
  fs.writeFile('/tmp/1.css', str)
  let prefixed = pc.process(str).css
  fs.writeFile('/tmp/2.css', prefixed)
  return prefixed
  /*pc.process(str).then(function(result) {
    timeEnd('autoprefix')
    return result.css
  }, function(error) {
    throw new Error(error.toString())
  })*/
