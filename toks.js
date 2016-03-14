export let isSp      = t => t && t.t & 1
export let isNl      = t => t && t.t & 2
export let isWs      = t => t && t.t & 3
export let isCmnt    = t => t && t.t & 4
export let isInt     = t => t && t.t & 8
//export let isFloat = t => t && t.t & 16
export let isNum     = t => t && t.t & 24
export let isId      = t => t && t.t & 32
export let isSig     = t => t && t.t & 64
//export let isSQStr = t => t && t.t & 128
//export let isDQStr = t => t && t.t & 128
export let isQStr    = t => t && t.t & 384
export let isSym     = t => t && t.t & 512
export let isRaw     = t => t && t.t & 1024
export let isSOL     = t => t && t.t & 16384
export let isEnd     = t => t==null
