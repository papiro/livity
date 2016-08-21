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

Object.assign(HTMLElement.prototype, {

})

dom.create = function (elem) {
  if (elem[0] === '<') {
    var temp = document.createElement('div')
    temp.innerHTML = elem
    return temp.childElementCount === 1 ? new htmlElement(temp.firstChild) : temp.children
  }
  return new htmlElement(document.createElement(elem))
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

return dom
})()
