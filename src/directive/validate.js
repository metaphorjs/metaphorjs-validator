
var Directive = require("metaphorjs/src/class/Directive.js"),
    nsGet = require("metaphorjs-namespace/src/func/nsGet.js");

require("../class/validator/Component.js");

Directive.registerAttribute("validate", 250,
    function(scope, node, expr, renderer, attrMap) {

    var cls     = expr || "validator.Component",
        constr  = nsGet(cls),
        cfg     = attrMap['modifier']['validate'] ?
                    attrMap['modifier']['validate'] : {};

    if (!constr) {
        error(new Error("Class '"+cls+"' not found"));
    }
    else {
        return new constr(node, scope, renderer, cfg);
    }
});

