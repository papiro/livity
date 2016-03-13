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
