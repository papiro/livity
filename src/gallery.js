var livity = livity || {}
livity.WebUIComponents = livity.WebUIComponents || []

livity.css.buildStylesheet([
  '[data-livity-gallery] {\
    display: flex;\
    flex-wrap: wrap;\
    text-align: center;\
    justify-content: center;\
  }',
  '[data-livity-gallery] h2 {\
    width: 100%;\
  }',
  '[data-livity-gallery] img {\
    cursor: pointer;\
    margin: 0.7em;\
  }',
  '[data-livity-gallery-overlay] img {\
    position: relative;\
    margin: auto;\
    width: auto;\
    max-width: 100%;\
    max-height: 100%;\
    box-shadow: 0 0 7em 5em hsla(100, 100%, 0%, 0.8);\
  }',
  '.livity-overlay-right,\
  .livity-overlay-left {\
    position: fixed;\
    color: hsla(0, 0%, 75%, 1);\
    cursor: pointer;\
  }',
  '.livity-overlay-right,\
  .livity-overlay-left {\
    z-index: 1;\
    top: 45%;\
    font-size: 4em;\
  }',
  '.livity-overlay-right {\
    right: 2%;\
    text-shadow: -0.05em 0 0.05em white;\
  }',
  '.livity-overlay-left {\
    left: 2%;\
    text-shadow: 0.05em 0 0.05em white;\
  }',
  '.livity-overlay-right:hover,\
  .livity-overlay-left:hover {\
    color: hsla(81, 44%, 75%, 1);\
  }'
])

livity.dom.DOMContentLoaded(function() {
  livity.dom.create('div')
    .at('data-livity-gallery-overlay', '')
    .at('id', 'overlay')
    .class('livity-overlay')
    .append(livity.dom.create('span')
      .at('data-x', '')
      .class('livity-overlay-x')
      .inner('&#x2716;'))
    .append(livity.dom.create('span')
      .at('data-right', '')
      .class('livity-overlay-right')
      .inner('&#xbb;'))
    .append(livity.dom.create('span')
      .at('data-left', '')
      .class('livity-overlay-left')
      .inner('&#xab;'))
  .appendTo('body')
})

livity.WebUIComponents.push((function() {
  var dom = window.livity.dom
  
  var gallery = function() {
    dom('[data-livity-gallery]').listen('click on img', function (evt) {
      dom.htmlElement.prototype.transformSrc = function () {
        return this.isImg()
          && ( this.at('data-target') || this.at('src').replace('thumbs/', "") )
      }

      var cache = [{
        thumb: this.previous()
      },{
        thumb: this
      },{
        thumb: this.next()
      }], position = 1, x = dom('[data-x]')

      // Load the clicked image
      cache[1].img = newPreloadedImage(cache[1].thumb)

      // When the first image is finished loading, pre-load the previous and the next
      dom(cache[1].img).listenOnce('load', function() {
        for (var i=0, j=[0,2]; i<2; i++) {
          cache[j[i]].img = newPreloadedImage(cache[j[i]].thumb)
        }
        positionGalleryControls(this)
        x.show()
      })
      x.hide(true)
      var originalBodyOverflow = dom('body').style('overflow')
      dom('body').style('overflow', 'hidden')

      dom('[data-livity-gallery-overlay]')
        .append(cache[1].img)
        .listen('click on [data-x]', function (evt, overlay) {
          dom('body').style('overflow', originalBodyOverflow)
          overlay.hide().find('img').remove()
        }, {cache: true})
        .listen('click on [data-right]', function (evt, overlay) {
          scroll.call(overlay, {next: true})
        })
        .listen('click on [data-left]', function (evt, overlay) {
          scroll.call(overlay, {prev: true})
        })
      .show()

      function scroll (direction) {
        var next = direction.next, step = next ? 1 : -1
        position += step
        if (cache[position].img) {
          var oldImg = this.find('img')
          var newImg = dom(cache[position].img)

          newImg
            [next ? 'appendTo' : 'prependTo']('[data-livity-gallery-overlay]')
            .transition('margin-' + (next ? 'right' : 'left'), '1s ease-out', -dom(window).innerWidth(), 0)

          oldImg
            .transition(
              'margin-' + (next ? 'right' : 'left'), '1s ease-out', 0, -dom(window).innerWidth(),
              'opacity', '1s ease-out', 1, 0
            ).listen('transitionend', transitionendHandler)

          function transitionendHandler () {
            positionGalleryControls(newImg)
            this.at('style', '').remove()            
            this.unlisten('transitionend', transitionendHandler)
          }

          if (!cache[position+step]) {
            var thumb = cache[position].thumb[position ? "next" : "previous"]()
            cache[position ? "push" : "unshift"]({
              thumb: thumb,
              img: newPreloadedImage(thumb)
            })
          }
        } else position -= step

        if (!position) position = 1
      }

      function newPreloadedImage (thumb) {
        var img = new Image()
        ,   src = thumb.transformSrc()
        if (src) img.src = src
        return img.src && img
      }

      function positionGalleryControls (img) {
        var x = dom('[data-x]')
        x.style({
          top: dom(img).offset().top + x.height() + 'px',
          right: dom(img).offset().left + x.width() + 'px'
        })
      }
    })
  }
  return gallery
})())
