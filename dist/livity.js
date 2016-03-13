var livity = livity || {}
livity.util = (function() {

var util = {
  each: function (obj, callback) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        callback(key, obj[key], obj)
      }
    }
  },
  extend: function () {
    return Array.prototype.slice.call(arguments, 1).reduce(function (previous, current) {
      util.each(current, function (key, val) {
        previous[key] = val
      })
      return previous
    }, arguments[0])
  }
}

return util
})()
var livity = livity || {}
livity.ajax = (function() {

var ajax = {}

ajax.GET = function(url, success, failure, always) {
  var req = new XMLHttpRequest()

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      switch (Math.floor(req.status/100)) {
        case 4:
        case 5:
          failure && failure(req)
          break
        default:
          success && success(req)
      }
      always && always(req)
    }
  }

  req.open('GET', url)
  req.send()
}

return ajax
})()
var livity = livity || {}

livity.css = (function() {
  return {
    buildStylesheet: function (rulesets) {
      var stylesheet = document.createElement('style')
      document.head.appendChild(stylesheet)
      var sheet = stylesheet.sheet
      rulesets.reverse().forEach(function (ruleset) {
        sheet.insertRule(ruleset, 0)
      })
    }
  }
})()
var livity = livity || {}
livity.dom = (function() {

var util = livity.util
// Only supports the wrapping of one element at a time.
// This is to encourage event delegation for performance implications developers easily take for granted.
// dom() with no arguments is a wrapper for `window`
var dom = function (query, root) {
  var root = root || document
  ,   elem = window

  if (
    query instanceof htmlElement // livity.dom.htmlElement.prototype
    ) return query

  else if (
    query instanceof HTMLElement // native
    ||
    query instanceof Document
    ) elem = query
  
  else if (
    typeof query === 'string' 
    ) {
      var selector = query
      if (!selector.indexOf('#')) {
        elem = root.getElementById(selector.slice(1))
      } else elem = root.querySelector( query )
    }

  else if (
    query && query.length
    ) elem = query[0]

  return new htmlElement(elem, selector)
}

dom.create = function (elem) {
  if (elem[0] === '<') {
    var temp = document.createElement('div')
    temp.innerHTML = elem
    return temp.childElementCount === 1 ? new htmlElement(temp.firstChild) : temp.children
  }
  return new htmlElement(document.createElement(elem))
}

var htmlElement = function (elem, selector) {
  this.native = elem
  switch (elem) {
    case window:
      this.selector = 'window'
      break;
    case document:
      this.selector = 'document'
      break;
    default:
      this.selector = selector
  }
}

// sandbox for code during (and maybe after) development
var safe = dom.safe = function (code) {
  return function() {
    try {
      return code.apply(this, arguments)
    } catch (e) {
      console.trace(e)
    }
  }
}

// make the htmlElement prototype public
dom.htmlElement = htmlElement

htmlElement.prototype = {
  find: safe(function (selector) {
    return dom(selector, this.native)
  }),
  // terse name for 'attributes'
  at: safe(function (name, value) {
    if (!name) {
      for (var i=0, native=this.native, atMap={}; i<native.attributes.length; i++) {
        var attribute = attributes[i]
        atMap[attribute.name] = attribute.value
      }
      return atMap
    }

    if (value === undefined) {
      return this.native.getAttribute(name)
    }

    this.native.setAttribute(name, value)
    return this
  }),
  text: safe(function (text) {
    if (text) {
      this.native.textContent = text
      return this
    } else
      return this.native.textContent
  }),
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
    } else if (val) {
      if (typeof val === 'number') val += 'px'
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
  offset: safe(function (set) {
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
    return this.native.clientWidth
  }),
  outerWidth: safe(function () {
    return this.native.scrollWidth
  }),
  show: safe(function () {
    var elemStyle = this.native.style
    elemStyle.display = 'flex'
    elemStyle.visibility = 'visible'
    return this
  }),
  hide: safe(function (noreflow) {
    this.native.style[noreflow ? 'visibility' : 'display'] = noreflow ? 'hidden' : 'none'
    return this
  }),
  append: safe(function (elem) {
    elem = elem instanceof htmlElement ? elem.native : elem
    this.native.appendChild(elem)
    return this
  }),
  appendTo: safe(function (elem) {
    return dom(elem).append(this)
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
    elem.parentNode.removeChild(elem)
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
  previous: safe(function () {
    return dom(this.native.previousElementSibling)
  }),
  isImg: safe(function () {
    return !!(this.native && this.native.nodeName === 'IMG')
  })
}

return dom
})()
window.livity = livity || {}
livity.generate = (function() {

var generate = function(domstruct) {
  var newNodes = []
  util.each(config, function(element, properties) {
    newNodes.push(dom.create(element).style(properties))
  })
  return newNodes.length === 1 ? newNodes[0] : newNodes
}

return generate
})
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
        if (options.cache) return this
        if (!options.stack) {
          this.unlisten(eventType, handlerRef)
          delete listeners[this.selector][verboseEventType][handlerKey]          
        }
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
    unlisten: dom.safe(function (eventType, handlerRef) {
      this.native.removeEventListener(eventType, handlerRef)
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
  }, {stack: true})
}

return event
})()
var livity = livity || {}
livity.router = (function() {

var dom = livity.dom
,   ajax = livity.ajax

var router = function (view) {
  dom().listen('hashchange', function() {
    var hash = window.location.hash
    ajax.GET(dom('#'+hash.slice(1)).at('src'), function (req) {
      dom(view).inner(req.response)
      dom(document).trigger('view.'+hash.slice(2))
    })
    router.initialized = true
  })
  window.location.hash && !router.initialized && dom().trigger('hashchange')
}

return router
})()
livity.css.buildStylesheet([
  '.livity-overlay {\
    display: none;\
    position: fixed;\
    top: 7%;\
    right: 0;\
    bottom: 7%;\
    left: 0;\
  }',
  '.livity-overlay-x {\
    position: fixed;\
    z-index: 1;\
    color: hsla(0, 0%, 75%, 0.65);\
    text-shadow: 0 0 0.2em black;\
    cursor: pointer;\
    top: 12%;\
    right: 5%;\
    font-size: 60px;\
  }',
  '.livity-overlay-x:hover {\
    color: hsla(81, 44%, 75%, 1);\
  }'
])
var livity = livity || {}
livity.WebUIComponents = livity.WebUIComponents || []

