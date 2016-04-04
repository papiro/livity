var livity = livity || {}
,   dom = livity.dom
,   util = livity.util

util.extend(dom.htmlElement.prototype, {
  // pass arguments, 3 for each transition, in the order of:
  //  transition shorthand settings, from value, to value
  transition: dom.safe(function () {
    var transitions = [], transitionsGrouped = ''
    while (arguments.length > 1) { transitions.push(Array.prototype.splice.call(arguments,0,3)) }

    transitions = transitions.map(function (transition) {
      var t = transition, settings = t[0], from = t[1], to = t[2], prop = settings.split(' ')[0]
      transitionsGrouped += (( transitionsGrouped && ', ' ) + settings)
      this.style(prop, from)
      return [prop, to] // just keep what we need
    }, this)

    this
      .style('transition', transitionsGrouped)
      .listenOnce('transitionend', arguments[0] || function () {})
  
    transitions.forEach(function (t) {
      var self = this
      // Need to wait for "from" to render before setting "to"
      window.setTimeout(function () {
        self.style(t[0], t[1])
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
