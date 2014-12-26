
var Directive = require("metaphorjs/src/class/Directive.js"),
    nsGet = require("metaphorjs-namespace/src/func/nsGet.js");

require("../class/validator/Component.js");

Directive.registerAttribute("mjs-validate", 250, function(scope, node, expr, renderer) {

    var cls     = expr || "validator.Component",
        constr  = nsGet(cls);

    if (!constr) {
        error(new Error("Class '"+cls+"' not found"));
    }
    else {
        new constr(node, scope, renderer);
    }
});

