var livity = livity || {}
livity.router = (function() {

var dom = livity.dom
,   ajax = livity.ajax
,   event = livity.event

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
