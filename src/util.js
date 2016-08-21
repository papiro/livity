'use strict';

const $a = document.querySelectorAll
const $i = document.getElementById
const $c = document.getElementsByClassName
const $n = document.getElementsByName
const $t = document.getElementsByTagName

const $ = (query, root = document) => {
  let queryMatch = window
  let queryMethod = 'querySelectorAll'
  if (typeof query !== 'string') {
    throw new Error(`$ needs a string but was passed ${query}, which is a ${typeof query}`)
  }
  if ((/.* /).test(query)) {
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
        queryMethod = 'getElementsByTagName '
    }
  }
  return root[queryMethod](query)
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

