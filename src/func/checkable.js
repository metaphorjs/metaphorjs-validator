
require("../__init.js");
var MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

module.exports = MetaphorJs.validator.checkable = function(elem) {
    return /radio|checkbox/i.test(elem.type);
};