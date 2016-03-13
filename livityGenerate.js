window.livity = livity || {}
livity.generate = (function() {

var generate = function(domstruct) {
  var newNodes = []
  util.each(config, function(element, properties) {
    newNodes.push(dom.create(element).style(properties))
  })
  return newNodes.length === 1 ? newNodes[0] : newNodes
}

return generate
})
