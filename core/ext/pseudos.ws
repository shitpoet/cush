export let extPseudos = {}

function pseudo_first(rule, str) {
  return 'first-child'
}

function pseudo_last(rule, str) {
  return 'last-child'
}





function registerPseudo(id, cb) {
  extPseudos[id] = cb
}

registerPseudo('first', pseudo_first)
registerPseudo('last', pseudo_last)

