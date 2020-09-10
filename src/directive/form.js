
require("metaphorjs/src/lib/Config.js");

const Directive = require("metaphorjs/src/app/Directive.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

require("../validator/Component.js");

Directive.registerAttribute("form", 250, function(){
    var dir = function form_directive(state, node, config, renderer, attrSet) {

        dir.initConfig(config)
    
        var cls     = config.get("value"),
            constr  = ns.get(cls);
    
        if (!constr) {
            error(new Error("Class '"+cls+"' not found"));
        }
        else {
            Directive.resolveNode(node, "form", function(node) {
                if (!renderer.$destroyed) {
                    var v = new constr(node, state, renderer, config);
                    renderer.on("destroy", v.$destroy, v);
                }
            });
        }
    };

    dir.initConfig = function(config) {
        config.setProperty("value", {
            mode: MetaphorJs.lib.Config.MODE_STATIC,
            type: "string",
            defaultValue: "MetaphorJs.validator.Component"
        });
        config.setMode("submit", MetaphorJs.lib.Config.MODE_FUNC);
    };

    dir.deepInitConfig = function(config) {
        MetaphorJs.validator.Component.initConfig(config);
    }

    return dir;
}());

