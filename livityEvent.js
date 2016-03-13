var livity = livity || {}
livity.event = (function() {

var dom = livity.dom
,   util = livity.util
,   event = {}

var listeners = event.listeners = {}

if (dom && dom.htmlElement) {
  util.extend(dom.htmlElement.prototype, {
    // eventType may be of the form 'click on li', 'hover on a', etc.. in the case of listen being called on a delegate
    listen: dom.safe(function (verboseEventType, handler, options) {
      if (!this.native) return this;
      var options = options || {}
      
      var temp = verboseEventType.split(' ')
      ,   eventType = temp.shift()

      if( / on /.test(verboseEventType) ) {
        var targetElem = temp.pop()
      }

      // Track event listener handlers so we can remove them
      listeners[this.selector] = listeners[this.selector] || {}
      listeners[this.selector][verboseEventType] = listeners[this.selector][verboseEventType] || {}
      var handlerKey = handler.toString(), handlerRef
      if (handlerRef = listeners[this.selector][verboseEventType][handlerKey]) {
        if (!options.cache) {
          //  TODO: create an 'unlisten'
          this.native.removeEventListener(eventType, handlerRef)
          delete listeners[this.selector][verboseEventType][handlerKey]
        } else return this
      } 

      listeners[this.selector][verboseEventType][handlerKey] = wrappedHandler

      function wrappedHandler (evt) {
        if (!targetElem) return handler.bind(dom(this))(evt)
        if (evt.target === evt.currentTarget) return
        var iteration = evt.target
        do {
          if( ~Array.prototype.slice.call(evt.currentTarget.querySelectorAll(targetElem)).indexOf(iteration) ) {
            return handler.bind(dom(iteration))(evt, dom(evt.currentTarget))
          }
          iteration = iteration.parentElement 
        } while( iteration !== evt.currentTarget )     
      }

      this.native.addEventListener(eventType, listeners[this.selector][verboseEventType][handlerKey])
      return this 
    }),
    unlisten: dom.safe(function () {

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
}

dom.DOMContentLoaded = function (callback) {
  if( document.readyState === 'complete' ) return callback()
  dom(document).listen('DOMContentLoaded', function() {
    callback()
  })
}

return event
})()
