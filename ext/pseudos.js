var extPseudos = {}

function pseudo_first(rule, str) {
  return 'first-child'
}

function registerPseudo(id, cb) {
  extPseudos[id] = cb
}

registerPseudo(id, pseudo_first)

