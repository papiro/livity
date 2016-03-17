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
