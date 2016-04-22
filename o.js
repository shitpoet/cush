
/*let PropertyChecker = new Proxy({}, {
  get(target, propKey, receiver) {
    if (!(propKey in target)) {
      throw new ReferenceError('unknown property: '+propKey);
    }
    return Reflect.get(target, propKey, receiver);
  }
});

export let O = function(obj) {
  Object.seal(obj)
  return new Proxy(obj, {
    get: function(obj, prop) {
      if (prop in obj) {
        return obj[prop];
      } else {
        throw new ReferenceError('unknown property: '+prop)
      }
    }
  })
}

*/

export let Throwing = new Proxy({}, {
  get: function(obj, prop) {
    //log(prop, typeof prop)
    if (typeof prop == 'string' && prop != 'inspect') {
      throw new ReferenceError('unknown property read: '+prop);
    } else {
      return undefined
    }
  }/*,
  set: function(obj, prop, val) {
    throw new ReferenceError('unknown property wrote: '+prop);
  }*/
})

/*export let O = function(obj) {
  obj.__proto__ = throwing
}*/

export function seal(o) {
  return Object.seal(o)
}
