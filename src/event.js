var livity = livity || {}
livity.event = (function() {

var dom = livity.dom
,   util = livity.util
,   event = {}

var _originalHandlers = [], _listeners = []

function Listener (elem, type, handler, _wrappedHandler, target) {
  this.elem = elem
  this.type = type
  this.handler = handler
  this._wrappedHandler = _wrappedHandler
  this.target = target
}

util.extend(Listener.prototype, {
  register: function () {
    this.elem.native.addEventListener(this.type, this._wrappedHandler)
    // listener = prep(this)
    this.index = _originalHandlers.length
    _originalHandlers.push(this.handler)
    _listeners.push(this)
    if (_listeners.length % 10 === 0) {
      console.log("Just reached %s event listeners", _listeners.length)
    }
  },
  // DOC: Does not consider delegated targets when unregisterting
  unregister: function () {
    handlerIndices(this.handler).filter(function (i) {
      return _listeners[i].type === this.type && _listeners[i].elem === this.elem  
    }).forEach(function (i) {
      _originalHandlers.splice(i, 1)
      this.elem.removeEventListener(this.type, this._wrappedHandler)
    })
  }
  // _prep: function (listener) {
  //   if (listener.target) {
  //     listener.target = listener.elem.native.querySelectorAll(listener.target) // TODO: make dom multi-node friendly
  //   }
  // },
})

util.extend(Listener, {
  /*convenience methods*/
  register: function (listener) {
    listener.register()
  },
  unregister: function (listener) {
    listener.unregister()
  },
  /*********************/
  unregisterDOMNode: function (node) {
    _listeners.filter(function (listener) {
      return listener.elem === node
    }).forEach(function (listener) {
      var i = listener.index, handler = _originalHandlers.splice(i, 1)
      listener.elem.removeEventListener(listener.type, handler)
      _listeners.splice(i, 1)
    })
  },
  handlerIndices: function (handler) {
    var i = 0, indices = []
    while (~(i = _originalHandlers.indexOf(handler, i))) {
      indices.push(i)
    }
    return indices
  }
})

util.extend(dom.htmlElement.prototype, {
  // eventType may be of the form 'click on li', 'hover on a', etc.. in the case of listen being called on a delegate
  listen: dom.safe(function (verboseEventType, handler, options) {
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

    Listener.register(new Listener(this, eventType, handler, wrappedHandler, targetElem))

    return this 
  }),
  unlisten: dom.safe(function (eventType, handler) {
    Listener.unregister(new Listener(this, eventType, handler))
  }),
  trigger: dom.safe(function (eventName, detail) {
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
  })
})

dom.DOMContentLoaded = function (callback) {
  if( document.readyState === 'complete' ) return callback()
  dom(document).listen('DOMContentLoaded', function() {
    callback()
  }, {stack: true})
}

return event
})()
