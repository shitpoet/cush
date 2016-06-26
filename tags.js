"use strict"

/*

  attribute descriptor:

  attrName: {
    type: boolean, number, text*, url, style
    alias: aliasName
  }

  value of boolean attribute is optional (checked,hidden).

*/

var knownAttrs = {

}

export let knownTags = {
  '*': {
    attrs: 'accesskey, class, hidden?, id, lang, title, tabindex, style, aria-label, aria-labelledby, aria-describedby, onclick onkeypress onkeyup onkeydown onmousewheel onmouseout itemscope?  itemtype itemprop draggable'
  },
  '+': {}, // combinator
  '~': {}, // combinator
  a: {
    attrs: {
      href: { type: 'url', main: true, alias: 'h' },
      download: {},
      target: {}
    }
  },
  abbr: {},
  address: {},
  article: {},
  aside: {},
  audio: {
    attrs: 'autoplay buffered controls loop preload'
  },
  b: {},
  body: {
    parents: { html: true }
  },
  br: {
    selfClosing: true
  },
  blockquote: {
    attrs: 'cite'
  },
  button: {
    attrs: {
      name: { alias: 'n' },
      type: { alias: 't' },
    },
    otherAttrs: 'autofocus? value disabled?'
  },
  canvas: {
    attrs: 'width height'
  },
  caption: {},
  code: {},
  details: {
  },
  dfn: {},
  div: {},
  dd: {},
  dl: {},
  dt: {},
  em: {},
  fieldset: {
    attrs: 'disabled?'
  },
  figcaption: {},
  figure: {},
  footer: {},
  form: {
    attrs: 'name action enctype autocomplete method target onsubmit'
  },
  //g
  h1: {},
  h2: {},
  h3: {},
  h4: {},
  h5: {},
  h6: {},
  hr: { selfClosing: true },
  head: {
    parents: { html: true }
  },
  header: {
  },
  hgroup: {}, // has been removed from HTML5
  html: {
    attrs: 'lang',
    parents: { root: true }
  },
  i: {},
  iframe: {
    attrs: 'src seamless'
  },
  img: {
    selfClosing: true,
    attrs: {
      src: { alias: 's' },
      width: { alias: 'w' },
      height: { alias: 'h' },
    },
    otherAttrs: 'alt, srcset'
  },
  input: {
    selfClosing: true,
    attrs: {
      name: { alias: 'n' },
      placeholder: { alias: 'ph' },
      type: { alias: 't' },
      value: { alias: 'v' }
    },
    otherAttrs: 'size checked? form formaction formenctype autocomplete autofocus autosave max maxlength min minlength multiple pattern readonly required? spellcheck step width height disabled? onchange'
  },
  //j k
  label: {
    attrs: 'for'
  },
  li: {
    autoClosing: true,
    parents: { ol: true, ul: true },
    attrs: 'value'
  },
  link: {
    selfClosing: true,
    attrs: 'href, rel, type, media'
  },
  main: {},
  mark: {
    defaultDisplay: 'inline'
  },
  meta: {
    selfClosing: true,
    attrs: 'charset, http-equiv, content, name'
  },
  /*menu: {
  },*/
  meter: {
    attrs: 'low high min max optimum value'
  },
  nav: {},
  ol: {
    attrs: 'reversed'
  },
  optgroup: {
    attrs: 'disabled?'
  },
  option: {
    attrs: {
      value: { alias: 'v' }
    },
    otherAttrs: 'disabled? selected?'
  },
  output: {
    attrs: 'for form name',
  },
  p: {
    autoClosing: true
  },
  picture: {
  },
  pre: {
  },
  progress: {
    attrs: 'min max value'
  },
  q: {
    attrs: 'cite'
  },
  // r
  samp: {}, // inline
  script: {
    attrs: 'src, type, async, defer'
  },
  section: {},
  select: {
    attrs: {
      name: { alias: 'n' }
    },
    otherAttrs: 'autofocus disabled? required? onchange'
  },
  source: {
    attrs: 'src srcset type media'
  },
  span: {},
  strong: {},
  style: {
    attrs: 'src media'
  },
  sub: {},
  summary: {
  },
  sup: {},
  span: {},
  textarea: {
    attrs: {
      placeholder: { alias: 'ph' }
    },
    otherAttrs: 'name, rows, cols, autofocus, disabled? required?'
  },
  table: {
  },
  td: {
    autoClosing: true,
    attrs: 'colspan rowspan'
  },
  th: {
    attrs: 'colspan'
  },
  thead: {
  },
  title: {
    parents: { head: true }
  },
  tr: {
    nonNestable: true
  },
  u: {},
  ul: {},
  video: {
    attrs: 'autoplay buffered controls loop poster preload'
  }
  // w x y z
}

!function(tags) {

  // convert string desc of atrts to hash

  function explodeAttrs(tag, str) {
    var names = str.split(/,?\s/) // ', ' or ' '
    for (var i = 0; i < names.length; i++) {
      var attrName = names[i]
      if (attrName.endsWith('?')) {
        tag.attrs[attrName.slice(0,-1)] = {
          type: 'boolean'
        }
      } else {
        tag.attrs[attrName] = {
          type: 'text'
        }
      }
    }
  }

  for (var tagName in tags) {
    var tag = tags[tagName]
    if (typeof tag.attrs == 'string') {
      var str = tag.attrs
      tag.attrs = {}
      explodeAttrs(tag, str)
    }
    if (tag.otherAttrs) {
      var str = tag.otherAttrs
      if (!tag.attrs) tag.attrs = {}
      explodeAttrs(tag, str)
    }
  }

  for (var tagName in tags) {
    var tag = tags[tagName]
    // assign tag.name
    tag.name = tagName
    // add empty attrs field for tags wo attrs
    if (!tag.attrs) tag.attrs = {}
    // assign attr name
    for (var attrName in tag.attrs) {
      var attr = tag.attrs[attrName]
      attr.name = attrName
    }
  }

  // create aliases index for attrs
  for (var tagName in tags) {
    var tag = tags[tagName]
    tag.attrAliases = {}
    for (var attrName in tag.attrs) {
      var attr = tag.attrs[attrName]
      if (attr.alias) {
        tag.attrAliases[attr.alias] = attr
      }
    }
  }

  // copy global attrs to each tag
  for (var tagName in tags) {
    var any = tags['*']
    var tag = tags[tagName]
    if (tagName!='*') {
      for (var attrName in any.attrs) {
        tag.attrs[attrName] = any.attrs[attrName]
      }
    }
  }

  // create `mainAttr` field
  for (var tagName in tags) {
    var tag = tags[tagName]
    for (var attrName in tag.attrs) {
      var attr = tag.attrs[attrName]
      if (attr.main) {
        tag.mainAttr = attr
      }
    }
  }

}(knownTags)
