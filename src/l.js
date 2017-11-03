'use strict'

window.DEBUG = true

;(() => {

  const 
    // utility for ajax
    _openAndReturnReq = (method, url) => {
      const req = new XMLHttpRequest()
      req.open(method, url)
      return req
    }
  ;

  /** STATICS **/
  Object.assign(L, {
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
    create (elem, returnWrapped = false) {
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
      modals: new Map(),
      count: 0,
      open ({ html, width, height, onClose, color }) {
        const modal = l.create(
        `
          <div id="livityModal${this.count}" class="modal">
            <span class="modal_close" data-rel="livityModal${this.count}"></span>
            ${html}
          </div>
        `)[0]
        const lmodal = l(modal)
        this.modals.set(modal, { onClose })
        const modal_close = lmodal.find('.modal_close')
        modal_close.on('click', (...args) => {
          const modalConfig = this.modals.get(modal) 
          if (modalConfig.onClose) {
            modalConfig.onClose()
          }
          this.modals.delete(modal)
          modal.remove()
        })
        const numModals = this.modals.size
        lmodal.css({
          top: numModals * 5 + 'vh',
          left: numModals * 5 + 'vw',
        })
        if (height) modal.style.height = height
        if (width) modal.style.width = width
        if (color) modal.style.color = color
        
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
    L,
    Livity: LivityFramework
  })
    
  Object.defineUnenumerableProperty = function (prop, proto = Object.prototype) {
    [].concat(prop).forEach( prop => {
      Object.defineProperty(proto, prop, {
        enumerable: false 
      })
    })
  }
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
  // This already exists natively, but has no support in IE 11
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
  Object.defineUnenumerableProperty(['getByPropDescriptor', 'forIn'])
  Object.defineUnenumerableProperty(['find', 'findIndex'], Array.prototype)
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
