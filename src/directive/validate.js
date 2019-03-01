
require("metaphorjs/src/func/dom/data.js");
require("metaphorjs/src/func/dom/getAttr.js");
require("metaphorjs-validator/src/validator/Validator.js");

var Directive = require("metaphorjs/src/app/Directive.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

Directive.registerAttribute("validate", 200, function(scope, node, config, renderer) { 

    Directive.resolveNode(node, "validate", function(node){

        if (!renderer.$destroyed) {
            var id = MetaphorJs.dom.getAttr(node, "name") ||
                    MetaphorJs.dom.getAttr(node, "id"),
            v = MetaphorJs.validator.Validator.getValidator(node),
            f = v ? v.getField(id) : null;

            if (f) {
                f.setConfigRules(config);
            }

            config.clear();
        }
    });
    
});
