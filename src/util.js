'use strict';

const $ = (query, root = document) => {
  let queryMatch = window
  let queryMethod = 'querySelectorAll'
  if (typeof query !== 'string') {
    throw new TypeError(`$ needs a string but was passed ${query}, which is a ${typeof query}`)
  }
  if ((/\w[ \.#]/).test(query)) {
    queryMethod = 'querySelectorAll'
  } else {
    switch (query[0]) {
      case '#':
        queryMethod = 'getElementById'
        query = query.slice(1)
        break
      case '.':
        queryMethod = 'getElementsByClassName'
        query = query.slice(1)
        break
      default:
        queryMethod = 'getElementsByTagName'
    }
  }
  let match = root[queryMethod](query)
  return match.length === 1 ? match[0] : match
}


Object.assign($, {
  each (obj, callback) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        callback(key, obj[key], obj)
      }
    }
  }
})

Object.prototype.forIn = (callback) => {
  for (let key in this) {
    if (this.hasOwnProperty(key)) {
      callback(key, this[key], this)
    }
  } 
}
