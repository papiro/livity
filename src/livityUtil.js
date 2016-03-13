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
