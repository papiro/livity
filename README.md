LivityFramework is defunct-under active development-.  

### It is left here for historical reasons and also as a showcase to my abilities as a javascript programmer. If you look a few commits ago, you'll see that I basically was rewriting jQuery, but only to support standard browsers, including IE11+. I had a selector engine and over two dozen DOM manipulation methods, as well as eventing with delegation. It was a lot of fun!  

-----------------------------
In your app's js file, you would do:
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
The way a partial html document is swapped by LivityFramework into the current document is simple.  As each parent node is read from the partial, if it contains an `id`, then an element on the page with that same `id` is replaced with the new one.  If it doesn't contain an `id`, it is assumed that the tag name is unique to the document and so the existing tag with that name is replaced with the new one.  This is useful for a `<title>`, but the real reason it was built this way was to accomodate apps which have the general structure of having three nodes inside of the `<body>`: `<header></header><main></main><footer></footer>`.

## To be implemented
Not yet implemented is application recovery, which had space for it built into LivityFramework from the ground-up.  Basically, the user will be given the option for the feature, and if utilized, the user's application history would be saved as objects in localStorage, and recreated when the user returned.  A "URL generator" will also be built, which will allow the user to generate a URL to share with another person which will place the other person at the exact state in the application the user is in.
