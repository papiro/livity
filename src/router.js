var livity = livity || {}
livity.router = (function() {

var dom = livity.dom
,   ajax = livity.ajax

var router = function (config) {
  var routes = config.routes || {}
  dom().listen('hashchange', function() {
    var hash = window.location.hash
    ,   route = routes.hasOwnProperty(hash) ? routes[hash] : hash
    // slice off the leading '#' and a following '/' if there is one
    route = route.slice(route[1]==='/'?2:1)
    ajax.GET(config.markupDir+'/'+route+'.html', function (req) {
      dom(config.view).inner(req.response)
      dom(document).trigger('view.'+route)
    })
    router.initialized = true
  })
  window.location.hash && !router.initialized && dom().trigger('hashchange')
}

return router
})()
