'use strict';var _typeof=typeof Symbol==='function'&&typeof Symbol.iterator==='symbol'?function(obj){return typeof obj}:function(obj){return obj&&typeof Symbol==='function'&&obj.constructor===Symbol&&obj!==Symbol.prototype?'symbol':typeof obj};var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();function _possibleConstructorReturn(self,call){if(!self){throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called')}return call&&(typeof call==='object'||typeof call==='function')?call:self}function _inherits(subClass,superClass){if(typeof superClass!=='function'&&superClass!==null){throw new TypeError('Super expression must either be null or a function, not '+typeof superClass)}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:false,writable:true,configurable:true}});if(superClass)Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):subClass.__proto__=superClass}function _toConsumableArray(arr){if(Array.isArray(arr)){for(var i=0,arr2=Array(arr.length);i<arr.length;i++){arr2[i]=arr[i]}return arr2}else{return Array.from(arr)}}function _defineProperty(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true})}else{obj[key]=value}return obj}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}(function(){/**
   * Decided to go with a memory-unsafe Map, rather than a memory-safe WeakMap for one reason:
   * Allows the LivityAPI to provide methods to return detailed data for all event listeners
   *  currently subscribed through the framework.  
   *  With WeakMaps, I would need to keep a separate reference of every key (DOM node) in 
   *  order to loop through and read each listener from the WeakMap.  
   *  If a listener was registered through the framework, deregister it through the framework.  
  **/var _evtData=new Map;var noop=function noop(){};var numberOfListeners=0;var Listener=function(){function Listener(elem,type,handler,_wrappedHandler,target){_classCallCheck(this,Listener);Object.assign(this,{elem:elem,type:type,handler:handler,_wrappedHandler:_wrappedHandler,target:target})}_createClass(Listener,[{key:'register',value:function register(){var elem=this.elem,type=this.type,handler=this.handler,_wrappedHandler=this._wrappedHandler;elem.addEventListener(type,_wrappedHandler);// initialize new listener data
!_evtData.has(elem)&&_evtData.set(elem,_defineProperty({},type,{_wrappedHandlers:[],handlers:[]}));var obj=_evtData.get(elem)[type];// store the listener data
obj._wrappedHandlers.push(_wrappedHandler);obj.handlers.push(handler);if(++numberOfListeners%10===0){console.debug('Just reached '+numberOfListeners+' event listeners')}}// Note: Does not consider delegated targets when deregistering
},{key:'deregister',value:function deregister(){var elem=this.elem,type=this.type,handler=this.handler;var data=_evtData.get(elem);var dataForType=data[type];var handlerIndex=dataForType.handlers.indexOf(handler);var _wrappedHandler=dataForType._wrappedHandlers.splice(handlerIndex,1)[0];elem.removeEventListener(type,_wrappedHandler);// clean up
dataForType.handlers.splice(handlerIndex,1)[0];if(!dataForType.handlers.length){data[type]=null;delete data[type];if(!Object.keys(data).length){data=null;_evtData.delete(elem)}}numberOfListeners--}/*convenience methods*/}],[{key:'register',value:function register(listener){listener.register()}},{key:'deregister',value:function deregister(listener){listener.deregister()}/*********************/},{key:'deregisterDOMNode',value:function deregisterDOMNode(elem){_listeners.filter(function(listener){return listener.elem===elem}).forEach(function(listener){listener.deregister()})}},{key:'getListeners',value:function getListeners(c){var filter;switch(typeof c==='undefined'?'undefined':_typeof(c)){case'undefined':return[].concat(_toConsumableArray(_evtData));break;case'string':filter='type';break;case'object':filter='elem';break;case'function':filter='handler';break;default:throw new ReferenceError('Faulty criteria passed to Listener.getListeners');}}}]);return Listener}();var L=function(_Array){_inherits(L,_Array);function L(query){var root=arguments.length>1&&arguments[1]!==undefined?arguments[1]:document;_classCallCheck(this,L);var _this=_possibleConstructorReturn(this,(L.__proto__||Object.getPrototypeOf(L)).call(this));var queryMethod='',match=void 0;console.debug('query:::"'+query+'"');// special types
// simply wrap if already an array
if(query instanceof Array){var _ret;return _ret=Object.assign(_this,query),_possibleConstructorReturn(_this,_ret)}else if(query instanceof Node||query instanceof Window){match=query}else if(typeof query!=='string'){throw new TypeError('L needs a string but was passed '+query+', which is a '+(typeof query==='undefined'?'undefined':_typeof(query)))}else if(/(\w[ \.#])|(^\[)/.test(query)){queryMethod='querySelectorAll'}else{switch(query[0]){case'#':queryMethod='getElementById';query=query.slice(1);root=document;break;case'.':queryMethod='getElementsByClassName';query=query.slice(1);break;default:queryMethod='getElementsByTagName';}}match=match||root[queryMethod](query);var collection=match?match.length||match instanceof HTMLCollection?Array.from(match):[match]:[];console.debug('returned:::'+collection);Object.assign(_this,collection);return _this}// Alas, native Array map is busted on the L subclass :(
// So convert into a true Array, run map, and actually return a new instance
_createClass(L,[{key:'map',value:function map(){var _Array$from;return new L((_Array$from=Array.from(this)).map.apply(_Array$from,arguments))}/* executes a new element selection using "this" as the root */},{key:'find',value:function find(query){return this.reduce(function(prev,elem){return l(query,elem)},[])}/* get/set attribute */},{key:'attr',value:function attr(name,value){if(!name){var attrMap={};for(var i=0;i<this.attributes.length;i++){var attribute=this.attributes[i];attrMap[attribute.name]=attribute.value}return attrMap}if(value===undefined){return this[0].getAttribute(name)}this.forEach(function(elem){elem.setAttribute(name,value)});return this}/* get/set text */},{key:'text',value:function text(_text){if(_text){this.forEach(function(elem){elem.textContent=_text})}return _text?this:this.textContent}/* get applied styles / set inline styles */},{key:'css',value:function css(prop,val){if((typeof prop==='undefined'?'undefined':_typeof(prop))==='object'){util.each(prop,function(prop,val){this.style(prop,val)}.bind(this));return this}else if(val!==undefined&&val!==null){if(typeof val==='number'&&!~['opacity','z-index'].indexOf(prop))val+='px';this.style[prop]=val;return this}else{var style=window.getComputedStyle(this);return prop?style[prop]:style}}/* add a class */},{key:'addClass',value:function addClass(classes){this.forEach(function(elem){elem.className+=' '+classes});return this}/* remove a class */},{key:'removeClass',value:function removeClass(cnames){var _this2=this;var splitCnames=cnames.split(' ');splitCnames.forEach(function(cname){var matcher=' '+cname+'|'+cname+' |'+cname;_this2.forEach(function(elem){elem.className=elem.className.replace(new RegExp(matcher,'g'),'')})});return this}/* get classes */},{key:'getClass',value:function getClass(){return this.className}/* check for existence of class */},{key:'hasClass',value:function hasClass(className){var matcher=new RegExp('(^| +)'+className+'($| )');return matcher.test(this.className)}/* if class exists, remove class, otherwise, add class */},{key:'toggleClass',value:function toggleClass(cname){this.forEach(function(elem){if(RegExp(cname).test(elem.className)){l(elem).removeClass(cname)}else{l(elem).addClass(cname)}});return this}/* get the offset of an element relative to the window */},{key:'offset',value:function offset(){return{top:this.offsetTop,left:this.offsetLeft,right:this.offsetRight}}/* get the height of an element */},{key:'height',value:function height(){return this.offsetHeight}/* get the inner height (content height) of an element */},{key:'innerHeight',value:function innerHeight(){return this.clientHeight}/* get the content height, including content not visible */},{key:'outerHeight',value:function outerHeight(){return this.scrollHeight}/* get the width of an element */},{key:'width',value:function width(){return this.offsetWidth}/* get the inner width (content width) of an element */},{key:'innerWidth',value:function innerWidth(){if(this.selector==='window')return this.innerWidth;else return this.clientWidth}/* get the content width, including content not visible */},{key:'outerWidth',value:function outerWidth(){return this.scrollWidth}},{key:'show',value:function show(flex){this.forEach(function(elem){var elemStyle=elem.style;elemStyle.display=flex?'flex':'block';elemStyle.visibility='visible'});return this}},{key:'hide',value:function hide(noreflow){this.forEach(function(elem){elem.style[noreflow?'visibility':'display']=noreflow?'hidden':'none'});return this}},{key:'toggle',value:function toggle(show){return this[show?'show':'hide']()}},{key:'append',value:function append(child){this.forEach(function(elem){elem.appendChild(child)});return this}},{key:'prepend',value:function prepend(elem){this.insertBefore(elem,this.firstChild);return this}},{key:'appendTo',value:function appendTo(elem){L(elem).append(this);return this}},{key:'prependTo',value:function prependTo(elem){L(elem).prepend(this);return this}},{key:'html',value:function html(_html){this.empty();this.forEach(function(elem){if(typeof _html==='string')elem.innerHTML=_html;else elem.append(_html)});return this}},{key:'empty',value:function empty(){var _this3=this;this.forEach(function(elem){var child=void 0;while(child=_this3.firstChild){_this3.removeChild(child)}});return this}/*
    remove (elem) {
      elem = ( typeof elem === 'string' ? dom(elem) : elem ) || this
      elem.parentNode && elem.parentNode.removeChild(elem)
      return elem
    },
    replaceWith (elem) {
      this.parentNode.replaceChild(elem || elem, this)
      return dom(elem)
    },
    clone (deep) {
      return this.cloneNode(deep)
    },
    next () {
      return this.nextElementSibling
    },
    parent () {
      return this.parentNode
    },
    */},{key:'child',value:function child(){return this.map(function(elem){return elem.firstChild})}/*
    previous () {
      return this.previousElementSibling
    },
    isImg () {
      return !!(this && this.nodeName === 'IMG')
    }
    */},{key:'on',value:function on(eType){// Handle overloaded function without changing variable types
var target=void 0,handler=void 0,options=void 0;switch(arguments.length<=1?0:arguments.length-1){case 1:target=null;handler=arguments.length<=1?undefined:arguments[1];break;case 2:if(typeof(arguments.length<=1?undefined:arguments[1])==='string'){target=arguments.length<=1?undefined:arguments[1];handler=arguments.length<=2?undefined:arguments[2]}else{target=null;handler=arguments.length<=1?undefined:arguments[1];options=arguments.length<=2?undefined:arguments[2]}break;case 3:target=arguments.length<=1?undefined:arguments[1];handler=arguments.length<=2?undefined:arguments[2];options=arguments.length<=3?undefined:arguments[3];break;default:throw new TypeError('"on" function signature is (event_type(String)[required], event_target(HTMLElement|String)[optional], handler(Function)[required], options(Object)[optional]');}return this._on(eType,target,handler,options)}},{key:'_on',value:function _on(eType,target,handler){var options=arguments.length>3&&arguments[3]!==undefined?arguments[3]:{};function wrappedHandler(evt){if(!target)return handler.bind(this)(evt);var iteration=evt.target;var targets=[].concat(_toConsumableArray(evt.currentTarget.querySelectorAll(target)));while(iteration!==evt.currentTarget){if(~targets.indexOf(iteration)){return handler.bind(iteration)(evt)}iteration=iteration.parentElement}}function wrappedHandlerOnce(evt){wrappedHandler.call(this,evt);l(this).off(eType,handler)}this.forEach(function(elem){Listener.register(new Listener(elem,eType,handler,options.once?wrappedHandlerOnce:wrappedHandler,target))});return this}},{key:'once',value:function once(){this.on.apply(this,[].concat(Array.prototype.slice.call(arguments),[{once:true}]))}},{key:'off',value:function off(eType,handler){this.forEach(function(elem){Listener.deregister(new Listener(elem,eType,handler))})}},{key:'deregisterEvents',value:function deregisterEvents(){Listener.deregisterDOMNode(this);return this}},{key:'trigger',value:function trigger(eventName,detail){var _this4=this;var nativeEvents=['mouseenter','mouseover','mousemove','mousedown','mouseup','click','dblclick','contextmenu','wheel','mouseleave','mouseout','select'];if(~nativeEvents.indexOf(eventName)){this.forEach(function(elem){elem[eventName]()})}else{(function(){var customEvent=void 0;try{customEvent=new CustomEvent(eventName,detail)}catch(e){// IE11
customEvent=document.createEvent('CustomEvent');customEvent.initCustomEvent(eventName,true,true,detail)}_this4.forEach(function(elem){elem.dispatchEvent(customEvent)})})()}return this}},{key:'getListeners',value:function getListeners(){return Listener.getListeners()}}]);return L}(Array);var l=function l(){for(var _len=arguments.length,args=Array(_len),_key=0;_key<_len;_key++){args[_key]=arguments[_key]}return new(Function.prototype.bind.apply(L,[null].concat(args)))};var// utility for ajax
_openAndReturnReq=function _openAndReturnReq(method,url){var req=new XMLHttpRequest;req.open(method,url);return req};/** STATICS **/Object.assign(l,{getListeners:function getListeners(){return Listener.getListeners.apply(Listener,arguments)},/* @ execute a callback for every key:value in an object */each:function each(obj,callback){for(var key in obj){if(obj.hasOwnProperty(key)){callback(key,obj[key],obj)}}},/* $.ready substitute */DOMContentLoaded:function DOMContentLoaded(_callback){if(document.readyState!=='loading')return _callback();var callback=function callback(){_callback();// cleanup
l(document).off('DOMContentLoaded',callback)};l(document).on('DOMContentLoaded',callback)},/** @ a manager for page routing based on location.hash
      * - based on the target, will ajax an html file of the same name into the DOM.
      *
      * config: {
      *   view: "selector for the container where views are to be rendered",
      *   templateDirectory: "the root directory containing HTML markup files"
      * }
       *
      * publishes event "view.{target}" where {target} is #/{target} or #{target}
    **/router:function router(){var _this5=this;var config=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var view=config.view,templateDirectory=config.templateDirectory,_config$callbacks=config.callbacks,callbacks=_config$callbacks===undefined?{}:_config$callbacks;var initialized=false;l(window).on('hashchange',function(){var hash=window.location.hash;// slice off the leading '#' and a following '/' if there is one
var route=hash.slice(hash[1]==='/'?2:1);_this5.ajax({url:templateDirectory+'/'+route+'.html'}).then(function(req){l(view).html(req.response);l(document).trigger('view.'+route);typeof callbacks[route]==='function'&&callbacks[route]()}).catch(function(err){throw err});initialized=true});window.location.hash&&!initialized&&l(window).trigger('hashchange')},/* @ creates and returns a Promise representing an HTTP response */ajax:function ajax(_ref){var _ref$url=_ref.url,url=_ref$url===undefined?'':_ref$url,_ref$method=_ref.method,method=_ref$method===undefined?'GET':_ref$method,data=_ref.data;return new Promise(function(resolve,reject){var req=_openAndReturnReq(method,url);req.onreadystatechange=function(){if(req.readyState===4){switch(Math.floor(req.status/100)){case 4:case 5:reject(req);break;default:resolve(req);}}};req.send(data)})},/** @ creates a new DOM node or collection of DOM nodes
      * - {elem} may be either the name of an element, such as "span", or it may be a more complex
      *   string of markup, such as "<span id='span1' class='sideways-baseball-cap'></span>"
    **/create:function create(elem){var newElement=void 0;if(elem[0]==='<'){var temp=document.createElement('div');temp.innerHTML=elem;newElement=temp.childElementCount===1?temp.firstChild:temp.children}else{newElement=document.createElement(elem)}return newElement},/** @ the wrapper for the web-app
      * - {head} js to execute immediately
      * - {body} js to be run onDOMContentLoaded
    **/init:function init(_ref2){var _ref2$head=_ref2.head,head=_ref2$head===undefined?noop:_ref2$head,_ref2$body=_ref2.body,body=_ref2$body===undefined?noop:_ref2$body;try{head();this.DOMContentLoaded(body)}catch(e){if(~location.search.indexOf('mobile')){document.write('<h1>'+e.stack+'</h1>')}else{console.error(e)}}},/** @ serializes an object for inclusion as url parameters **/params:function params(obj){return Object.keys(obj).reduce(function(prev,curr,i,arr){return prev+=curr+'='+encodeURIComponent(obj[curr])+(i!==arr.length-1?'&':'')},'?')}});window.l=l;// non-obtrusive prototype methods
Object.prototype.forIn=function(callback){for(var key in undefined){if(undefined.hasOwnProperty(key)){callback(key,undefined[key],undefined)}}};// override
console.debug=function(){var _console;if(window.DEBUG)(_console=console).log.apply(_console,arguments)}})();
//# sourceMappingURL=livity.js.map