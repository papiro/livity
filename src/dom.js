'use strict';

/****
 ** LivityJS mutates the HTMLElement prototype.
 ** If you don't want this behavior then don't use it, but here are the reasons it was designed as such:
 ** 1. You can use any native DOM API method you'd like to select your element, which would be faster than
 **   using the $ method.
 ** 2. When using getElementsByClassName or getElementsByTagName or getElementsByName, you can use normal
 **   array methods to traverse/map/filter the collection which will be faster than custom methods.
 ** 3. No needing to make sure your element is wrapped before calling one of LivityJS's methods on it.
****/

;(function () {

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
      }, this).forEach(function (i) {
        _originalHandlers.splice(i, 1)
        listener = _listeners.splice(i, 1)[0]
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

  Object.assign( HTMLElement.prototype, {
    find (query) {
      return $(query, this)
    },
    attr (name, value) {
      if (!name) {
        let attrMap={};
        for (let i=0; i<this.attributes.length; i++) {
          const attribute = this.attributes[i]
          attrMap[attribute.name] = attribute.value
        }
        return attrMap
      }

      if (value === undefined) {
        return this.getAttribute(name)
      }

      this.setAttribute(name, value)
      return this
    },
    text (text) {
      return text ? (this.textContent = text) && this : this.textContent
    },
    on (eType, ...args) {
      // Handle overloaded function without changing variable types
      let target, handler, options
      switch (args.length) {
        case 1:
          target = null
          handler = args[0]
          options = {}
          break
        case 2:
          target = null
          handler = args[0]
          options = args[1] 
          break
        case 3:
          // if target is a string, run it as a selector
          target = ( typeof args[0] === 'string' ? $(args[0]) : args[0] )
          handler = args[1]
          options = args[2]
          break
        default:
          throw new TypeError('HTMLElement.prototype.on function signature is (event_type(String)[required], event_target(HTMLElement|String)[optional], handler(Function)[required], options(Object)[optional]')
      }
      this._on(eType, target, handler, options)
    },
    _on (eType, target, handler, options) {
      // options.cache && options.stack
      function wrappedHandler (evt) {
        if (!target) return handler.bind(this)(evt)
        let iteration = evt.target
        const targets = [...evt.currentTarget.querySelectorAll(target)]
        do {
          if( ~targets.indexOf(iteration) ) {
            return handler.bind(iteration)(evt)
          }
          iteration = iteration.parentElement 
        } while( iteration !== evt.currentTarget )     
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
      this.on.apply(this, [...arguments].push({ once: true }))
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
    getListeners: Livity.getListeners,
    class (classes) {
      if (classes) 
        this.className = classes
      else
        return this.className
      return this    
    },
    style (prop, val) {
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
    },
    classtoggle (cname) {
      if (RegExp(cname).test(this.className)) {
        this.className = this.className.replace(RegExp(' '+cname+'|'+cname+' |'+cname, 'g'), '')
      } else {
        this.className += ' ' + cname
      }
      
      return this
    },
    offset () {
      return {
        top: this.offsetTop,
        left: this.offsetLeft,
        right: this.offsetRight
      }
    },
    height () {
      return this.offsetHeight
    },
    innerHeight () {
      return this.clientHeight
    },
    outerHeight () {
      return this.scrollHeight
    },
    width () {
      return this.offsetWidth
    },
    innerWidth () {
      if (this.selector === 'window') return this.innerWidth
      else return this.clientWidth
    },
    outerWidth () {
      return this.scrollWidth
    },
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
      elem = elem instanceof htmlElement ? elem : elem
      this.appendChild(elem)
      return this
    },
    prepend (elem) {
      elem = elem instanceof htmlElement ? elem : elem
      this.insertBefore(elem, this.firstChild)
      return this
    },
    appendTo (elem) {
      dom(elem).append(this)
      return this
    },
    prependTo (elem) {
      dom(elem).prepend(this)
      return this
    },
    inner (elem) {
      this.clear()
      elem = elem instanceof htmlElement ? elem : elem
      if (typeof elem === 'string') this.innerHTML = elem
      else this.append(elem)
      return this    
    },
    clear () {
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
      return dom(this.cloneNode(deep))
    },
    next () {
      return dom(this.nextElementSibling)
    },
    parent () {
      return dom(this.parentNode)
    },
    child () {
      return dom(this.firstChild)
    },
    previous () {
      return dom(this.previousElementSibling)
    },
    isImg () {
      return !!(this && this.nodeName === 'IMG')
    }
  })

  var create = function (elem) {
    if (elem[0] === '<') {
      var temp = document.createElement('div')
      temp.innerHTML = elem
      return temp.childElementCount === 1 ? new htmlElement(temp.firstChild) : temp.children
    }
    return new htmlElement(document.createElement(elem))
  }
})()
