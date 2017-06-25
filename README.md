# LivityJS
Livity.js is a library serving a two-fold purpose.
1. It provides a set of DOM methods, in the spirit of jQuery.
2. It provides a framework, exposing the LivityFramework class under the name "Livity".
The word ["Livity"](https://en.wikipedia.org/wiki/Livity_(spiritual_concept)) was chosen to give this library a sense that it would be used to bring forth good works.  Front-end JS libraries abound in this day and time, but I wanted to create something which already existed before, but with the intention that I would use it to promote charitable works.  Other libraries (such as jQuery) would have suited my technological needs, but have way too many features to be mostly useful to me.  In the end, I might only use less than 50% of jQuery.  

Livity was developed using es6 throughout, and will provide a transpiled version for usage in public-facing apps.  Even still, it has been designed to support only IE11 and above, meaning most of the standardized features of javascript (especially of the DOM api) can be used by themselves, without fallbacks.  If this becomes an issue later on (if a charitable app has trouble reaching a large population of people due to lack of browser coverage) then support will be added.

Nothing special needs to be done to include Livity in your project.  Once included, it will provide two main objects.  `l` and `Livity`.  `l` is the jQuery-ish object which is meant to provide much of the basic functionality of jQuery's DOM-related methods.  The methods currently available are:

* `each`: perform a function on each element in the livity collection
* `find`: runs a new query selection using the current element as the root of the search
* `attr`: get/set an html attribute on the collection
* `text`: get/set text
* `css`: get applied styles / set inline styles
* `addClass': add a class to each element in the collection
* `removeClass`: remove a class from every element in the collection
* `getClass`: get the classes of an elem
* `hasClass`: check for existence of a class
* `toggleClass`: if class exists, remove class, otherwise, add class
* `offset`: get the offset of an element relative to the window
* `height`: get the height of an element
* `innerHeight`: get the inner height (content height) of an element
* `outerHeight`: get the content height, including content not visible
* `width`: get the width of an element
* `innerWidth`: get the inner width (content width) of an element
* `outerWidth`: get the content width, including content not visible
* `show`: changes the `display` on an element to `block`, or `flex` if passed `true` as the only argument
* `hide`: sets `display: none` on an element, or `visibility: hidden` if passed `true` as the only argument
* `toggle`: will call `show()` if passed `true` and `hide()` if passed 'false'
* `append`: append into
* `insertAfter`: `insertAfter` actually "insertsBefore" the next sibling
* `before`: insert before
* `prepend`: prepend into
* `appendTo`: append elem into target
* `prepentTo`: prepend elem into target
* `html`: sets innerHTML
* `empty`: remove all children
* `remove`: remove selected elem from DOM
* `replaceWith`: 
* `parent`: get the first parent
* `child`: get the first child
* `children`: get all children as an l-wrapped collection
* `detach`: detach a DOM node, removing all event listeners in the process
* `on`: Example: `$(document).on('click', '#delegatedFoo', (evt, elem) => {})`
* `once`: same as `on` but will bind and run only once and then run `removeEventListener`
* `off`: takes the event type and the handler function to unbind
* `deregisterEvents`: removes all event listeners on all elements in the collection
* `trigger`: `l('#foo').trigger('click'); l('#foo').trigger('customEvent', { data: 'bar' })`
* `getListeners`: return listener data for a single elem

These methods are available on Livity-wrapped elements themselves.  Here's an example:
```
    l('#myDiv').on('click', (evt, elem) => {
      l(elem).find('#childElem').hide()      
    })
```

Everything was built from scratch, mostly without looking at pre-existing implementations, so there may be defects.  That being said, everything was tested during development and many of the methods are being used in apps currently under development.

### The following "static" methods are available on the `window.l` namespace:
* `getListeners`: returns all listener data if passed no arguments, returns listener data for an element if passed a raw DOM Node reference
* `each`: `for each` with a `hasOwnProperty` check built in
* `DOMContentLoaded`: `l.DOMContentLoaded(callback)`
* `router`: a manager for page routing based on `location.hash`; based on the target, will ajax an html file of the same name into the DOM; takes a config object as a single argument.  
```
    config: {
      view: "selector for the container where views are to be rendered",
      templateDirectory: "the root directory containing HTML markup files"
    }
```
Publishes event "view.{target}" where {target} is #/{target} or #{target}
Note: `router` is not used in LivityFramework and may be removed in the short-term future.
* `ajax`: creates and returns a Promise representing an HTTP response.  Takes an object as a single argument with the following properties and default values:
```
    {
      url: '',
      method: 'GET',
      data,
      headers: {}
    } 
```
* `create`: creates a new DOM node or collection of DOM nodes.  First argument is string representing DOM nodes.  Either a simple tag name or more complext HTML markup.  If passed `true` as second argument, will return the newly created DOM nodes as a livity-wrapped collection.
* `modal.open`: will open a livity-modal with the passed in html content.  Note: under development; supports multiple modals opened at once
* `modal.closeAll`: remove all open modals
* `params`: serializes an object for inclusion as url parameters
* `deserialize`: deserializes a query string into an object

LivityFramework is under active development, yet it is useful in its current form.  In your app's js file, you would do:
```
    new Livity({
      head () {}, // logic you want to run before the DOM is ready
      body () {}, // logic you want to run when the DOM is ready
      routes: {
        '/': {
          template: '/home.html',
          body () {},
          state: {
            data1: 'foo'
          }
        }
      }
    })
```

LivityFramework uses history.(push|replace)State under the hood to achieve its routing.  Because of this, different routes with different keys may resolve to the same location in the adress bar.  By default, the address bar will take on the URL of the route key.  To set a custom URL-value, you may set an `addressBar` property in a route object.  The `template` is the path to the markup you'd like to load.  Routes have a `head` and `body` for executing pre/post DOM-ready logic, as well.  The `state` node of a route config object is for any data you'd like to store as a part of that route.  When a user cycles through the browser history using the back/forward buttons, the `state` object will be "popped" off and become available to the application natively through `window.history.state`.  

## View swap algorithm
The way a partial html document is swapped by LivityFramework into the current document is simple.  As each parent node is read from the partial, if it contains an `id`, then an element on the page with that same `id` is replaced with the new one.  If it doesn't contain an `id`, it is assumed that the tag name is unique to the document and so the existing tag with that name is replaced with the new one.  This is useful for a <title>, but the real reason it was built this way was to accomodate apps which have the general structure of having three nodes inside of the <body>: <header></header><main></main><footer></footer>.  

## To be implemented
Not yet implemented is application recovery, which had space for it built into LivityFramework from the ground-up.  Basically, the user will be given the option for the feature, and if utilized, the user's application history would be saved as objects in localStorage, and recreated when the user returned.  A "URL generator" will also be built, which will allow the user to generate a URL to share with another person which will place the other person at the exact state in the application the user is in.
