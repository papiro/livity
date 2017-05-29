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
          break
        case 'string':
          filter = 'type'
          break
        case 'object':
          filter = 'elem'
          return _evtData.get(c)
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

    append (children) {
      this.forEach( elem => {
        [...children].forEach( child => {
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

    trim (str) {
      return str.replace(/(^\s*)|(\s*$)/g, '')
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
    create (elem, returnWrapped) {
      let newElement
      elem = l.trim(elem)
      if (elem[0] === '<') {
        const temp = document.createElement('div')
        temp.innerHTML = elem
        newElement = ( temp.childElementCount === 1 ? temp.firstChild : temp.children )
      } else {
        newElement = document.createElement(elem)
      }
      return returnWrapped ? l(newElement) : newElement
    },

    modal: {
      count: 0,
      open (content) {
        l('body').append(
          l.create(`
            <div id="livityModal" class="modal" 
                 style="top: ${++this.count * 5}vh; left: ${this.count * 5}vw;">
              <span class="modal_close">X</span>
              ${content}
            </div>
          `)
        )
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
    }
  })

  class UrlUtils {
    static parseRoute (url = window.location.href) {
      const [, route, query] = url.match(/(?:https?:\/\/[^\/]*)?([^?]*)(\?.*)?/)
      return {
        route,
        query: l.deserialize(query)
      }
    }
  }
  /***
  **  LivityStore is a wrapper for the browsers's localStorage api,
  **    providing object-like syntax for getting and setting to it.
  ***/
  class LivityStore extends Proxy {
    constructor (name = 'livity') {
      // setup Proxy interface for localStorage
      super({}, {
        get (target, prop) {
          return target[prop]
        },
        set (target, prop, val) {
          target[prop] = val
          localStorage.setItem(name, target)
        }
      })
    }
  }

  // A LivityRoute is a state-route, or ui-route - not a url-route
  class LivityRoute {
    constructor (name = '', data = {}) {
      const defaults = {
        name,
        // if a "static" property hasn't been set, assume a static page lives at route + .html
        static: name + ( name[name.length-1] === '/' ? 'index.html' : '.html' ),
        template: name + '.bns',
        addressBar: name,
        dom: {},
        actions: {},
        head: noop,
        body: noop
      }

      Object.assign(this, defaults, data)
    }
    
    load (replace, state) {
      state(replace ? 'replace' : 'push')()
      this.render()
    }

    render () {
      l(document).trigger('livity.route-prerender', this)

      console.debug('rendering route...')
      console.debug('name - ', this.name)
      console.debug('addressBar - ', this.addressBar)

      if (this.template) {
        l.ajax({
          url,
          headers: {
            'Accept': 'text/html'
          }
        }).then( ({ response }) => {
          let dom = l.create(response)
          if (dom instanceof Node) {
            dom = [dom]
          }
          Array.prototype.slice.call(dom).forEach( node => {
            let replacement = node.tagName
            if (!~uniqueTags.indexOf(node.tagName)) {
              replacement = '#' + node.id
            }
            l(replacement).replaceWith(node)
          })
        }).catch( err => {
          console.error(err)
        })
      } else {
        console.debug('no template to render')
      }
      l(document).trigger('livity.route-postrender', this)
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
  class LivityState {
    constructor (state) {
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
  **  The HistoryStateCreator is an interface for 
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
      const defaults = {
        // autoSaveForms: true,
        recoverable: false,
        rendering: 'client',
        actions: {},
        routes: {},
        states: {},
        head: noop,
        body: noop,
        storeName
      }

      config = Object.assign(defaults, config)

      // Assign instance properties
      Object.assign(this, {
        recoverable,
        rendering,
        store: new LivityStore(config.storeName),
        routes: new LivityRouteMap(config.routes),
        states: new LivityStateMap(this.stubAndAbstractStates(config)),
        actions,
        head,
        body
      })

      if (this.isClientRendering) this.interceptApplicationLinks()

      this.setupHooks()

      window.onpopstate = ({ state }) => {
        console.debug('popstate triggered - rendering route ', state.name)
        this.routes[state.name].render()
      }

      this.init()
    }

    stubAndAbstractStates (config) {
      /**
      **  abstract states out into their own map-object and extend them with selected route properties
      **/
      const stubbedStatesMap = {}

      Object.keys(config.routes).forEach( route => {
        const 
          routeData = config.routes[route],
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
      l(document).on('livity.view-prerender', (route) => {
        // global head
        this.head && this.head()

        // route head
        route.head && route.head()

        // extend route actions onto global actions
        l.actions = Object.assign({}, this.actions, route.actions)
      })

      l(document).on('livity.view-postrender', (route) => {
        switch (this.rendering) {

          case 'client':
            // change <a>'s to <button>'s for semantic correctness
            l('a').each( elem => {
              const 
                $anchor = l(anchor), 
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
      })

      // global body
      this.body && this.body()

      // route body
      route.body && route.body()
    }
    
    interceptApplicationLinks () {
      // intercept clicks on "links" (<button>'s)
      l(document).on('click', 'button[data-route]', (evt, elem) => {
        evt.preventDefault()
        const route = l(elem).attr('data-route')

        // instead of letting the browser make a page request, handle it with javascript & view injection
        console.debug('intercepting link click and loading route ', route)
        // ignore clicks on links which take us to the same route
        if (route === window.location.pathname) {
          console.debug('did nothing; already at route ', route)
          return
        }
        this.loadRoute(route)
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
        console.debug('clearing localStorage...')
        localStorage.clear()
      }

      if (!this.hasState) { // When loading the page for the first time
        console.debug('history.state is null, so replacing entry')
        const route = this.routes.findByAddressBar(window.location.pathname)
        route.load(true, this.states[route.name])
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
      this.rendering = mode.toLowerCase()
    }

    get isClientRendering () {
      return this.rendering === 'client'
    }

    get isServerRendering () {
      return this.rendering === 'server'
    }

    static get hasState () {
      return window.history.state !== null
    }
  }
  
  class HistoryStateCreator extends RouterCreator {
    
    constructor (config) {
      super(Object.assign(config, { storeName: 'livityStates' }))
      // Assign instance properties
      Object.assign(this, {
        // Reset app to first tick
        tick: 1
      })
    }
  }

  Object.assign(window, {
    l
  })
    
  // non-obtrusive prototype methods
  Object.prototype.forIn = (callback) => {
    for (let key in this) {
      if (this.hasOwnProperty(key)) {
        callback(key, this[key], this)
      }
    } 
  }
  Array.prototype.find = function (predicate) {
    let ret
    this.some( item => {
      ret = item
      return predicate(item)
    })
    return ret
  }
  // override
  console.debug = ( debug => debug ? console.log.bind(window, 'DEBUG:::') : noop )(window.DEBUG)
})()
