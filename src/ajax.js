var livity = livity || {}
livity.ajax = (function() {

var ajax = {}

function _openAndReturnReq(method, url) {
  var req = new XMLHttpRequest()
  req.open(method, url)
  return req
}

ajax.GET = function(url, success, failure, always) {
  var req = _openAndReturnReq('GET', url)

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

  req.send()
}

ajax.POST = function(url, data, success, failure, always) {
  _openAndReturnReq('POST', url)

  req.send(data)      
}

return ajax
})()
