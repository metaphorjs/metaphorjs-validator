
const cls = require("metaphorjs-class/src/cls.js"),
    bind = require("metaphorjs-shared/src/func/bind.js"),
    error = require("metaphorjs-shared/src/func/error.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

require("metaphorjs/src/lib/Config.js");
require("../__init.js");
require("./Validator.js");
require("metaphorjs/src/lib/Expression.js");
require("metaphorjs/src/func/dom/eachNode.js");
require("metaphorjs/src/func/dom/isField.js");
require("metaphorjs/src/func/dom/getAttr.js");


module.exports = MetaphorJs.validator.Component = cls({

    node: null,
    state: null,
    validator: null,
    stateData: null,
    fields: null,
    formName: null,
    nodeCfg: null,

    $init: function(node, state, renderer, nodeCfg) {

        var self        = this;

        self.$self.initConfig(nodeCfg);

        self.node       = node;
        self.state      = state;
        self.stateData = {};
        self.fields     = [];
        self.nodeCfg    = nodeCfg;
        self.validator  = self.createValidator();
        self.formName   = nodeCfg.get("ref") ||
                            MetaphorJs.dom.getAttr(node, 'name') || 
                            MetaphorJs.dom.getAttr(node, 'id') || 
                            '$form';

        self.initState();
        self.initStateData();
        self.initValidatorEvents();

        // wait for the renderer to finish
        // before making judgements :)
        renderer.on("rendered", self.validator.check, self.validator, {
            once: true
        });
        renderer.on("destroy", self.$destroy, self);
        state.$on("destroy", self.$destroy, self);
    },

    createValidator: function() {
        var self    = this,
            node    = self.node,
            cfg     = {},
            ncfg    = self.nodeCfg,
            submit;

        if ((submit = ncfg.get("submit"))) {
            cfg.callback = cfg.callback || {};
            cfg.callback.submit = function(fn, state){
                return function() {
                    try {
                        return fn(state);
                    }
                    catch(thrownError) {
                        error(thrownError);
                    }
                }
            }(submit, self.state);
        }

        return new MetaphorJs.validator.Validator(node, cfg);
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

    initState: function() {

        const state   = this.state,
              name    = this.formName;

        state[name] = this.stateData;
    },


    initStateData: function() {

        var self    = this,
            node    = self.node,
            state   = self.stateData,
            fields  = self.fields,
            els, el,
            i, l,
            name;

        if (node.elements) {
            els     = node.elements;
        }
        else {
            els     = [];
            MetaphorJs.dom.eachNode(node, function(el) {
                if (MetaphorJs.dom.isField(el)) {
                    els.push(el);
                }
            });
        }

        for (i = -1, l = els.length; ++i < l;) {
            el = els[i];
            name = MetaphorJs.dom.getAttr(el, "name") || 
                    MetaphorJs.dom.getAttr(el, 'id');

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
        state.$isDestroyed = bind(self.$isDestroyed, self);
        state.$submit = bind(self.validator.onSubmit, self.validator);
        state.$reset = bind(self.validator.reset, self.validator);
    },

    onDisplayStateChange: function(vld, state) {

        var self    = this;

        if (!state) {
            self.onFormReset(vld);
        }
        else {
            state   = self.stateData;
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

            self.state.$check();
        }

    },

    onFieldErrorChange: function(vld, field, error) {
        this.onFieldStateChange(vld, field, field.isValid());
    },

    onFormReset: function(vld) {

        var self    = this,
            state   = self.stateData,
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

        self.state.$check();
    },

    onFormStateChange: function(vld, valid) {

        var self    = this,
            state   = self.stateData;

        state.$invalid = valid === false && vld.isDisplayStateEnabled();
        state.$pristine = false;

        self.state.$check();
    },

    onFieldStateChange: function(vld, field, valid) {

        var self    = this,
            state   = self.stateData,
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

        self.state.$check();
    },


    onDestroy: function() {
        var self = this;

        self.validator.$destroy();

        if (self.state) {
            delete self.state[self.formName];
        }
    }

}, {
    initConfig: function(config) {
        config.setDefaultMode("ref", MetaphorJs.lib.Config.MODE_STATIC);
    }
});