livity.css.buildStylesheet([
  '[data-livity-gallery] {\
    display: flex;\
    flex-wrap: wrap;\
    text-align: center;\
    justify-content: center;\
  }',
  '[data-livity-gallery] h2 {\
    width: 100%;\
  }',
  '[data-livity-gallery] img {\
    cursor: pointer;\
    margin: 0.7em;\
  }',
  '[data-livity-gallery-overlay] img {\
    position: relative;\
    margin: auto;\
    width: auto;\
    max-width: 100%;\
    max-height: 100%;\
    box-shadow: 0 0 7em 5em hsla(100, 100%, 0%, 0.8);\
    transition: left 4s, right 4s;\
  }',
  '.livity-overlay-right,\
  .livity-overlay-left {\
    position: fixed;\
    color: hsla(0, 0%, 75%, 1);\
    cursor: pointer;\
  }',
  '.livity-overlay-right,\
  .livity-overlay-left {\
    z-index: 1;\
    top: 45%;\
    font-size: 4em;\
  }',
  '.livity-overlay-right {\
    right: 2%;\
    text-shadow: -0.05em 0 0.05em white;\
  }',
  '.livity-overlay-left {\
    left: 2%;\
    text-shadow: 0.05em 0 0.05em white;\
  }',
  '.livity-overlay-right:hover,\
  .livity-overlay-left:hover {\
    color: hsla(81, 44%, 75%, 1);\
  }'
])

