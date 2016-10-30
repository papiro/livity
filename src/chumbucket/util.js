'use strict';

const L = (query, root = document) => {
  let queryMatch = window
  let queryMethod = 'querySelectorAll'
  if (typeof query !== 'string') {
    throw new TypeError(`L needs a string but was passed ${query}, which is a ${typeof query}`)
  }
  if ((/(\w[ \.#])|(^\[)/).test(query)) {
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
  return match 
    ? 
      (match.length === 1 
       ? match[0] 
       : match) 
    : 
      (() => {
        throw new ReferenceError(`${query} has no match.`)
      })()
}

;(() => {

  const 
    // utility for ajax methods
    _openAndReturnReq = (method, url) => {
      const req = new XMLHttpRequest()
      req.open(method, url)
      return req
    }
  ,
    noop = () => {}
  ;

  Object.assign(L, {
    each (obj, callback) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          callback(key, obj[key], obj)
        }
      }
    },
    DOMContentLoaded (callback) {
      if (document.readyState !== 'loading') return callback()
      document.on('DOMContentLoaded', callback)
    },
    router (config = {}) {
      const { view, templateDirectory, callbacks } = config
      let initialized = false

      window.on('hashchange', () => {
        const hash = window.location.hash
        // slice off the leading '#' and a following '/' if there is one
        const route = hash.slice(hash[1]==='/'?2:1)
        this.ajax({
          url: `${templateDirectory}/${route}.html`
        })
        .then( req => {
          L(view).html(req.response)
          document.trigger('view.'+route)
          ;(typeof callbacks[route] === 'function') && callbacks[route]()
        })
        .catch( err => {
          throw err
        })
        initialized = true
      })
      window.location.hash && !initialized && window.trigger('hashchange')
    },
    ajax ({ url = '', method = 'GET', data, success = noop, failure = noop, always = noop }) {
      return new Promise( (resolve, reject) => {
        const req = _openAndReturnReq(method, url)

        req.onreadystatechange = () => {
          if (req.readyState === 4) {
            switch (Math.floor(req.status/100)) {
              case 4:
              case 5:
                failure(req)
                reject(req)
                break
              default:
                success(req)
                resolve(req)
            }
            always(req)
          }
        }
        req.send(data)
      })
    },
    create (elem) {
      let newElement
      if (elem[0] === '<') {
        const temp = document.createElement('div')
        temp.innerHTML = elem
        newElement = ( temp.childElementCount === 1 ? temp.firstChild : temp.children )
      } else {
        newElement = document.createElement(elem)
      }
      return newElement
    }
  })
})()

Object.prototype.forIn = (callback) => {
  for (let key in this) {
    if (this.hasOwnProperty(key)) {
      callback(key, this[key], this)
    }
  } 
}
