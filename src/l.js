'use strict'

;(() => {

  /**
   * Decided to go with a memory-unsafe Map, rather than a memory-safe WeakMap for one reason:
   * Allows the LivityAPI to provide methods to return detailed data for all event listeners
   *  currently subscribed through the framework.  
   *  With WeakMaps, I would need to keep a separate reference of every key (DOM node) in 
   *  order to loop through and read each listener from the WeakMap.  
   *  If a listener was registered through the framework, deregister it through the framework.  
  **/
  const _evtData = new Map()
  const noop = () => {}

  let numberOfListeners = 0

  class Listener {
    constructor (elem, type, handler, _wrappedHandler, target) {
      Object.assign(this, { elem, type, handler, _wrappedHandler, target })
    }
    
    register () {
      const { elem, type, handler, _wrappedHandler } = this
      
      elem.addEventListener(type, _wrappedHandler)
      
      // initialize new listener data
      !_evtData.has(elem) && _evtData.set(elem, { 
        [type]: {
          _wrappedHandlers: [],
          handlers: []
        }
      })

      const obj = _evtData.get(elem)[type]
      // store the listener data
      obj._wrappedHandlers.push(_wrappedHandler)
      obj.handlers.push(handler)

      if (++numberOfListeners % 10 === 0) {
        console.debug(`Just reached ${numberOfListeners} event listeners`)
      }
    }

    // Note: Does not consider delegated targets when deregistering
    deregister () {
      const { elem, type, handler } = this

      let data = _evtData.get(elem)
      let dataForType = data[type]
      const handlerIndex = dataForType.handlers.indexOf(handler)
      const _wrappedHandler = dataForType._wrappedHandlers.splice(handlerIndex, 1)[0]

      elem.removeEventListener(type, _wrappedHandler)

      // clean up
      dataForType.handlers.splice(handlerIndex, 1)[0]
      if (!dataForType.handlers.length) {
        data[type] = null
        delete data[type]
        if (!Object.keys(data).length) {
          data = null
          _evtData.delete(elem)
        }
      }

      numberOfListeners--
    }
    
    /*convenience methods*/
    static register (listener) {
      listener.register()
    }
    
    static deregister (listener) {
      listener.deregister()
    }
    /*********************/

    static deregisterDOMNode (elem) {
      _listeners
        .filter( listener => listener.elem === elem )
        .forEach( listener => {
          listener.deregister()
        })
    } 

    static getListeners (c) {
      var filter
      switch (typeof c) {
        case 'undefined':
          return [..._evtData]
          break
        case 'string':
          filter = 'type'
          break
        case 'object':
          filter = 'elem'
          break
        case 'function':
          filter = 'handler'
          break
        default:
          throw new ReferenceError('Faulty criteria passed to Listener.getListeners')
      }        
    }
  }

  class L extends Array {
    constructor (query, root = document) {
      super()
      let queryMethod = '', match
      console.debug(`query:::"${query}"`)
      // special types
      // simply wrap if already an array
      if (query instanceof Array) {
        return Object.assign(this, query)
      } else if (query instanceof Node || query instanceof Window) {
        match = query 
      } else if (typeof query !== 'string') {
        throw new TypeError(`L needs a string but was passed ${query}, which is a ${typeof query}`)
      } else if ((/(\w[ \.#])|(^\[)/).test(query)) {
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
      match = match || root[queryMethod](query)
      const collection = match ? ( match.length || match instanceof HTMLCollection ) ? Array.from(match) : [match] : []
      console.debug(`returned:::${collection}`)
      Object.assign(this, collection)
    }

    // Alas, native Array map is busted on the L subclass :(
    // So convert into a true Array, run map, and actually return a new instance
    map (...args) {
      return new L(Array.from(this).map(...args))
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
        return this[0].getAttribute(name)
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
      this.forEach( elem => {
        elem.className += ` ${classes}`
      })
      return this    
    }

    /* remove a class */
    removeClass (cnames) {
      const splitCnames = cnames.split(' ')
      splitCnames.forEach( cname => {
        const matcher = ` ${cname}|${cname} |${cname}`
        this.forEach( elem => {
          elem.className = elem.className.replace(new RegExp(matcher, 'g'), '')        
        })
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
      this.forEach( elem => {
        if (RegExp(cname).test(elem.className)) {
          l(elem).removeClass(cname)
        } else {
          l(elem).addClass(cname)
        }
      })
      
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

    show (flex) {
      this.forEach( elem => {
        const elemStyle = elem.style
        elemStyle.display = flex ? 'flex' : 'block'
        elemStyle.visibility = 'visible'
      })
      return this
    }

    hide (noreflow) {
      this.forEach( elem => {
        elem.style[noreflow ? 'visibility' : 'display'] = noreflow ? 'hidden' : 'none'
      })
      return this
    }

    toggle (show) {
      return this[show ? 'show' : 'hide']()
    }

    append (child) {
      this.forEach( elem => {
        elem.appendChild(child)
      })
      return this
    }

    prepend (elem) {
      this.insertBefore(elem, this.firstChild)
      return this
    }

    appendTo (elem) {
      L(elem).append(this)
      return this
    }

    prependTo (elem) {
      L(elem).prepend(this)
      return this
    }

    html (html) {
      this.empty()
      this.forEach( elem => {
        if (typeof html === 'string') elem.innerHTML = html
        else elem.append(html)
      })
      return this    
    }

    empty () {
      this.forEach( elem => {
        let child
        while (child = this.firstChild) {
          this.removeChild(child)
        }
      })
      return this
    }
    
    remove (elem) {
      this.forEach( elem => {
        elem.parentNode && elem.parentNode.removeChild(elem)
      })
      return this
    }

    replaceWith (newElem) {
      this.forEach( elem => {
        elem.parentNode.replaceChild(newElem, elem)
      })
      return this
    }/*
    clone (deep) {
      return this.cloneNode(deep)
    },
    next () {
      return this.nextElementSibling
    },
    parent () {
      return this.parentNode
    },
    */
    child () {
      return this.map( elem => {
        return elem.firstChild 
      })
    }
    /*
    previous () {
      return this.previousElementSibling
    },
    isImg () {
      return !!(this && this.nodeName === 'IMG')
    }
    */
    on (eType, ...args) {
      // Handle overloaded function without changing variable types
      let target, handler, options
      switch (args.length) {
        case 1:
          target = null
          handler = args[0]
          break
        case 2:
          if (typeof args[0] === 'string') {
            target = args[0]
            handler = args[1]
          } else {
            target = null
            handler = args[0]
            options = args[1]
          }
          break
        case 3: 
            target = args[0]
            handler = args[1]
            options = args[2]
            break
        default:
          throw new TypeError('"on" function signature is (event_type(String)[required], event_target(HTMLElement|String)[optional], handler(Function)[required], options(Object)[optional]')
      }
      return this._on(eType, target, handler, options)
    }

    _on (eType, target, handler, options = {}) {
      function wrappedHandler (evt) {
        if (!target) return handler.bind(this)(evt)
        let iteration = evt.target
        const targets = [...evt.currentTarget.querySelectorAll(target)]
        while( iteration !== evt.currentTarget ) {
          if (~targets.indexOf(iteration)) {
            return handler.bind(iteration)(evt)
          }
          iteration = iteration.parentElement 
        } 
      }

      function wrappedHandlerOnce (evt) {
        wrappedHandler.call(this, evt)
        l(this).off(eType, handler)
      }

      this.forEach( elem => {
        Listener.register(new Listener(
            elem
          , eType
          , handler
          , options.once ? wrappedHandlerOnce : wrappedHandler
          , target
        ))        
      })

      return this 
    }

    once () {
      this.on.apply(this, [...arguments, { once: true }])
    }

    off (eType, handler) {
      this.forEach( elem => {
        Listener.deregister(new Listener(
            elem
          , eType
          , handler
       ))
      })
    }

    deregisterEvents () {
      Listener.deregisterDOMNode(this)
      return this
    }

    trigger (eventName, detail) {
      const nativeEvents = [
        'mouseenter'
      , 'mouseover'
      , 'mousemove'
      , 'mousedown'
      , 'mouseup'
      , 'click'
      , 'dblclick'
      , 'contextmenu'
      , 'wheel'
      , 'mouseleave'
      , 'mouseout'
      , 'select'
      ]
      if (~nativeEvents.indexOf(eventName)) {
        this.forEach( elem => {
          elem[eventName]()
        })
      } else {
        let customEvent 
        try {
          customEvent = new CustomEvent(eventName, detail)
        } catch (e) {
          // IE11
          customEvent = document.createEvent('CustomEvent')
          customEvent.initCustomEvent(eventName, true, true, detail)
        }
        this.forEach( elem => {
          elem.dispatchEvent(customEvent)
        })
      }
      return this
    }

    getListeners () {
      return Listener.getListeners()
    }
  }

  const l = (...args) => {
    return new L(...args)
  }

  const 
    // utility for ajax
    _openAndReturnReq = (method, url) => {
      const req = new XMLHttpRequest()
      req.open(method, url)
      return req
    },
    uniqueTags = ['TITLE', 'HEADER', 'MAIN', 'FOOTER']
  ;

  /** STATICS **/
  Object.assign(l, {

    getListeners (...args) {
      return Listener.getListeners(...args)
    },

    /* @ execute a callback for every key:value in an object */
    each (obj, callback) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          callback(key, obj[key], obj)
        }
      }
    },

    /* $.ready substitute */
    DOMContentLoaded (_callback) {
      if (document.readyState !== 'loading') return _callback()
      const callback = () => {
        _callback()
        // cleanup
        l(document).off('DOMContentLoaded', callback) 
      }
      l(document).on('DOMContentLoaded', callback)
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
      const { view, templateDirectory, callbacks={} } = config
      let initialized = false

      l(window).on('hashchange', () => {
        const hash = window.location.hash
        // slice off the leading '#' and a following '/' if there is one
        const route = hash.slice(hash[1]==='/'?2:1)
        this.ajax({
          url: `${templateDirectory}/${route}.html`
        })
        .then( req => {
          l(view).html(req.response)
          l(document).trigger('view.'+route)
          ;(typeof callbacks[route] === 'function') && callbacks[route]()
        })
        .catch( err => {
          throw err
        })
        initialized = true
      })
      window.location.hash && !initialized && l(window).trigger('hashchange')
    },

    /* @ creates and returns a Promise representing an HTTP response */
    ajax ({ url = '', method = 'GET', data, headers }) {
      return new Promise( (resolve, reject) => {
        const req = _openAndReturnReq(method, url)
        
        Object.keys(headers).forEach( header => {
          req.setRequestHeader(header, headers[header])
        })
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
    },

    /** @ the wrapper for the web-app
      * - {head} js to execute immediately
      * - {body} js to be run onDOMContentLoaded
    **/
    init ({ head = noop, body = noop }) {
      try {
        head()
        this.DOMContentLoaded(body)
      } catch (e) {
        if (~location.search.indexOf('mobile')) {
          document.write('<h1>'+e.stack+'</h1>')
        } else {
          console.error(e)
        }
      }
    },

    history: {
      loadRoute ({ url }) {
        l.ajax({ 
          url,
          headers: {
            'Accept': 'text/html'            
          }
        }).then( data => {
          [...l.create(data.response)].forEach( node => {
            let replacement = node.tagName
            if (!~uniqueTags.indexOf(node.tagName)) {
              replacement = '#' + node.id
            }
            l(replacement).replaceWith(node)
          })
        })
      },
      init ({ routes, rendering }) {
        if (!routes) throw new ReferenceError('Need { routes: {} } for intelliRouter')
        window.onpopstate = ({ state }) => {
          this.loadRoute(state)
        }
        if (history.state === null) { // When loading the page for the first time
          const 
            route = window.location.pathname,
            routeData = routes[route]
          ;
          history.replaceState(routeData.state, routeData.title || '', route)
        }
        this.loadRoute(history.state)
        l.DOMContentLoaded(() => {
          l('body').on('click', 'a', function (evt) {
            evt.preventDefault()
            if (this.href === window.location.href) return
            const 
              route = l(this).attr('href'),
              routeData = routes[route]
            ;
            history.pushState(routeData.state, routeData.title || '', route)
            l.history.loadRoute(routeData.state)
          })          
        })        
      }
    },

    /** @ serializes an object for inclusion as url parameters **/
    params (obj) {
      return Object.keys(obj).reduce( (prev, curr, i, arr) => {
        return prev += `${curr}=${encodeURIComponent(obj[curr])}${i !== arr.length-1 ? '&' : ''}`
      }, '?')
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
  // override
  console.debug = (...args) => {
    if (window.DEBUG) console.log(...args)
  }
})()