livity.dom.DOMContentLoaded(function() {
  livity.dom.create('div')
    .at('data-livity-gallery-overlay', '')
    .at('id', 'overlay')
    .class('livity-overlay')
    .append(livity.dom.create('span')
      .at('data-x', '')
      .class('livity-overlay-x')
      .inner('&#x2716;'))
    .append(livity.dom.create('span')
      .at('data-right', '')
      .class('livity-overlay-right')
      .inner('&#xbb;'))
    .append(livity.dom.create('span')
      .at('data-left', '')
      .class('livity-overlay-left')
      .inner('&#xab;'))
  .appendTo('body')
})

livity.WebUIComponents.push((function() {
  var dom = window.livity.dom
  
  var gallery = function() {
    dom('[data-livity-gallery]').listen('click on img', function (evt) {
      dom.htmlElement.prototype.transformSrc = function () {
        return this.isImg()
          && ( this.at('data-target') || this.at('src').replace('thumbs/', "") )
      }

      var cache = [{
        thumb: this.previous()
      },{
        thumb: this
      },{
        thumb: this.next()
      }], position = 1, x = dom('[data-x]')

      // Load the clicked image
      cache[1].img = newPreloadedImage(cache[1].thumb)

      // When the first image is finished loading, pre-load the previous and the next
      dom(cache[1].img).listen('load', function() {
        for (var i=0, j=[0,2]; i<2; i++) {
          cache[j[i]].img = newPreloadedImage(cache[j[i]].thumb)
        }
        positionGalleryControls(this)
        x.show()
      })
      x.hide(true)
      dom('[data-livity-gallery-overlay]')
        .append(cache[1].img)
        .listen('click on [data-x]', function (evt, overlay) {
          overlay.hide().find('img').remove()
        }, {cache: true})
        .listen('click on [data-right]', function (evt, overlay) {
          scroll.call(overlay, {next: true})
        })
        .listen('click on [data-left]', function (evt, overlay) {
          scroll.call(overlay, {prev: true})
        })
        .show()

      function scroll (direction) {
        var step = direction.next ? 1 : -1
        position += step
        if (cache[position].img) {
          var img = this.find('img').style('left', -900)//.replaceWith(cache[position].img)
          positionGalleryControls(img);
          if (!cache[position+step]) {
            var thumb = cache[position].thumb[position ? "next" : "previous"]()
            cache[position ? "push" : "unshift"]({
              thumb: thumb,
              img: newPreloadedImage(thumb)
            })
          }
        } else position -= step

        if (!position) position = 1
      }

      function newPreloadedImage (thumb) {
        var img = new Image()
        ,   src = thumb.transformSrc()
        if (src) img.src = src
        return img.src && img
      }

      function positionGalleryControls (img) {
        var x = dom('[data-x]')
        x.style({
          top: dom(img).offset().top + x.height() + 'px',
          right: dom(img).offset().left + x.width() + 'px'
        })
      }
    })
  }
  return gallery
})())
livity.dom.DOMContentLoaded(function () {
  var util = livity.util
  var dom = livity.dom

  dom('[data-dropup-options]').listen('click', function (evt) {
    var options_dialog = {
      '<div>': {
        'position': 'absolute',
        'left': evt.target.offsetLeft,
        'top': evt.target.offsetTop,
        'width': 'auto',
        'background-color': 'black',
        'border': '0.2em solid yellow'
      }
    }

    var options = JSON.parse(this.at('data-dropup-options').trim())
    var dropup = dom.generate(options_dialog)

    util.each(options, function (text, link) {
      dropup.append(dom.create('<a href='+link+'>').text(text))
    })

    dropup.appendTo('body')

    dom(window).listen('click', function (evt) {
      dropup.remove()
    })
  })
})
