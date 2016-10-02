;(() => {
  let _originalHandlers = [], _listeners = []
  const noop = () => {}

  class Listener {
    constructor (elem, type, handler, _wrappedHandler, target) {
      Object.assign(this, { elem, type, handler, _wrappedHandler, target })
    }
    
    register () {
      this.elem.addEventListener(this.type, this._wrappedHandler)
      // listener = prep(this)
      this.index = _originalHandlers.length
      _originalHandlers.push(this.handler)
      _listeners.push(this)
      if (_listeners.length % 10 === 0) {
        console.log('Just reached %s event listeners', _listeners.length)
      }
    }

    // DOC: Does not consider delegated targets when deregistering
    deregister () {
      Listener.handlerIndices(this.handler).filter(function (i) {
        return _listeners[i].type === this.type && _listeners[i].elem === this.elem
      }, this).forEach( i => {
        _originalHandlers.splice(i, 1)
        const listener = _listeners.splice(i, 1)[0]
        this.elem.removeEventListener(listener.type, listener._wrappedHandler)
      }, this)
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

    static handlerIndices (handler) {
      var i = 0, indices = []
      while (~(i = _originalHandlers.indexOf(handler, i+1))) {
        indices.push(i)
      }
      return indices
    }

    static getListeners (c) {
      var filter
      switch (typeof c) {
        case 'string':
          filter = 'type'
          break;
        case 'object':
          filter = 'elem'
          break;
        case 'function':
          filter = 'handler'
          break;
        default:
          throw new ReferenceError('Faulty criteria passed to Listener.getListeners')
      }        
      return _listeners.filter(function (listener) {
        return (filter === 'elem' ? listener[filter] 
              : listener[filter]) 
              === 
               (filter === 'elem' ? c
              : c)
      })
    }
  }

  Object.assign( EventTarget.prototype, {
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
          throw new TypeError('HTMLElement.prototype.on function signature is (event_type(String)[required], event_target(HTMLElement|String)[optional], handler(Function)[required], options(Object)[optional]')
      }
      this._on(eType, target, handler, options)
    },
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
        this.off(eType, handler)
      }

      Listener.register(new Listener(
          this
        , eType
        , handler
        , options.once ? wrappedHandlerOnce : wrappedHandler
        , target
      ))

      return this 
    },
    once () {
      this.on.apply(this, [...arguments, { once: true }])
    },
    off (eType, handler) {
      Listener.deregister(new Listener(this, eType, handler))
    },
    deregisterEvents () {
      Listener.deregisterDOMNode(this)
      return this
    },
    trigger (eventName, detail) {
      var customEvent = function () {
        var customEvent
        try {
          customEvent = new CustomEvent(eventName, detail)
        } catch (e) {
          customEvent = document.createEvent('CustomEvent')
          customEvent.initEvent(eventName, true, true, detail)
        }
        return customEvent
      }
      this.dispatchEvent(customEvent())
      return this
    },
    getListeners: Listener.getListeners,
    class (classes) {
      if (classes) 
        this.className = classes
      else
        return this.className
      return this    
    }
  })
})()
