
require("../__init.js");

const MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
    isFunction      = require("metaphorjs-shared/src/func/isFunction.js"),
    isArray         = require("metaphorjs-shared/src/func/isArray.js");

module.exports = MetaphorJs.validator.format = function(str, params) {

    if (isFunction(params)) {
        return str;
    }

    if (!isArray(params)) {
        params = [params];
    }

    var i, l = params.length;

    for (i = -1; ++i < l;
         str = str.replace(new RegExp("\\{" + i + "\\}", "g"), params[i])){}

    return str;
};