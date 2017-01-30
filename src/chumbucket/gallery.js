'use strict'

Object.assign(L.WebUIComponents 
    ? L.WebUIComponents
    : L.WebUIComponents = {},
    {
      gallery: () => {
        const styleSheet = 
          `
            [data-livity-gallery] {
              display: flex;
              flex-wrap: wrap;
              text-align: center;
              justify-content: center;
            }

            [data-livity-gallery] h2 {
              width: 100%;
            }

            [data-livity-gallery] img {
              cursor: pointer;
              margin: 0.7em;
            }

            [data-livity-gallery-overlay] img {
              position: relative;
              margin: auto;
              width: auto;
              max-width: 100%;
              max-height: 100%;
              box-shadow: 0 0 7em 5em hsla(100, 100%, 0%, 0.8);
            }

            .livity-overlay-right,
            .livity-overlay-left {
              position: fixed;
              color: hsla(0, 0%, 75%, 1);
              cursor: pointer;
            }

            .livity-overlay-right,
            .livity-overlay-left {
              z-index: 1;
              top: 45%;
              font-size: 4em;
            }

            .livity-overlay-right {
              right: 2%;
              text-shadow: -0.05em 0 0.05em white;
            }

            .livity-overlay-left {
              left: 2%;
              text-shadow: 0.05em 0 0.05em white;
            }

            .livity-overlay-right:hover,
            .livity-overlay-left:hover {
              color: hsla(81, 44%, 75%, 1);
            }
          `
        L.buildStylesheet(styleSheet.split('\n\n'))

        const markup = 
        `
        <div id="overlay" class="livity-overlay" data-livity-gallery-overlay>
          <span class="livity-overlay-x" data-x>&#x2716;</span>
          <span class="livity-overlay-right" data-right>&#xbb;</span>
          <span class="livity-overlay-left" data-left>&#xab;</span>
        </div>
        `

        L.DOMContentLoaded(() => {
          markup.appendTo('body')
        })

        L('[data-livity-gallery]').on('click', 'img', function (evt) {
          HTMLElement.prototype.transformSrc = () =>{
            return this.isImg()
              && ( this.attr('data-target') || this.attr('src').replace('thumbs/', "") )
          }

          var cache = [{
            thumb: this.previous()
          },{
            thumb: this
          },{
            thumb: this.next()
          }], position = 1, x = L('[data-x]')

          // Load the clicked image
          cache[1].img = newPreloadedImage(cache[1].thumb)

          // When the first image is finished loading, pre-load the previous and the next
          L(cache[1].img).once('load', function() {
            for (var i=0, j=[0,2]; i<2; i++) {
              cache[j[i]].img = newPreloadedImage(cache[j[i]].thumb)
            }
            positionGalleryControls(this)
            x.show()
          })
          x.hide(true)
          const originalBodyOverflow = dom('body').style('overflow')
          L('body').css('overflow', 'hidden')

          L('[data-livity-gallery-overlay]')
            .append(cache[1].img)
            .on('click', '[data-x]', function (evt, overlay) {
              L('body').css('overflow', originalBodyOverflow)
              overlay.hide().deregisterEvents().find('img').remove()
            })
            .on('click', '[data-right]', function (evt, overlay) {
              scroll.call(overlay, {next: true})
            })
            .on('click', '[data-left]', function (evt, overlay) {
              scroll.call(overlay, {prev: true})
            })
          .show()

          function scroll (direction) {
            var next = direction.next, step = next ? 1 : -1
            position += step
            if (cache[position].img) {
              var oldImg = this.find('img')
              ,   newImg = L(cache[position].img)
              ,   windowInnerWidth = window.innerWidth()
              ,   transitionendHandler = function () {
                positionGalleryControls(newImg)
                this.attr('style', '').remove()            
                this.off('transitionend', transitionendHandler)
              }

              toggleGalleryControls(false)

              oldImg
                .transition(
                  'margin-' + (next ? 'right' : 'left') + ' 1s ease-out', (windowInnerWidth - oldImg.width())/2, -windowInnerWidth,
                  'opacity 1s ease-out', 1, 0
                ).on('transitionend', transitionendHandler)

              newImg
                [next ? 'appendTo' : 'prependTo']('[data-livity-gallery-overlay]')
                .transition(
                  'margin-' + (next ? 'right' : 'left') + ' 1s ease-out', -windowInnerWidth, (windowInnerWidth - newImg.width())/2,
                  'opacity 1s ease-out', 0, 1)

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

          function toggleGalleryControls (on) {
            L('[data-x]').toggle(on)
            L('[data-right]').toggle(on)
            L('[data-left]').toggle(on)
          }

          function positionGalleryControls (img) {
            var x = L('[data-x]')
            toggleGalleryControls(true)
            x.style({
              top: L(img).offset().top + x.height() + 'px',
              right: L(img).offset().left + x.width() + 'px'
            })
          }
        })
      }
    })
