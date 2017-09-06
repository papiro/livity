'use strict'

window.DEBUG = true

;(() => {

  /**
   * Decided to go with a memory-unsafe Map, rather than a memory-safe WeakMap for one reason:
   * Allows the LivityAPI to provide methods to return detailed data for all event listeners
   *  currently subscribed through the framework.  
   *  With WeakMaps, I would need to keep a separate reference of every key (DOM node) in 
   *  order to loop through and read each listener from the WeakMap.  
   *  If a listener was registered through the framework, deregister it through the framework.  
   *
   *  _evtData has the following structure:
   *  {
   *    [node]: {
   *      click: {
   *        handlers: [],        <-- raw handler the user thinks they registered
   *        wrappedHandlers: []  <-- handler which is actually registered
   *      }
   *    }
   *  }
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
      if (!_evtData.has(elem)) {
        _evtData.set(elem, {})
      }
      if (!_evtData.get(elem)[type]) {
        Object.assign(_evtData.get(elem), {
          [type]: {
            _wrappedHandlers: [],
            handlers: []
          }
        })
      }

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
      /***
        * Accept:
        *   1. elem
        *   2. elem & type
        *   3. elem, type, & handler
      ***/
      const { elem, type, handler } = this
      let data = _evtData.get(elem)
      if (!data) return false

      if (type) {
        const typeData = data[type]
        if (handler) {
          const handlerIndex = typeData.handlers.indexOf(handler)
          // just return in the case someone is trying to deregister a handler which isn't registered
          if (!~handlerIndex) return false
          
          const _wrappedHandler = typeData._wrappedHandlers.splice(handlerIndex, 1)[0]
          // cleanup
          typeData.handlers.splice(handlerIndex, 1)[0]

          // do it!
          elem.removeEventListener(type, _wrappedHandler)
          numberOfListeners--
        } else {
          typeData._wrappedHandlers.forEach( handler => {
            // do it!
            elem.removeEventListener(type, handler)            
            numberOfListeners--
          })
          // cleanup
          data[type] = null
          delete data[type]
        }
      } else {
        Object.keys(data).forEach( type => {
          const typeData = data[type]
          typeData._wrappedHandlers.forEach( handler => {
            // do it!
            elem.removeEventListener(type, handler)            
            numberOfListeners--
          })
        })
        // cleanup
        data = null
        _evtData.delete(elem)
      }
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
      console.log(_evtData.get(elem))
      // l(elem).
    } 

    static getListeners (c) {
      var filter
      switch (typeof c) {
        case 'undefined':
          return [..._evtData]
        case 'string':
          filter = 'type'
          break
        case 'object':
          filter = 'elem'
          return _evtData.get(c)
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
      /** 
      **  SPECIAL TYPES
      **/
      if (query instanceof L) return query
      // Simply wrap if already an array
      if (query instanceof Array) return Object.assign(this, query)
      if (query instanceof Node || query instanceof Window) match = query 
      else if (typeof query !== 'string') {
        throw new TypeError(`L needs a string but was passed ${query}, which is a ${typeof query}`)
      } else if ((/(\w[ \.#,])|(^\[)/).test(query)) {
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
      const collection = Array.fromDOM(match)
      Object.assign(this, collection)
    }

    // Alas, native Array map is busted on the L subclass :(
    // So convert into a true Array, run map, and actually return a new instance
    map (...args) {
      return new L(Array.from(this).map(...args))
    }

    each (executor) {
      this.forEach( elem => {
        executor(elem)
      })
      return this
    }

    /* executes a new element selection using "this" as the root */
    find (query) {
      return this.reduce( (prev, elem) => {
        return l(query, elem)
      }, [])
    }

    closest (query) {
      if (this.length > 1) throw new Error('Method "closest" currently doesn\'t support finding an ancestor of more than one element at a time')
      
      const targets = Array.from(document.querySelectorAll(query))
      let currentElem = this[0].parentElement

      while (!~targets.indexOf(currentElem) && currentElem !== window) {
        currentElem = currentElem.parentElement
      }

      return l(currentElem)
    }

    /* get/set attribute */
    attr (name, value) {
      // If passed no arguments, will return all attributes
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

    append (children) {
      if (typeof children === 'string') children = l.create(children)

      if (children.length) children = Array.from(children)
      else children = [children]

      this.forEach( elem => {
        children.forEach( child => {
          elem.appendChild(child)
        })
      })
      return this
    }

    insertAfter (second) {
      // insertAfter actually "insertsBefore" the next sibling
      this.forEach( first => {
        [...second].reverse().forEach( second => {
          l(first).parent()[0].insertBefore(second, first.nextSibling)          
        })
      })
      return this
    }

    before (first) {
      this.forEach( second => {
        l(elem).parent().insertBefore(first, second)
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
    */

    parent () {
      if (this.length > 1) throw new Error('Can\'t get the parentNode of multiple nodes')
      return l(this[0].parentNode)
    }

    child () {
      return this.map( elem => {
        return elem.firstChild 
      })
    }

    children () {
      if (this.length > 1) throw new Error('Can only get children of a single parent node.')
      return l([...this[0].children])
    }

    detach () {
      if (this.length > 1) throw new Error('Can\'t detach more than one element at a time.')

      const listeners = this.getListeners()

      if (listeners) {
        this.off()
        Object.assign(this, {
          data: {
            detached: true,
            listeners
          }
        })
      }

      return this.remove()
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
        if (!target) return handler.bind(this)(evt, this)
        // The rest of this is to handle event delegation
        let iteration = evt.target
        const targets = [...evt.currentTarget.querySelectorAll(target)]
        // iteration is null when we've traversed the DOM and exited
        while( iteration && iteration !== evt.currentTarget ) {
          if (~targets.indexOf(iteration)) {
            return handler.bind(iteration)(evt, iteration)
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
      , 'submit'
      , 'change'
      , 'keyup'
      , 'keydown'
      , 'keypress'
      ]
      if (~nativeEvents.indexOf(eventName)) {
        this.forEach( elem => {
          elem[eventName]()
        })
      } else {
        let customEvent 
        try {
          customEvent = new CustomEvent(eventName, { detail })
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
      if (this.length > 1) throw new Error('Cannot getListeners of more than one element at a time')
      return Listener.getListeners(this[0])
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
    }
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
    ajax ({ url = '', method = 'GET', data, headers = {} }) {
      return new Promise( (resolve, reject) => {
        const req = _openAndReturnReq(method, url)
        
        Object.keys(headers).forEach( header => {
          req.setRequestHeader(header, headers[header])
        })
        req.onreadystatechange = () => {
          if (req.readyState === 4) {
            switch (Math.floor(req.status/100)) {
              case 2:
                resolve(JSON.parseSafe(req.response) || req.response, req)
                break
              default:
                reject(JSON.parseSafe(req.response) || req.response, req)
            }
          }
        }
        req.send(typeof data === 'object' && !(data instanceof FormData) ? JSON.stringify(data) : data)
      })
    },

    /** @ creates a new DOM node or collection of DOM nodes
      * - {elem} may be either the name of an element, such as "span", or it may be a more complex
      *   string of markup, such as "<span id='span1' class='sideways-baseball-cap'></span>"
    **/
    create (elem, returnWrapped) {
      let newDOM
      elem = elem.trim()
      if (elem[0] === '<') {
        const temp = document.createElement('div')
        temp.innerHTML = elem
        newDOM = ( temp.childElementCount === 1 ? temp.firstChild : temp.children )
      } else {
        newDOM = document.createElement(elem)
      }
      newDOM = Array.fromDOM(newDOM)
      // <script>'s created via innerHTML won't execute when appended to the DOM.
      const scriptIndex = newDOM.findIndex( elem => elem instanceof HTMLScriptElement )
      if (~scriptIndex) {
        const script = newDOM[scriptIndex]
        const newScript = document.createElement('script')
      
        Array.from(script.attributes).forEach( attr => {
          newScript.setAttribute(attr.name, attr.value)
        })
        newScript.innerText = script.innerText
        // Swap old script with new document.createElement'ed one.
        newDOM.splice(scriptIndex, 1, newScript)
      }
      return returnWrapped ? l(newDOM) : newDOM
    },

    modal: {
      count: 0,
      open (content) {
        const modal = l.create(
        `
          <div id="livityModal" class="modal" 
               style="top: ${++this.count * 5}vh; left: ${this.count * 5}vw;">
            <span onclick="this.parentElement.remove();this.parentElement.onClose && this.parentElement.onClose()" class="modal_close">X</span>
            ${content}
          </div>
        `)
        l('body').append(modal)
        return modal[0]
      },
      closeAll () {
        l('.modal').remove()
        this.count = 0
      }
    },

    /** @ serializes an object for inclusion as url parameters **/
    params (obj) {
      return Object.keys(obj).reduce( (prev, curr, i, arr) => {
        return prev += `${curr}=${encodeURIComponent(obj[curr])}${i !== arr.length-1 ? '&' : ''}`
      }, '?')
    },

    /** @ deserializes a query string into an object **/
    deserialize (str) {
      const obj = {}
      str.substr(1).split('&').forEach( keyVal => {
        const [key, val] = keyVal.split('=')
        obj[key] = decodeURIComponent(val)
      })
      return obj
    },

    /** @ parses a form into an object of field name/value pairs **/
    parseForm (form) {
      return l(form).find('input, select').reduce( (prev, next) => {
        prev[next.name] = next.value
        return prev
      }, {})
    },

    /** @ validates a form passed as argument and returns boolean **/
    isValid (form) {
      const requiredFields = l(form).find('[required]') 
      return !requiredFields.some( field => ( field.value === '' ))
    }
  })

  /***
  **  LivityStore is a wrapper for the browsers's localStorage api,
  **    providing object-like syntax for getting and setting to it.
  ***/
  class LivityStore {
    constructor ({ storeName = 'livity' }) {
      const livityStore = (obj) => {
        Object.assign(livityStore, obj)
      }

      livityStore.__proto__ = Object.getPrototypeOf(this)

      return livityStore
    }

    persist (obj) {
      // Prefer local props over global if there's duplicates (which there should never be)
      this.store = Object.assign({}, obj, this.store)
      localStorage.setItem(this.name, obj)
    }

    clear () {
      for (let i in this) {
        console.log(i)
      }
    }
  }

  class UrlUtils {
    static parseRoute (url = window.location.href) {
      const [/*don't need*/, route, query] = url.match(/(?:https?:\/\/[^\/]*)?([^?]*)(\?.*)?/)
      return {
        route,
        query: l.deserialize(query)
      }
    }
  }
  /**
  **  A Route + <state> contains the following:
  **  {
  **    name: <str>,              // name of route
  **    static: <str>,            // url of static html page to load for route
  **    template: <arr> OR <str>, // url of template to load for route
  **    addressBar: <str>,        // what to display in the address-bar (to the user) for this route
  **    dom: <obj>,               // key/value pairs of selectors and event handlers for this route
  **    actions: <obj>,           // functions to expose via l.actions to inline event handlers
  **    head: <fn>,               // function to run before any templates have loaded, or before 'DOMContentLoaded' of a static page
  **    body: <fn>,               // function to run after any templates have loaded, or on 'DOMContentLoaded' of a static page

  **    state: {
  **      /**  IMPLICIT  **//*
  **      name: [copied from route],
  **      template: [copied from route],
  **      addressBar: [copied from route],
  **      /****************//*
  **      application data properties...
  **      ...
  **      ..
  **      .
  **    }
  **  }
  **/

  // A LivityRoute is a state-route, or ui-route - not a url-route
  class LivityRoute {
    constructor (name = '', data = {}) {
      const defaults = {
        name,
        // if a "static" property hasn't been set, assume a static page lives at route + .html
        static: name + ( name[name.length-1] === '/' ? 'index.html' : '.html' ),
        template: name ? ( name + '.bns' ) : '',
        addressBar: name,
        dom: {},
        actions: {},
        head: noop,
        body: noop,
        store: new LivityStore({ storeName: name, store: {} })
      }
      Object.assign(this, defaults, data)
      console.debug(this)
    }
    
    load (state, replace) {
      state[replace ? 'replace' : 'push']()
      this.render()
    }

    render () {
      this.store.clear()
      l(document).trigger('livity.route-prerender', this)

      console.debug('rendering route...')
      console.debug('name - ', this.name)
      console.debug('addressBar - ', this.addressBar)

      if (this.template) {
        l.ajax({
          url: this.template,
          headers: {
            'Accept': 'text/html'
          }
        }).then( data => {
          let dom = l.create(data)
          Array.prototype.slice.call(Array.from(dom)).forEach( node => {
            let replacement = ''
            if (node.id) {
              replacement = '#' + node.id              
            } else {
              replacement = node.tagName
            }
            const existingNode = l(replacement)
            if (existingNode.length) {
              existingNode.replaceWith(node)
            } else {
              // If all else fails, just append the node to the body
              l('body').append(node)
            }
            
          })
        }).catch( err => {
          console.error(err)
        }).then( () => {
          l(document).trigger('livity.route-postrender', this)          
        })
      } else {
        console.debug('no template to render')
      }
    }
  }
  class LivityState {
    constructor (name = '', state = {}) {
      const defaults = {
        name: '',
        template: '',
        addressBar: ''
      }

      // create or extend the state object with defaults
      Object.assign(this, defaults, state)
    }

    push () {
      this.modifyState('push')
    }

    replace () {
      this.modifyState('replace')
    }

    modifyState (method) {
      history[`${method}State`](this, this.title || this.name, this.addressBar)
    }
  }

  class LivityMap {
    constructor (collection, klass) {
      // transform map into living map of instances
      Object.keys(collection).forEach( item => {
        collection[item] = new klass(item, collection[item])
      })
      Object.assign(this, collection)
    }

    find (criterion = {}) {
      // search by "addressBar" value
      if (criterion.hasOwnProperty('addressBar')) {
        return this[Object.keys(this).find( item => {
          return this[item].addressBar === criterion.addressBar
        })]
      }
      return false
    }

    findByAddressBar (str = '') {
      return this.find({ addressBar: str })
    }
  }

  class LivityRouteMap extends LivityMap {
    constructor (routes) {
      super(routes, LivityRoute)
    }
  }

  class LivityStateMap extends LivityMap {
    constructor (states) {
      super(states, LivityState)
    }
  }
  /**
  **  LivityFramework is an interface for 
  **    Application-state routing
  **      - using history.[push|replace]State
  **      - loading of views and setting of state based on URL pathname, query,
  **        fragment, and state objects stored and pulled from window.localStorage.
  **      - generation of URL to give to someone in order to recreate a specific
  **        application state.
  **      - on-demand restoration of state from a previous session using localStorage
  **      - ability to navigate state using browser back/forward buttons
  **      - in-built ease of implementing advanced features such as auto-save and "undo" on forms
  **
  **    Types of routes:
  **      1. state
  **      2. action
  **      3. state + action
  **/
  class LivityFramework {
    constructor (config) {
      const {
        // autoSaveForms: true,
        recoverable = false,
        rendering = 'client',
        actions = {},
        routes = {},
        states = {},
        head = noop,
        body = noop,
        storeName
      } = config

      // Assign instance properties
      Object.assign(this, {
        recoverable,
        rendering,
        store: new LivityStore({ storeName, store: {} }),
        routes: new LivityRouteMap(routes),
        states: new LivityStateMap(this.stubAndAbstractStates(routes)),
        actions,
        head,
        body
      })

      if (this.isClientRendering) this.interceptApplicationLinks()

      this.setupHooks()

      window.onpopstate = ({ state }) => {
        console.debug('popstate triggered - rendering route ', state.name)
        routes[state.name].render()
      }

      this.init()
    }

    stubAndAbstractStates (routes) {
      /**
      **  abstract states out into their own map-object and extend them with selected route properties
      **/
      const stubbedStatesMap = {}

      Object.keys(routes).forEach( route => {
        const 
          routeData = routes[route],
        {
          name,
          template,
          addressBar
        } = routeData

        stubbedStatesMap[route] = Object.assign({}, { name, template, addressBar }, routeData.state)
        // delete state from route object
        routeData.state = null
        delete routeData.state
      })

      return stubbedStatesMap
    }

    setupHooks () {
      console.debug('setting up prerender and postrender hooks')

      // Callback provider for the prerender and postrender hooks
      const cbProvider = { 
        store: {
          global: this.store
        }
      }

      l(document).on('livity.route-prerender', ({ detail: route }) => {
        Object.assign(cbProvider.store, {
          // Add a new store.local() storage, overriding any previous one.
          local: route.store
        })
        
        console.debug('prerender hooks firing')
        // global head
        this.head && this.head(cbProvider)

        // route head
        route.head && route.head(cbProvider)

        // extend route actions onto global actions
        l.actions = Object.assign({}, this.actions, route.actions)
      })

      l(document).on('livity.route-postrender', ({ detail: route }) => {
        console.debug('postrender hooks firing')
        switch (this.rendering) {

          case 'client':
            // change <a>'s to <button>'s for semantic correctness
            l('a').each( elem => {
              const 
                $anchor = l(elem), 
                $children = $anchor.children().detach(),
                $button = l.create(`<button data-route=${$anchor.attr('href')}>`, true).append($children)
              ;
              $anchor.insertAfter($button).remove()
            })
          break

          case 'server':
            l(document).on('livity.view-rendered', () => {
              l('a').each( elem => {
                const $elem = l(elem), route = $elem.attr('href')
                $elem.attr('href', this.routes[route].static)          
              })        
            })
          break

        }

        Object.assign(cbProvider.store, {
          // Add a new store.local() storage, overriding any previous one.
          local: route.store
        })

        // Global body
        this.body && this.body(cbProvider)

        /** Build body() parameters
        **  1. "form" is a helper object for simple forms.  
        **    - Call bind() on it to set up a submit handler Promise which will parse the form markup
        **      to determine the appropriate "action".
        **/
        const form = {
          bind () {
            return new Promise( (resolve, reject) => {
              l('form button[type="submit"]').on('click', function (evt) {
                evt.preventDefault()
                const 
                  lbutton = l(this),
                  lform = l(this).closest('form'),
                  formaction = lbutton.attr('formaction') || lform.attr('action'),
                  formmethod = lbutton.attr('formmethod') || lform.attr('method')
                ;
                l.ajax({
                  url: formaction,
                  method: formmethod,
                  data: l.parseForm(lform)
                }).then(resolve).catch(reject)
              })
            })
          }
        }

        // Route body
        route.body && route.body(Object.assign({ form }, cbProvider))
      })
    }
    
    interceptApplicationLinks () {
      // intercept clicks on "links" (<button>'s)
      l(document).on('click', 'button[data-route]', (evt, elem) => {
        evt.preventDefault()
        const route = l(elem).attr('data-route')

        // instead of letting the browser make a page request, handle it with javascript & view injection
        console.debug('intercepting link click and loading route ', route)
        // ignore clicks on links which take us to the same route
        if (route === history.state.name) {
          console.debug('did nothing; already at route ', route)
          return
        }
        this.routes[route].load(this.states[route])
      })      
    }
    /** 
    **  init is a central component of LivityFramework.  It takes care of the following:
    **  1. checks if this is a "recoverable" application
    **  2. checks if history.state is currently null
    **    - if so, find the state which should be set by searching the state-table by "addressBar", and set it
    **    - if history.state is not null, lookup the state in the state-table, by the "name" property in history.state, and set it
    **/
    init () {
      if (this.recoverable) {
        return this.recoverState()
      } else {
        console.debug('skipping app recovery - clearing localStorage...')
        localStorage.clear()
      }

      if (!this.hasState) { // When loading the page for the first time
        console.debug('history.state is null, so replacing entry')
        const 
          { pathname } = window.location,
          lastChar = pathname.length - 1,
          // Strip trailing '/' if not the only character
          routeName = lastChar && pathname[lastChar] === '/' ? pathname.slice(0, lastChar) : pathname,
          route = this.routes.findByAddressBar(routeName)
        ;
        if (!route) {
          throw new ReferenceError(`No route by the name of ${window.location.pathname}.`)
        }
        route.load(this.states[route.name], true)
      } else {
        console.debug('history.state already exists so using it to render route')
        const routeName = history.state.name
        this.routes[routeName].render(this.states[routeName])
      }
    }

    recoverState (app) {
      // push all the states from localStorage
      console.debug('restoring application state from localStorage')
    }
    
    set rendering (mode) {
      this._rendering = mode.toLowerCase()
    }

    get rendering () {
      return this._rendering
    }

    get isClientRendering () {
      return this.rendering === 'client'
    }

    get isServerRendering () {
      return this.rendering === 'server'
    }

    get hasState () {
      return window.history.state !== null
    }
  }
  
  Object.assign(window, {
    l,
    Livity: LivityFramework
  })
    
  // non-obtrusive prototype methods
  Object.prototype.forIn = function (callback) {
    for (let key in this) {
      if (this.hasOwnProperty(key)) {
        callback(key, this[key], this)
      }
    } 
  }
  Object.prototype.getByPropDescriptor = function (str) {
    return str.split('.').reduce((obj, key) => obj[key], this)
  }
  Object.defineProperty(Object.prototype, 'getByPropDescriptor', {
    enumerable: false 
  })
  Object.defineProperty(Object.prototype, 'forIn', {
    enumerable: false 
  })
  Array.prototype.find = function (predicate) {
    let ret
    const foundMatch = this.some( item => {
      ret = item
      return predicate(item)
    })
    return foundMatch && ret
  }
  // This already exists natively, but has no support in IE 11
  Array.prototype.findIndex = function (predicate) {
    let index = -1
    this.some( (item, i) => {
      if (predicate(item, i)) {
        index = i
        return true
      }
    })
    return index
  }
  Array.fromDOM = function (dom = []) {
    if (Array.isArray(dom)) { return dom }
    if (dom instanceof Node) { return [dom] }
    if (dom instanceof HTMLCollection || dom instanceof NodeList) { return Array.from(dom) }
  }
  JSON.parseSafe = function (obj) {
    try {
      return JSON.parse(obj)
    } catch (e) {
      return false
    }
  }
  // override
  console.debug = ( debug => debug ? console.log.bind(window, 'DEBUG:::') : noop )(window.DEBUG)
})()
