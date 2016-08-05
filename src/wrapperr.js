wrapperr = function (app) {
  var ajax = livity.ajax
  try {
    app()
  } catch (e) {
    ajax.POST('/logerr', e)
  }
}
