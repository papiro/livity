window.assert = function(val) {
  return {
    isEqual: function(val2) {
      if (val === val2) console.log("%s PASSED", val)
      else throw new Error("%s FAILED", val)
    }
  }
}
