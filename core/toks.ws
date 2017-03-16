export let is_sp      = t => t && t.t & 1
export let is_nl      = t => t && t.t & 2
export let is_ws      = t => t && t.t & 3
export let is_cmnt    = t => t && t.t & 4
export let is_int     = t => t && t.t & 8
//export let is_float = t => t && t.t & 16
export let is_num     = t => t && t.t & 24
export let is_id      = t => t && t.t & 32
export let is_sig     = t => t && t.t & 64
//export let isSQStr = t => t && t.t & 128
//export let isDQStr = t => t && t.t & 256
export let is_qstr    = t => t && t.t & 384
export let is_sym     = t => t && t.t & 512
export let is_raw     = t => t && t.t & 1024
export let is_sol     = t => t && t.t & 16384
export let is_end     = t => t==null
