var livity = livity || {}
,   dom = livity.dom
,   util = livity.util

util.extend(dom.htmlElement.prototype, {
  transition: dom.safe(function () {
    var transitions = [], transitionedProps = ''
    while (arguments.length) { transitions.push(Array.prototype.splice.call(arguments, 0,4)) }

    transitions.forEach(function (transition) {
      var t = transition, prop = t[0], options = t[1], from = t[2], to = t[3], self = this
      this.style('transition', transitionedProps += ( transitionedProps && ', ' ) + ( prop + ' ' + options ))
          .style(prop, from)
      // Need to wait for "from" to render before setting "to"
      window.setTimeout(function () {
        self.style(prop, to)
      }, 0)
    }, this)

    return this
  })
})

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
