
require("metaphorjs/src/lib/Config.js");

var Directive = require("metaphorjs/src/app/Directive.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

require("../validator/Component.js");

Directive.registerAttribute("validate", 250,
    function(scope, node, config, renderer, attrSet) {

    config.setProperty("value", {
        mode: MetaphorJs.lib.Config.MODE_STATIC,
        type: "string",
        defaultValue: "MetaphorJs.validator.Component"
    });
    config.setMode("submit", MetaphorJs.lib.Config.MODE_FUNC);

    

    var cls     = config.get("value"),
        constr  = ns.get(cls);


    if (!constr) {
        error(new Error("Class '"+cls+"' not found"));
    }
    else {
        return new constr(node, scope, renderer, config);
    }
});

