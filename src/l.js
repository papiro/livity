'use strict'

;(() => {

  /** methods **/
  class L extends Array {
    constructor (query, root = document) {
      super()
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
            root = document
            break
          case '.':
            queryMethod = 'getElementsByClassName'
            query = query.slice(1)
            break
          default:
            queryMethod = 'getElementsByTagName'
        }
      }
      const match = root[queryMethod](query)
      const collection = match ? match.length ? Array.from(match) : [match] : []
      console.log(`query "${query}" returned `, collection)
      Object.assign(this, collection)
    }

    /* executes a new element selection using "this" as the root */
    find (query) {
      return this.reduce( (prev, elem) => {
        return l(query, elem)
      }, [])
    }

    /* get/set attribute */
    attr (name, value) {
      if (!name) {
        let attrMap = {};
        for (let i=0; i<this.attributes.length; i++) {
          const attribute = this.attributes[i]
          attrMap[attribute.name] = attribute.value
        }
        return attrMap
      }

      if (value === undefined) {
        return this.getAttribute(name)
      }

      this.forEach( elem => {
        elem.setAttribute(name, value)
      })
      return this        
    }

    /* get/set text */
    text (text) {
      if (text) {
        this.forEach( elem => {
          elem.textContent = text
        })
      }
      return ( text ? this : this.textContent )
    }

    /* get applied styles / set inline styles */
    css (prop, val) {
      if (typeof prop === 'object') {
        util.each(prop, function (prop, val) {
          this.style(prop, val)
        }.bind(this))
        return this
      } else if (val !== undefined && val !== null) {
        if (typeof val === 'number' && !~['opacity', 'z-index'].indexOf(prop)) val += 'px'
        this.style[prop] = val
        return this
      } else {
        var style = window.getComputedStyle(this)
        return prop ? style[prop] : style
      }
    }

    /* add a class */
    addClass (classes) {
      this.className += ` ${classes}`
      return this    
    }

    /* remove a class */
    removeClass (cnames) {
      const splitCnames = cnames.split(' ')
      splitCnames.forEach( cname => {
        const matcher = ` ${cname}|${cname} |${cname}`
        this.className = this.className.replace(new RegExp(matcher, 'g'), '')        
      })
      return this
    }

    /* get classes */
    getClass () {
      return this.className
    }

    /* check for existence of class */
    hasClass (className) {
      const matcher = new RegExp(`(^| +)${className}($| )`)
      return matcher.test(this.className)
    }

    /* if class exists, remove class, otherwise, add class */
    toggleClass (cname) {
      if (RegExp(cname).test(this.className)) {
        this.removeClass(cname)
      } else {
        this.addClass(cname)
      }
      
      return this
    }

    /* get the offset of an element relative to the window */
    offset () {
      return {
        top: this.offsetTop,
        left: this.offsetLeft,
        right: this.offsetRight
      }
    }

    /* get the height of an element */
    height () {
      return this.offsetHeight
    }

    /* get the inner height (content height) of an element */
    innerHeight () {
      return this.clientHeight
    }

    /* get the content height, including content not visible */
    outerHeight () {
      return this.scrollHeight
    }

    /* get the width of an element */
    width () {
      return this.offsetWidth
    }

    /* get the inner width (content width) of an element */
    innerWidth () {
      if (this.selector === 'window') return this.innerWidth
      else return this.clientWidth
    }

    /* get the content width, including content not visible */    
    outerWidth () {
      return this.scrollWidth
    }

    /* 
    show (block) {
      var elemStyle = this.style
      elemStyle.display = block ? 'block' : 'flex'
      elemStyle.visibility = 'visible'
      return this
    },
    hide (noreflow) {
      this.style[noreflow ? 'visibility' : 'display'] = noreflow ? 'hidden' : 'none'
      return this
    },
    toggle (show) {
      return this[show ? 'show' : 'hide']()
    },
    append (elem) {
      this.appendChild(elem)
      return this
    },
    prepend (elem) {
      this.insertBefore(elem, this.firstChild)
      return this
    },
    appendTo (elem) {
      L(elem).append(this)
      return this
    },
    prependTo (elem) {
      L(elem).prepend(this)
      return this
    },
    html (elem) {
      this.empty()
      if (typeof elem === 'string') this.innerHTML = elem
      else this.append(elem)
      return this    
    },
    empty () {
      var child
      while (child = this.firstChild) {
        this.removeChild(child)
      }
      return this
    },
    remove (elem) {
      elem = ( typeof elem === 'string' ? dom(elem) : elem ) || this
      elem.parentNode && elem.parentNode.removeChild(elem)
      return elem
    },
    replaceWith (elem) {
      this.parentNode.replaceChild(elem || elem, this)
      return dom(elem)
    },
    clone (deep) {
      return this.cloneNode(deep)
    },
    next () {
      return this.nextElementSibling
    },
    parent () {
      return this.parentNode
    },
    child () {
      return this.firstChild
    },
    previous () {
      return this.previousElementSibling
    },
    isImg () {
      return !!(this && this.nodeName === 'IMG')
    }
    */
  }

  // const l = (query, root = document) => {
  //   let queryMatch = window
  //   let queryMethod = 'querySelectorAll'
  //   if (typeof query !== 'string') {
  //     throw new TypeError(`L needs a string but was passed ${query}, which is a ${typeof query}`)
  //   }
  //   if ((/(\w[ \.#])|(^\[)/).test(query)) {
  //     queryMethod = 'querySelectorAll'
  //   } else {
  //     switch (query[0]) {
  //       case '#':
  //         queryMethod = 'getElementById'
  //         query = query.slice(1)
  //         break
  //       case '.':
  //         queryMethod = 'getElementsByClassName'
  //         query = query.slice(1)
  //         break
  //       default:
  //         queryMethod = 'getElementsByTagName'
  //     }
  //   }
  //   const match = root[queryMethod](query)
  //   const collection = match ? Array.isArray(match) ? match : Array.from(match) : []
  //   console.log(`query "${query}" returned `, collection)
  //   collection.prototype = methods
  //   return collection
  //   // return Object.assign(collection, methods)
  // }

  const l = (...args) => {
    return new L(...args)
  }

  /** STATICS **/
  Object.assign(l, {

    /* @ execute a callback for every key:value in an object */
    each (obj, callback) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          callback(key, obj[key], obj)
        }
      }
    },

    /* $.ready substitute */
    DOMContentLoaded (callback) {
      if (document.readyState !== 'loading') return callback()
      document.on('DOMContentLoaded', callback)
    },

    /** @ a manager for page routing based on location.hash
      * - based on the target, will ajax an html file of the same name into the DOM.
      *
      * config: {
      *   view: "selector for the container where views are to be rendered",
      *   templateDirectory: "the root directory containing HTML markup files"
      * }
      *
      * publishes event "view.{target}" where {target} is #/{target} or #{target}
    **/
    router (config = {}) {
      const { view, templateDirectory } = config
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

    /* @ creates and returns a Promise representing an HTTP response */
    ajax ({ url = '', method = 'GET', data }) {
      return new Promise( (resolve, reject) => {
        const req = _openAndReturnReq(method, url)

        req.onreadystatechange = () => {
          if (req.readyState === 4) {
            switch (Math.floor(req.status/100)) {
              case 4:
              case 5:
                reject(req)
                break
              default:
                resolve(req)
            }
          }
        }
        req.send(data)
      })
    },

    /** @ creates a new DOM node or collection of DOM nodes
      * - {elem} may be either the name of an element, such as "span", or it may be a more complex
      *   string of markup, such as "<span id='span1' class='sideways-baseball-cap'></span>"
    **/
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

  window.l = l

  // non-obtrusive prototype methods
  Object.prototype.forIn = (callback) => {
    for (let key in this) {
      if (this.hasOwnProperty(key)) {
        callback(key, this[key], this)
      }
    } 
  }
})()
