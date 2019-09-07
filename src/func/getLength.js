
require("../__init.js");
require("./checkable.js");

var MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
    eachNode        = require("metaphorjs/src/func/dom/eachNode.js"),
    select          = require("metaphorjs/src/func/dom/select.js"),
    isAttached      = require("metaphorjs/src/func/dom/isAttached.js");

// from http://bassistance.de/jquery-plugins/jquery-plugin-validation/
module.exports = MetaphorJs.validator.getLength = function(value, el) {
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
            if (MetaphorJs.validator.checkable(el)) {
                if (el.form) {
                    eachNode(el.form, function (node) {
                        if (node.type == el.type && node.name == el.name && 
                            node.checked) {
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
};