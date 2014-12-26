
var ns              = require("metaphorjs-namespace/src/var/ns.js"),
    eachNode        = require("metaphorjs/src/func/dom/eachNode.js"),
    select          = require("metaphorjs-select/src/func/select.js"),
    isAttached      = require("metaphorjs/src/func/dom/isAttached.js");

require("./checkable.js");

module.exports = (function(){

    var checkable = ns.get("validator.checkable");

    // from http://bassistance.de/jquery-plugins/jquery-plugin-validation/
    return ns.register("validator.getLength", function(value, el) {
        var l = 0;
        switch( el.nodeName.toLowerCase() ) {
            case 'select':
                eachNode(el, function(node){
                    if (node.selected) {
                        l++;
                    }
                });
                return l;
            case 'input':
                if (checkable(el)) {
                    if (el.form) {
                        eachNode(el.form, function (node) {
                            if (node.type == el.type && node.name == el.name && node.checked) {
                                l++;
                            }
                        });
                    }
                    else {
                        var parent,
                            inputs,
                            i, len;

                        if (isAttached(el)) {
                            parent  = el.ownerDocument;
                        }
                        else {
                            parent = el;
                            while (parent.parentNode) {
                                parent = parent.parentNode;
                            }
                        }

                        inputs  = select("input[name="+ el.name +"]", parent);
                        for (i = 0, len = inputs.length; i < len; i++) {
                            if (inputs[i].checked) {
                                l++;
                            }
                        }
                    }
                    return l;
                }
        }
        return value.length;
    })

}());