'use strict';

var
  isSp      = t => t && t.t & 1,
  isNl      = t => t && t.t & 2,
  isWs      = t => t && t.t & 3,
  isCmnt    = t => t && t.t & 4,
  isInt     = t => t && t.t & 8,
  //isFloat = t => t && t.t & 16,
  isNum     = t => t && t.t & 24,
  isId      = t => t && t.t & 32,
  isSig     = t => t && t.t & 64,
  //isSQStr = t => t && t.t & 128,
  //isDQStr = t => t && t.t & 128,
  isQStr    = t => t && t.t & 384,
  isSym     = t => t && t.t & 512,
  isRaw     = t => t && t.t & 1024,
  isSOL     = t => t && t.t & 16384,
  isEnd     = t => t==null
