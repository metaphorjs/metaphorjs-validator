
var Directive = require("metaphorjs/src/app/Directive.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js");

require("../validator/Component.js");

Directive.registerAttribute("validate", 250,
    function(scope, node, expr, renderer, attr) {

    var cls     = expr || "MetaphorJs.validator.Component",
        constr  = ns.get(cls),
        cfg     = attr ? attr.config : {};

    if (!constr) {
        error(new Error("Class '"+cls+"' not found"));
    }
    else {
        return new constr(node, scope, renderer, cfg);
    }
});

