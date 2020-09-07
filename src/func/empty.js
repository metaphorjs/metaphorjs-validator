
require("../__init.js");
require("./checkable.js");
require("./getLength.js");
require("metaphorjs/src/func/dom/getInputValue.js");

const MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

// from http://bassistance.de/jquery-plugins/jquery-plugin-validation/
module.exports = MetaphorJs.validator.empty = function(value, element) {

    if (!element) {
        return value == undefined || value === '';
    }

    switch(element.nodeName.toLowerCase()) {
        case 'select':{
            // could be an array for select-multiple or a string, both are fine this way
            var val = MetaphorJs.dom.getInputValue(element);
            return !val || val.length == 0;
        }
        case 'input':{
            if (MetaphorJs.validator.checkable(element))
                return MetaphorJs.validator.getLength(value, element) == 0;
            break;
        }
    }

    return value.trim().length == 0;
};