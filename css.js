/*var argTypes = {
  'len':{}, // px pt em rem or %
  'num':{}, // unitless
  'url':{}, // url

  'border-style': {
    n: 'none',
    s: 'solid',
    d: 'dashed',
    g: 'groove',
    //dont remember other
  }, // solid dashed groove
  'font-family':{}
}*/

var baseArgTypes = {
  len: {},
  num: {},
  color: {},
  url: {},
  str: {},
  '%': {}
}

export let knownProps = {
  // a
  'align-items': {
    args: {
      type: 'enum',
      values: {
        stetch: {},
        center: {},
        'flex-start': {},
        'flex-end': {},
        baseline: {}
      },
      autoAlias: true
    },
    alias: 'ai'
  },
  'align-self': {
  },
  appearance: {
    alias: 'appear'
  },
  background: {
    alias: 'bg',
    hasColorArgs: true
  },
  'background-attachment': {
    alias: 'bga'
  },
  'background-image': {
    alias: 'bgi'
  },
  'background-clip': {
    alias: 'bgclip'
  },
  'background-color': {
    alias: 'bgc'
  },
  'background-position': {
    args: ['len','len'],
    alias: 'bgp'
  },
  'background-size': {
    alias: 'bgs'
  },
  border: {
    args: [
      'len',
      'border-style',
      'color'
    ],
    alias: 'b',
    trblAliases: true
  },
  'border-bottom-style': {
    args: 'border-style',
    alias: 'bbs'
  },
  'border-bottom-width': {
    args: 'len',
    alias: 'bbw'
  },
  'border-collapse': {
  },
  'border-color': {
    args: 'color'
  },
  'border-radius': {
    args: 'len',
    alias: 'rd'
  },
  'border-top-left-radius': {
    args: 'len len',
    alias: 'rdtl'
  },
  'border-top-right-radius': {
    args: 'len len',
    alias: 'rdtr'
  },
  'border-bottom-right-radius': {
    args: 'len len',
    alias: 'rdbr'
  },
  'border-bottom-left-radius': {
    args: 'len len',
    alias: 'rdbl'
  },
  'border-left-color': 'color',
  'border-left-style': 'border-style',
  'border-left-width': 'len',
  'border-style': {
    args: {
      type: 'enum',
      values: {
        hidden: {},
        dotted: {alias: 'dot'},
        dashed: {alias: 'dash'},
        solid: {alias: 's'},
        double: {},
        groove: {alias: 'g'},
        ridge: {},
        inset: {},
        outset: {}
      }
    }
  },
  'border-width': {
    args: 'len',
    alias: 'bw'
  },
  'box-sizing': {},
  'box-shadow': {
    args: [
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color',
      'len','len','len','color'
    ],
    varyArgs: true,
    alias: 'bsh'
  },
  bottom: {
    args: 'len',
    alias: 'bot'
  },
  'break-after': {},
  'break-inside': {},
  'caption-side': {
  },
  clear: {},
  color: {
    args: 'color',
    varyArgs: true, // fix bug with parsing of rgba(...)
    alias: 'c'
  },
  columns: {
  },
  'column-count': {
    args: 'num'
  },
  'column-rule': {
    args: ['len', 'border-style', 'color']
  },
  'column-width': {
    args: 'len'
  },
  content: {
    //args: 'str'
  },
  cursor: {
    args: {
      type: 'enum',
      values: {
        pointer: {alias: 'p'},
        'default': {alias: 'd'}
        /**/
      }
    },
    alias: 'cur'
  },
  display: {
    args: {
      type: 'enum',
      values: {
        none: {
          alias: 'n'
        },
        inline: {
          alias: 'i'
        },
        block: {
          alias: 'b'
        },
        'inline-block': {
          alias: 'ib'
        },
        table: { alias: 't' },
        'table-cell': { alias: 'c' },
        'table-row': { alias: 'r' },
        'table-header-group': {},
        'table-footer-group': {},
        'table-column': {},
        'table-column-group': {},
        'table-caption': {},
        flex: { alias: 'f' },
        'run-in': {},
      }
    },
    alias: 'd'
  },
  // e
  filter: {},
  flex: {
    args: 'num num len',
    alias: 'f'
  },
  'flex-basis': {
    alias: 'fb'
  },
  'flex-direction': {
    args: {
      type: 'enum',
      values: {
        row: {},
        'row-reverse': {},
        column: {},
        'column-reverse': {}
      }
    },
    alias: 'fd'
  },
  'flex-grow': {
  },
  'flex-shrink': {
  },
  'float': {
    args: {
      type: 'enum',
      values: {
        none:  { alias: 'n' },
        left:  { alias: 'l' },
        right: { alias: 'r' }
      }
    },
    alias: 'flo'
  },
  font: {},
  'font-family': {
    alias: 'ff'
  },
  'font-size': {
    args: 'len',
    alias: 'fs'
  },
  'font-style': {
    alias: 'fst',
  },
  'font-stretch': {},
  'font-weight': {
    alias: 'fw'
  },
  // g
  height: {
    args: 'len',
    alias: 'h'
  },
  // i
  'justify-content': {
    args: {
      type: 'enum',
      values: {
        'flex-start': {},
        'flex-end': {},
        'center': {},
        'space-between': {},
        'space-around': {}
      },
      autoAlias: true
    },
    alias: 'jc'
  },
  // k
  left: {
    args: 'len',
    alias: 'l'
  },
  'letter-spacing': {
    args: 'len'
  },
  'line-height': {
    alias: 'lh'
  },
  'list-style': {
    alias: 'ls'
  },
  'list-style-type': {
  },
  'list-style-position': {
    args: {
      type: 'enum',
      values: {
        outside: { alias: 'o' },
        inside: { alias: 'i' }
      }
    }
  },
  'list-style-image': {
    args: 'url'
  },
  margin: {
    args: ['len', 'len', 'len', 'len'],
    alias: 'm',
    trblAliases: true
  },
  'max-height': {
    args: 'len',
    alias: 'mah'
  },
  'max-width': {
    args: 'len',
    alias: 'maw'
  },
  'min-width': {
    args: 'len',
    alias: 'miw'
  },
  'min-height': {
    args: 'len',
    alias: 'mih'
  },
  // n
  opacity: {
    alias: 'opa'
  },
  order: {},
  outline: {
    args: ['len', 'len', 'len', 'len'],
  },
  overflow: {
    /*args: {
      type: 'enum',
      values: {
        'visible': { alias: 'v' },
        'hidden': { alias: 'h' },
      }
    }*/
    //alias: 'over'
  },
  'overflow-x': {
    alias: 'overx'
  },
  'overflow-y': {
    alias: 'overy'
  },
  padding: {
    args: ['len', 'len', 'len', 'len'],
    alias: 'p',
    trblAliases: true
  },
  'pointer-events': {},
  position: {
    args: {
      type: 'enum',
      values: {
        'static': { alias: 'static' },
        'relative': { alias: 'rel' },
        'absolute': { alias: 'abs' },
        'fixed': { alias: 'fix' },
      },
    },
    alias: 'pos'
  },
  // q
  resize: { // textarea
  },
  right: {
    args: 'len',
    alias: 'r'
  },
  src: { // @font-face
  },
  // t //
  'table-layout': {
    args: {
      type: 'enum',
      values: {
        auto: {},
        fixed: {}
      }
    }
  },
  'text-align': {
    args: {
      type: 'enum',
      values: {
        left: {},
        center: {},
        right: {},
        justify: {}
      },
      autoAlias: true
    },
    alias: 'ta'
  },
  'text-decoration': {
    alias: 'td'
  },
  'text-rendering': {},
  'text-shadow': {
    alias: 'ts'
  },
  'text-size-adjust': {},
  'text-transform': {
    alias: 'tt'
  },
  top: {
    args: 'len',
    alias: 't'
  },
  transform: {},
  transition: {},
  'unicode-range': {},
  'user-select': {
    alias: 'us'
  },
  'vertical-align': {
    args: {
      type: 'enum',
      values: {
        top: { alias: 't' },
        middle: { alias: 'm' },
        bottom: { alias: 'b' },
        'text-top': {},
        'text-bottom': {},
        sub: {},
        'super': {},
        baseline: {}
      }
    },
    alias: 'va'
  },
  visibility: {
    args: {
      type: 'enum',
      values: {
        hidden: {},
        visible: {},
        collapse: {}
      }
    }
  },
  'white-space': {
    alias: 'ws'
  },
  width: {
    args: 'len',
    alias: 'w'
  },
  'word-spacing': {
    args: 'len',
  },
  // x y
  'z-index': {
    args: 'num',
    alias: 'z'
  },
  'zoom': {
    args: '%'
  }
}

