livity.dom.DOMContentLoaded(function () {
  var util = livity.util
  var dom = livity.dom

  dom('[data-dropup-options]').listen('click', function (evt) {
    var options_dialog = {
      '<div>': {
        'position': 'absolute',
        'left': evt.target.offsetLeft,
        'top': evt.target.offsetTop,
        'width': 'auto',
        'background-color': 'black',
        'border': '0.2em solid yellow'
      }
    }

    var options = JSON.parse(this.at('data-dropup-options').trim())
    var dropup = dom.generate(options_dialog)

    util.each(options, function (text, link) {
      dropup.append(dom.create('<a href='+link+'>').text(text))
    })

    dropup.appendTo('body')

    dom(window).listen('click', function (evt) {
      dropup.remove()
    })
  })
})
