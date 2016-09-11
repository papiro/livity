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

  class Listener {
    constructor (elem, type, handler, _wrappedHandler, target) {
      Object.assign(this, {
        elem,
        type,
        handler,
        _wrappedHandler,
        target
      })
    }
    
    register () {
      this.elem.native.addEventListener(this.type, this._wrappedHandler)
      // listener = prep(this)
      this.index = _originalHandlers.length
      _originalHandlers.push(this.handler)
      _listeners.push(this)
      if (_listeners.length % 10 === 0) {
        console.log('Just reached %s event listeners', _listeners.length)
      }
    }

    // DOC: Does not consider delegated targets when deregisterting
    deregister () {
      Listener.handlerIndices(this.handler).filter(function (i) {
        return _listeners[i].type === this.type && _listeners[i].elem.native === this.elem.native
      }, this).forEach(function (i) {
        _originalHandlers.splice(i, 1)
        listener = _listeners.splice(i, 1)[0]
        this.elem.native.removeEventListener(listener.type, listener._wrappedHandler)
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
      _listeners.filter(function (listener) {
        return listener.elem.native === elem.native
      }).forEach(function (listener) {
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
          throw new ReferenceError('Faulty criteria passed to livity.event.getListeners')
      }        
      return _listeners.filter(function (listener) {
        return (filter === 'elem' ? listener[filter].native 
              : listener[filter]) 
              === 
               (filter === 'elem' ? c.native
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
    on (verboseEventType, handler, options) {
      if (!this.native) return this;  // null

      var options = options || {}
      ,   temp = verboseEventType.split(' ')
      ,   eventType = temp.shift()

      if( / on /.test(verboseEventType) ) {
        var targetElem = temp.pop()
      }
      // options.cache && options.stack
      function wrappedHandler (evt) {
        if (!targetElem) return handler.bind(dom(this))(evt)
        if (evt.target === evt.currentTarget) return
        var iteration = evt.target
        ,   targetElems = Array.prototype.slice.call(evt.currentTarget.querySelectorAll(targetElem))
        do {
          if( ~targetElems.indexOf(iteration) ) {
            return handler.bind(dom(iteration))(evt, dom(evt.currentTarget))
          }
          iteration = iteration.parentElement 
        } while( iteration !== evt.currentTarget )     
      }

      function wrappedHandlerOnce (evt) {
        wrappedHandler.call(this, evt)
        dom(this).unlisten(eventType, handler)
      }

      Listener.register(new Listener(
          this
        , eventType
        , handler
        , options.once ? wrappedHandlerOnce : wrappedHandler
        , targetElem
      ))

      return this 
    },
    once () {
      Array.prototype.push.call(arguments, {once : true})
      this.listen.apply(this, arguments)
    },
    off (eventType, handler) {
      Listener.deregister(new Listener(this, eventType, handler))
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
      this.native.dispatchEvent(customEvent())
      return this
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

  // sandbox for code during (and maybe after) development
  var safe = function (code) {
    return function() {
      try {
        return code.apply(this, arguments)
      } catch (e) {
        console.trace(e)
      }
    }
  }
  var htmlElement = {}
  htmlElement.prototype = {
    class: safe(function (classes) {
      if (classes) 
        this.native.className = classes
      else
        return this.native.className
      return this    
    }),
    style: safe(function (prop, val) {
      if (typeof prop === 'object') {
        util.each(prop, function (prop, val) {
          this.style(prop, val)
        }.bind(this))
        return this
      } else if (val !== undefined && val !== null) {
        if (typeof val === 'number' && !~['opacity', 'z-index'].indexOf(prop)) val += 'px'
        this.native.style[prop] = val
        return this
      } else {
        var style = window.getComputedStyle(this.native)
        return prop ? style[prop] : style
      }
    }),
    classtoggle: safe(function (cname) {
      if (RegExp(cname).test(this.native.className)) {
        this.native.className = this.native.className.replace(RegExp(' '+cname+'|'+cname+' |'+cname, 'g'), '')
      } else {
        this.native.className += ' ' + cname
      }
      
      return this
    }),
    offset: safe(function () {
      return {
        top: this.native.offsetTop,
        left: this.native.offsetLeft,
        right: this.native.offsetRight
      }
    }),
    height: safe(function () {
      return this.native.offsetHeight
    }),
    innerHeight: safe(function () {
      return this.native.clientHeight
    }),
    outerHeight: safe(function () {
      return this.native.scrollHeight
    }),
    width: safe(function () {
      return this.native.offsetWidth
    }),
    innerWidth: safe(function () {
      if (this.selector === 'window') return this.native.innerWidth
      else return this.native.clientWidth
    }),
    outerWidth: safe(function () {
      return this.native.scrollWidth
    }),
    show: safe(function (block) {
      var elemStyle = this.native.style
      elemStyle.display = block ? 'block' : 'flex'
      elemStyle.visibility = 'visible'
      return this
    }),
    hide: safe(function (noreflow) {
      this.native.style[noreflow ? 'visibility' : 'display'] = noreflow ? 'hidden' : 'none'
      return this
    }),
    toggle: safe(function (show) {
      return this[show ? 'show' : 'hide']()
    }),
    append: safe(function (elem) {
      elem = elem instanceof htmlElement ? elem.native : elem
      this.native.appendChild(elem)
      return this
    }),
    prepend: safe(function (elem) {
      elem = elem instanceof htmlElement ? elem.native : elem
      this.native.insertBefore(elem, this.native.firstChild)
      return this
    }),
    appendTo: safe(function (elem) {
      dom(elem).append(this)
      return this
    }),
    prependTo: safe(function (elem) {
      dom(elem).prepend(this)
      return this
    }),
    inner: safe(function (elem) {
      this.clear()
      elem = elem instanceof htmlElement ? elem.native : elem
      if (typeof elem === 'string') this.native.innerHTML = elem
      else this.append(elem)
      return this    
    }),
    clear: safe(function () {
      var child
      while (child = this.native.firstChild) {
        this.native.removeChild(child)
      }
      return this
    }),
    remove: safe(function (elem) {
      elem = ( typeof elem === 'string' ? dom(elem).native : elem ) || this.native
      elem.parentNode && elem.parentNode.removeChild(elem)
      return elem
    }),
    replaceWith: safe(function (elem) {
      this.native.parentNode.replaceChild(elem.native || elem, this.native)
      return dom(elem)
    }),
    clone: safe(function (deep) {
      return dom(this.native.cloneNode(deep))
    }),
    next: safe(function () {
      return dom(this.native.nextElementSibling)
    }),
    parent: safe(function () {
      return dom(this.native.parentNode)
    }),
    child: safe(function () {
      return dom(this.native.firstChild)
    }),
    previous: safe(function () {
      return dom(this.native.previousElementSibling)
    }),
    isImg: safe(function () {
      return !!(this.native && this.native.nodeName === 'IMG')
    })
  }
})()
