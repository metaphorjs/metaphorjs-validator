
var ns = require("metaphorjs-namespace/src/var/ns.js");

module.exports = ns.register("validator.checkable", function(elem) {
    return /radio|checkbox/i.test(elem.type);
});