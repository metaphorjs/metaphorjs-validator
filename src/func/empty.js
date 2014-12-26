
var ns          = require("metaphorjs-namespace/src/var/ns.js"),
    getValue    = require("metaphorjs-input/src/func/getValue.js");

require("./checkable.js");
require("./getLength.js");

module.exports = (function(){

    var checkable   = ns.get("validator.checkable"),
        getLength   = ns.get("validator.getLength");

    // from http://bassistance.de/jquery-plugins/jquery-plugin-validation/
    return ns.register("validator.empty", function(value, element) {

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
                if (checkable(element))
                    return getLength(value, element) == 0;
                break;
            }
        }

        return trim(value).length == 0;
    });

}());