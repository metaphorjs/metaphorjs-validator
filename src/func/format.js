
var ns              = require("metaphorjs-namespace/src/var/ns.js"),
    isFunction      = require("metaphorjs/src/func/isFunction.js"),
    isArray         = require("metaphorjs/src/func/isArray.js");


module.exports = ns.register("validator.format", function(str, params) {

    if (isFunction(params)) return str;

    if (!isArray(params)) {
        params = [params];
    }

    var i, l = params.length;

    for (i = -1; ++i < l;
         str = str.replace(new RegExp("\\{" + i + "\\}", "g"), params[i])){}

    return str;
});