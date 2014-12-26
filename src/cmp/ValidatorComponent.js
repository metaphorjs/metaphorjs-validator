
var Validator = require("../class/Validator.js"),
    defineClass = require("metaphorjs-class/src/func/defineClass.js"),
    bind = require("metaphorjs/src/func/bind.js"),
    createFunc = require("metaphorjs-watchable/src/func/createFunc.js"),
    error = require("metaphorjs/src/func/error.js"),
    eachNode = require("metaphorjs/src/func/dom/eachNode.js"),
    isField = require("metaphorjs/src/func/dom/isField.js"),
    Directive = require("metaphorjs/src/class/Directive.js"),
    nsGet = require("metaphorjs-namespace/src/func/nsGet.js"),
    getAttr = require("metaphorjs/src/func/dom/getAttr.js"),
    getNodeConfig = require("metaphorjs/src/func/dom/getNodeConfig.js");


Directive.registerAttribute("mjs-validate", 250, function(scope, node, expr, renderer) {

    var cls     = expr || "ValidatorComponent",
        constr  = nsGet(cls);

    if (!constr) {
        error(new Error("Class '"+cls+"' not found"));
    }
    else {
        new constr(node, scope, renderer);
    }
});


module.exports = defineClass({

    $class: "ValidatorComponent",

    node: null,
    scope: null,
    validator: null,
    scopeState: null,
    fields: null,
    formName: null,

    $init: function(node, scope, renderer) {

        var self        = this;

        self.node       = node;
        self.scope      = scope;
        self.scopeState = {};
        self.fields     = [];
        self.validator  = self.createValidator();
        self.formName   = getAttr(node, 'name') || getAttr(node, 'id') || '$form';

        self.initScope();
        self.initScopeState();
        self.initValidatorEvents();

        // wait for the renderer to finish
        // before making judgements :)
        renderer.once("rendered", self.validator.check, self.validator);
        renderer.on("destroy", self.$destroy, self);
        scope.$on("destroy", self.$destroy, self);
    },

    createValidator: function() {
        var self    = this,
            node    = self.node,
            cfg     = {},
            ncfg    = getNodeConfig(node),
            submit;

        if (submit = ncfg.submit) {
            cfg.callback = cfg.callback || {};
            cfg.callback.submit = function(fn, scope){
                return function() {
                    try {
                        return fn(scope);
                    }
                    catch(thrownError) {
                        error(thrownError);
                    }
                }
            }(createFunc(submit), self.scope);
        }

        return new Validator(node, cfg);
    },

    initValidatorEvents: function() {

        var self    = this,
            v       = self.validator;

        v.on('field-state-change', self.onFieldStateChange, self);
        v.on('state-change', self.onFormStateChange, self);
        v.on('display-state-change', self.onDisplayStateChange, self);
        v.on('field-error-change', self.onFieldErrorChange, self);
        v.on('reset', self.onFormReset, self);
    },

    initScope: function() {

        var self    = this,
            scope   = self.scope,
            name    = self.formName;

        scope[name] = self.scopeState;
    },


    initScopeState: function() {

        var self    = this,
            node    = self.node,
            state   = self.scopeState,
            fields  = self.fields,
            els, el,
            i, l,
            name;

        if (node.elements) {
            els     = node.elements;
        }
        else {
            els     = [];
            eachNode(node, function(el) {
                if (isField(el)) {
                    els.push(el);
                }
            });
        }

        for (i = -1, l = els.length; ++i < l;) {
            el = els[i];
            name = getAttr(el, "name") || getAttr(el, 'id');

            if (name && !state[name]) {
                fields.push(name);
                state[name] = {
                    $error: null,
                    $invalid: null,
                    $pristine: true,
                    $errorMessage: null
                };
            }
        }

        state.$$validator = self.validator;
        state.$invalid = false;
        state.$pristine = true;
        state.$submit = bind(self.validator.onSubmit, self.validator);
        state.$reset = bind(self.validator.reset, self.validator);
    },

    onDisplayStateChange: function(vld, state) {

        var self    = this;

        if (!state) {
            self.onFormReset(vld);
        }
        else {
            state   = self.scopeState;
            var i, l, f,
                fields = self.fields;

            for (i = 0, l = fields.length; i < l; i++) {
                f = state[fields[i]];
                if (f.$real) {
                    state[fields[i]] = f.$real;
                }
            }

            state.$invalid = !vld.isValid();
            state.$pristine = false;

            self.scope.$check();
        }

    },

    onFieldErrorChange: function(vld, field, error) {
        this.onFieldStateChange(vld, field, field.isValid());
    },

    onFormReset: function(vld) {

        var self    = this,
            state   = self.scopeState,
            i, l, f,
            fields = self.fields;

        for (i = 0, l = fields.length; i < l; i++) {
            f = state[fields[i]];
            f.$error = null;
            f.$errorMessage = null;
            f.$invalid = null;
            f.$pristine = true;
        }

        state.$invalid = false;
        state.$pristine = true;

        self.scope.$check();
    },

    onFormStateChange: function(vld, valid) {

        var self    = this,
            state   = self.scopeState;

        state.$invalid = valid === false && vld.isDisplayStateEnabled();
        state.$pristine = false;

        self.scope.$check();
    },

    onFieldStateChange: function(vld, field, valid) {

        var self    = this,
            state   = self.scopeState,
            name    = field.getName(),
            ds      = vld.isDisplayStateEnabled(),
            fstate  = {
                $error: field.getErrorRule(),
                $errorMessage: field.getError(),
                $invalid: valid === false,
                $pristine: field.getExactValidState() === null
            };

        if (ds) {
            state[name] = fstate;
        }
        else {
            state[name].$real = fstate;
        }

        self.scope.$check();
    },


    destroy: function() {
        var self = this;

        if (!self.destroyed) {
            self.validator.destroy();
        }

        if (self.scope) {
            delete self.scope[self.formName];
        }
    }

});