export let propAliases = {}

export let declAliases = {
  abs: 'position: absolute',
  bold: 'font-weight: bold',
  block: 'display: block',
  cell: 'display: table-cell',
  center: 'text-align: center',
  column: 'flex-direction: column',
  // d e
  fr: 'float: right',
  fl: 'float: left',
  flex: 'display: flex',
  // g h
  ib: 'display: inline-block',
  italic: 'font-style: italic',
  justify: 'text-align: justify',
  // k l m
  nowrap: 'white-space: nowrap',
  oh: 'overflow: hidden',
  pointer: 'cursor: pointer',
  // q
  rel: 'position: relative',
  row: 'display: table-row',
  // s
  table: 'display: table',
  // u
  uc: 'text-transform: uppercase',
  vab: 'vertical-align: bottom',
  vat: 'vertical-align: top',
  vam: 'vertical-align: middle',
  // w x y z
}



!function(props){

  // create t/r/b/l subprops
  /*for (var propName in props) {
    var prop = props[propName]
    if (prop.trbl) {
      if (!prop.subprops) {
        var sides = ['top','right','bottom','left']
        for (var i = 0; i < sides.length; i++) {
          var side = sides[i]
          prop.subprops[side] = {
            shorthand: prop,
            name: prop.name+'-'+side
          }
        }
      }
    }
  }*/

  // convert string items to objects
  for (var propName in props) {
    var prop = props[propName]
    if (typeof prop == 'string') {
      if (prop != '') {
        prop = {args: prop}
      } else {
        prop = {}
      }
      props[propName] = prop
    }
  }

  for (var propName in props) {
    var prop = props[propName]
    prop.name = propName
    if (prop.args) {
      var args = prop.args
      // if one args make single element array
      if (typeof args == 'string') {
        if (args.indexOf(' ')>0) {
          prop.args = args.split(' ')
        } else {
          prop.args = [args]
        }
      } else if (!Array.isArray(args)) {
        prop.args = [args]
      }
    }
  }

  // convert shorthand arg type to hash
  for (var propName in props) {
    var prop = props[propName]
    prop.name = propName
    if (prop.args) {
      for (var i = 0; i < prop.args.length; i++) {
        var arg = prop.args[i]
        if (typeof arg == 'string') {
          prop.args[i] = { type: arg }
        }
      }
    }
  }

  function makeAliasName(name) {
    var alias = ''
    var parts = name.split('-')
    for (var part of parts) {
      alias += part[0]
    }
    return alias
  }

  // make enum aliases and other stuff
  for (var propName in props) {
    var prop = props[propName]
    prop.name = propName
    if (prop.args) {
      for (var i = 0; i < prop.args.length; i++) {
        var arg = prop.args[i]
        if (arg.type=='enum') {
          // automatically create aliases if requested
          if (arg.autoAlias) {
            for (var valueName in arg.values) {
              if (!arg.values[valueName].alias) {
                arg.values[valueName].alias =
                  makeAliasName(valueName)
              }
            }
          }
          // make enum values aliases index
          var enumAliases = {}
          for (var valueName in arg.values) {
            var valueDesc = arg.values[valueName]
            if (valueDesc.alias) {
              enumAliases[valueDesc.alias] = valueName
            }
          }
          arg.aliases = enumAliases
          //log('aliasesd:',arg)
        } else if (!baseArgTypes[arg.type]) {
          if (props[arg.type]) {
            var subprop = props[arg.type]
            if (subprop.args && subprop.args.length==1) {
              prop.args[i] = subprop.args[0]
            } else {
              throw 'bad css prop arg type '+arg.type
            }
          } else {
            throw 'unknown css prop arg type '+arg.type
          }
        }
      }
    }
  }

  function addAlias(alias, prop) {
    if (propAliases[alias]) {
      throw 'duplicate alias for '+prop.name+' and '+propAliases[alias].name
    }
    propAliases[alias] = prop
    prop.alias = alias
  }

  for (var propName in props) {
    var prop = props[propName]
    if (prop.alias) {
      var alias = prop.alias
      addAlias(alias, prop)
      if (prop.trblAliases) {
        var trblAliases = {
          t: 'top', r: 'right', b: 'bottom', l: 'left'
        }
        for (var s in trblAliases) {
          var subpropName = prop.name+'-'+trblAliases[s]
          var subprop = props[subpropName]
          if (!subprop) {
            subprop = props[subpropName] = {
              name: subpropName,
              args: prop.args
            }
          }
          addAlias(alias+s, subprop)
        }
      }
    }
  }

  // check decl aliases
  for (var alias in declAliases) {
    var expand = declAliases[alias]
    var propName = expand.split(':').shift().trim()
    if (!props[propName]) {
      throw 'unknown property `'+propName+'` in declAlias['+alias+']'
    }
  }

}(knownProps)


