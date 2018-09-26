
require("../__init.js");
require("./checkable.js");
require("./getLength.js");

var MetaphorJs = require("metaphorjs/src/MetaphorJs.js"),
    trim        = require("metaphorjs/src/func/trim.js"),
    getValue    = require("metaphorjs-input/src/func/getValue.js");

// from http://bassistance.de/jquery-plugins/jquery-plugin-validation/
module.exports = MetaphorJs.validator.empty = function(value, element) {

    if (!element) {
        return value == undf || value === '';
    }

    switch(element.nodeName.toLowerCase()) {
        case 'select':{
            // could be an array for select-multiple or a string, both are fine this way
            var val = getValue(element);
            return !val || val.length == 0;
        }
        case 'input':{
            if (MetaphorJs.validator.checkable(element))
                return MetaphorJs.validator.getLength(value, element) == 0;
            break;
        }
    }

    return trim(value).length == 0;
};