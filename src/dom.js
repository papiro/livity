'use strict';

/****
 ** LivityJS mutates extends the HTMLElement prototype.
 ** If you don't want this behavior then don't use it, but here are the reasons it was designed as such:
 ** 1. You can use any native DOM API method you'd like to select your element, which would be faster than
 **   using the L method.
 ** 2. When using getElementsByClassName or getElementsByTagName or getElementsByName, you can use normal
 **   array methods to traverse/map/filter the collection which will be faster than custom methods.
 ** 3. No needing to make sure your element is wrapped before calling one of LivityJS's methods on it.
****/

;(function () {

  Object.assign( HTMLElement.prototype, {
    find (query) {
      return L(query, this)
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
    },
    addClass (classes) {
      this.className = classes
      return this    
    },
    removeClass (cnames) {
      this.className.replace(/`${cnames.replace(' ', '|')}`/, '')
      return this
    },
    getClass () {
      return this.className
    },
    toggleClass (cname) {
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
      this.appendChild(elem)
      return this
    },
    prepend (elem) {
      this.insertBefore(elem, this.firstChild)
      return this
    },
    appendTo (elem) {
      L(elem).append(this)
      return this
    },
    prependTo (elem) {
      L(elem).prepend(this)
      return this
    },
    html (elem) {
      this.empty()
      if (typeof elem === 'string') this.innerHTML = elem
      else this.append(elem)
      return this    
    },
    empty () {
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
      return this.cloneNode(deep)
    },
    next () {
      return this.nextElementSibling
    },
    parent () {
      return this.parentNode
    },
    child () {
      return this.firstChild
    },
    previous () {
      return this.previousElementSibling
    },
    isImg () {
      return !!(this && this.nodeName === 'IMG')
    }
  })

})()
