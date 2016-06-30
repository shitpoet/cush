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
  return pc.process(str).css
  /*pc.process(str).then(function(result) {
    timeEnd('autoprefix')
    return result.css
  }, function(error) {
    throw new Error(error.toString())
  })*/
