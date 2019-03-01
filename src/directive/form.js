
require("metaphorjs/src/lib/Config.js");

var Directive = require("metaphorjs/src/app/Directive.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

require("../validator/Component.js");

Directive.registerAttribute("form", 250,
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
        Directive.resolveNode(node, "form", function(node) {
            if (!renderer.$destroyed) {
                var v = new constr(node, scope, renderer, config);
                renderer.on("destroy", v.$destroy, v);
            }
        });
    }
});

