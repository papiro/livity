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
