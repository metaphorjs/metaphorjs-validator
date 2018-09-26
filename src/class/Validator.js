
require("../__init.js");

var cls             = require("metaphorjs-class/src/cls.js"),
    MetaphorJs      = require("metaphorjs/src/MetaphorJs.js"),
    extend          = require("metaphorjs/src/func/extend.js"),
    bind            = require("metaphorjs/src/func/bind.js"),
    addListener     = require("metaphorjs/src/func/event/addListener.js"),
    removeListener  = require("metaphorjs/src/func/event/removeListener.js"),
    addClass        = require("metaphorjs/src/func/dom/addClass.js"),
    removeClass     = require("metaphorjs/src/func/dom/removeClass.js"),
    select          = require("metaphorjs-select/src/func/select.js"),
    isField         = require("metaphorjs/src/func/dom/isField.js"),
    normalizeEvent  = require("metaphorjs/src/func/event/normalizeEvent.js"),
    isFunction      = require("metaphorjs/src/func/isFunction.js"),
    isString        = require("metaphorjs/src/func/isString.js"),
    getAttr         = require("metaphorjs/src/func/dom/getAttr.js"),
    setAttr         = require("metaphorjs/src/func/dom/setAttr.js"),
    nextUid         = require("metaphorjs/src/func/nextUid.js");


require("./validator/Field.js");
require("./validator/Group.js");
require("metaphorjs-observable/src/mixin/Observable.js");

module.exports = (function(){


    var validators  = {};

    var Field = MetaphorJs.validator.Field,
        Group = MetaphorJs.validator.Group;


    var defaults = /*validator-options-start*/{

        form:               null,           // form element -- jquery

        all: 				{},				// {} of field properties which work as a preset
        fields: 			{},				// {field: properties}
        rules: 				{},				// {field: rules}

        cls: {
            valid: 			'',				// css class for a valid form
            error:			'',				// css class for a not valid form
            checking:		''				// css class for a form while it is being checked with ajax request
        },

        groups: 			{},				// see groupDefaults. {name: cfg}

        // callbacks are case insensitive
        // you can use camel case if you like.
        callback: {

            scope:			null,

            destroy:		null,			// when validator is being destroyd. fn(api)
            reset:			null,			// when the form was resetted. fn(api)
            beforesubmit:	null,			// when form is about to be submitted: valid and non-valid. fn(api)
            submit:			null,			// when form is about to be submitted: only valid. fn(api).
            // return false to prevent submitting
            statechange:	null,			// when form's state has been changed. fn(api, state)
            check:			null,			// fn(api) performe some additional out-of-form checks
            // if false is returned, form becomes invalid

            displaystate:	null,			// fn(api, valid)
            displaystatechange:	null		// fn(api, state)
        }
    }/*validator-options-end*/;


    var Validator = cls({

        $class: "MetaphorJs.validator.Validator",
        $mixins: [MetaphorJs.mixin.Observable],

        id:             null,
        el:             null,
        cfg:            null,
        enabled: 		false,
        invalid:		null,					// array of invalid fields
        pending: 		0,						// number of pending requests
        grps:			0,						// number of invalid groups
        outside:		true,					// true - outside check passed or not present
        submitted:		false,
        displayState:	false,
        isForm: 		false,
        isField: 		false,
        submitButton: 	null,
        hidden:			null,

        preventFormSubmit: false,

        fields:         null,
        groups:         null,

        $init: function(el, preset, options) {

            var self    = this,
                tag     = el.nodeName.toLowerCase(),
                cfg;

            self.id     = nextUid();
            validators[self.id] = self;

            setAttr(el, "data-validator", self.id);

            self.el     = el;

            if (preset && !isString(preset)) {
                options         = preset;
                preset          = null;
            }

            self.cfg            = cfg = extend({}, defaults, Validator.defaults, Validator[preset], options, true, true);

            self.$initObservable(cfg);

            self.isForm         = tag === 'form';
            self.isField        = /input|select|textarea/.test(tag);

            self.fields         = {};
            self.groups         = {};

            self.$$observable.createEvent("submit", false);
            self.$$observable.createEvent("beforesubmit", false);

            self.onRealSubmitClickDelegate  = bind(self.onRealSubmitClick, self);
            self.resetDelegate = bind(self.reset, self);
            self.onSubmitClickDelegate = bind(self.onSubmitClick, self);
            self.onFormSubmitDelegate = bind(self.onFormSubmit, self);

            var i;

            self.initFields();

            var fields  = self.fields;

            for (i in cfg.rules) {
                if (!fields[i]) {
                    continue;
                }
                fields[i].setRules(cfg.rules[i], false);
            }

            cfg.rules	= null;

            for (i in cfg.groups) {
                self.addGroup(i, cfg.groups[i]);
            }

            self.initForm('bind');

            delete cfg.rules;
            delete cfg.fields;
            delete cfg.groups;

            self.enabled = true;
        },

        getVldId:       function() {
            return this.id;
        },

        /**
         * @returns {Element}
         */
        getElem:        function() {
            return this.el;
        },

        /**
         * @return {validator.Group}
         */
        getGroup: function(name) {
            return this.groups[name] || null;
        },

        /**
         * @return {validator.Field}
         */
        getField:	function(id) {
            return this.fields[id] || null;
        },

        /**
         * Enable validator
         */
        enable: function() {
            this.enabled = true;
            return this;
        },

        /**
         * Disable validator
         */
        disable: function() {
            this.enabled = false;
            return this;
        },

        /**
         * @return boolean
         */
        isEnabled: function() {
            return this.enabled;
        },

        enableDisplayState:	function() {

            var self    = this,
                fields  = self.fields,
                groups  = self.groups,
                i;

            if (self.displayState !== true) {

                self.displayState = true;

                for (i in fields) {
                    fields[i].enableDisplayState();
                }
                for (i in groups) {
                    groups[i].enableDisplayState();
                }

                self.trigger('display-state-change', self, true);
            }

            return self;
        },

        disableDisplayState:	function() {

            var self    = this,
                groups  = self.groups,
                fields  = self.fields,
                i;

            if (self.displayState !== false) {

                self.displayState = false;

                for (i in fields) {
                    fields[i].disableDisplayState();
                }
                for (i in groups) {
                    groups[i].disableDisplayState();
                }

                self.trigger('display-state-change', self, false);
            }

            return self;
        },

        /**
         * @return {boolean}
         */
        isDisplayStateEnabled:	function() {
            return this.displayState;
        },


        /**
         * Is form valid
         * @return {boolean}
         */
        isValid: function() {

            var self    = this;

            if (self.enabled === false) {
                return true;
            }
            return 	self.invalid === 0 &&
                      self.pending === 0 &&
                      self.grps === 0 &&
                      self.outside === true;
        },

        getErrors: function(plain) {

            var self    = this,
                ers     = plain === true ? [] : {},
                err,
                i, j,
                all     = [self.fields, self.groups],
                curr;

            if (!self.isEnabled()) {
                return ers;
            }

            for (j = 0; j < 2; j++) {

                curr = all[j];

                for (i in curr) {
                    if (curr[i].getExactValidState() === null) {
                        curr[i].check();
                    }

                    if (!curr[i].isValid()) {

                        err = curr[i].getError();

                        // it can be invalid, but have no error
                        if (err) {
                            if (plain) {
                                ers.push(err);
                            }
                            else {
                                ers[i] = err;
                            }
                        }
                    }
                }
            }

            return ers;
        },


        /**
         * Check form for errors
         */
        check: function() {


            var self    = this,
                fields  = self.fields,
                groups  = self.groups;

            // disabled field validator always returns true
            if (!self.isEnabled()) {
                return true;
            }

            var prevValid	= self.isValid(),
                nowValid,
                i;

            for (i in fields) {
                fields[i].check();
            }

            for (i in groups) {
                groups[i].check();
            }

            self.outside 	= self.trigger('check', self) !== false;
            nowValid		= self.isValid();

            if (prevValid != nowValid) {
                self.doDisplayState();
                self.trigger('state-change', self, false);
            }

            return nowValid;
        },


        /**
         * Add field
         */
        add: function(node, fieldCfg) {

            var self    = this;

            if (!isField(node)) {
                return self;
            }
            if (getAttr(node, "data-no-validate") !== null) {
                return self;
            }
            if (getAttr(node, "data-validator") !== null) {
                return self;
            }

            var id 			= getAttr(node, 'name') || getAttr(node, 'id'),
                cfg         = self.cfg,
                fields      = self.fields,
                fcfg,
                f;

            if (!id) {
                return self;
            }

            fcfg 	= cfg.fields && cfg.fields[id] ? cfg.fields[id] : (fieldCfg || {});

            if (isString(fcfg)) {
                fcfg 	= {rules: [fcfg]};
            }

            fcfg 	= extend({}, cfg.all || {}, fcfg, true, true);

            if (fcfg.ignore) {
                return self;
            }

            if (!fcfg.callback) {
                fcfg.callback = {
                    context:	self.$$callbackContext
                };
            }

            f       = new Field(node, fcfg, self);
            fcfg    = null;
            id      = f.getName();

            if (fields[id]) {
                return self; // already added
            }

            fields[id] = f;

            self.setFieldEvents(f, 'on');

            if (self.displayState) {
                f.enableDisplayState();
            }

            if (self.isEnabled() && self.invalid !== null) {
                f.check();
            }

            return self;
        },

        /**
         * Add group of fields
         */
        addGroup:		function(name, cfg) {

            var self    = this,
                groups  = self.groups;

            if (!groups[name]) {

                cfg.name		= name;

                groups[name]	= new Group(cfg, self);
                self.setGroupEvents(groups[name], 'on');

                if (self.isEnabled() && self.invalid !== null) {
                    groups[name].check();
                }
            }
        },


        /**
         * Focus first invalid field
         */
        focusInvalid: function() {
            var fields  = this.fields;
            for (var i in fields) {
                if (!fields[i].isValid()) {
                    fields[i].getElem().focus();
                    return;
                }
            }
        },


        /**
         * Reset validator
         */
        reset: function() {

            var self    = this,
                fields  = self.fields,
                groups  = self.groups,
                i;

            self.submitted 	= false;

            self.disableDisplayState();

            for (i in groups) {
                groups[i].reset();
            }

            for (i in fields) {
                fields[i].reset();
            }

            self.pending 		= 0;
            self.invalid 		= null;
            self.grps			= 0;
            self.outside		= false;

            self.doDisplayState();
            self.trigger('reset', self);

            return self;
        },


        /**
         * Submit form
         */
        submit: function() {

            var self    = this,
                el      = self.el;

            if (!self.isForm) {
                self.onSubmit();
                return;
            }

            if (isFunction(el.submit)) {

                if (self.trigger('before-submit', self) !== false &&
                    self.trigger('submit', self) !== false) {
                    el.submit();
                }
            }
            else {
                self.onSubmit();
            }
        },

        setFieldEvents: function(v, mode) {
            var self    = this;
            v[mode]('state-change', self.onFieldStateChange, self);
            v[mode]('before-ajax', self.onBeforeAjax, self);
            v[mode]('after-ajax', self.onAfterAjax, self);
            v[mode]('submit', self.onFieldSubmit, self);
            v[mode]('destroy', self.onFieldDestroy, self);
            v[mode]('error-change', self.onFieldErrorChange, self);
        },

        setGroupEvents:	function(g, mode) {
            g[mode]('state-change', this.onGroupStateChange, this);
        },


        initFields: function() {

            var self    = this,
                el      = self.el,
                els, i, l;

            if (self.isField) {
                self.add(el);
                return self;
            }

            els = select("input, textarea, select", el);

            for (i = -1, l = els.length; ++i < l; self.add(els[i])){}

            return self;
        },

        initForm: function(mode) {

            var self    = this,
                el      = self.el,
                nodes   = el.getElementsByTagName("input"),
                submits = select(".submit", el),
                resets  = select(".reset", el),
                fn      = mode === "bind" ? addListener : removeListener,
                i, l,
                type,
                node;

            for (i = 0, l = nodes.length; i < l; i++) {
                node = nodes[i];
                type = node.type;
                if (type === "submit") {
                    fn(node, "click", self.onRealSubmitClickDelegate);
                }
                else if (type === "reset") {
                    fn(node, "click", self.resetDelegate);
                }
            }

            for (i = -1, l = submits.length;
                 ++i < l;
                 submits[i].type !== "submit" && fn(submits[i], "click", self.onSubmitClickDelegate)
            ){}

            for (i = -1, l = resets.length;
                 ++i < l;
                 resets[i].type !== "reset" && fn(resets[i], "click", self.resetDelegate)
            ){}

            if (self.isForm) {
                fn(el, "submit", self.onFormSubmitDelegate);
            }
        },

        onRealSubmitClick: function(e) {
            e = normalizeEvent(e || window.event);
            this.submitButton  = e.target || e.srcElement;
            this.preventFormSubmit = false;
            return this.onSubmit(e);
        },

        onSubmitClick: function(e) {
            this.preventFormSubmit = false;
            return this.onSubmit(normalizeEvent(e || window.event));
        },

        onFormSubmit: function(e) {
            e = normalizeEvent(e);
            if (!this.isValid() || this.preventFormSubmit) {
                e.preventDefault();
                return false;
            }

        },

        onFieldSubmit: function(fapi, e) {

            var self    = this;
            self.preventFormSubmit = false;
            self.enableDisplayState();
            self.submitted = true;

            return self.onSubmit(e);
        },

        onSubmit: function(e) {

            var self    = this;

            self.enableDisplayState();

            if (!self.isForm) {
                e && e.preventDefault();
                e && e.stopPropagation();
            }

            if (self.pending) {
                e && e.preventDefault();
                return false;
            }

            var buttonClicked = !!self.submitButton;

            if (self.isForm) {

                if (self.hidden) {
                    self.el.removeChild(self.hidden);
                    self.hidden = null;
                }

                // submit button's value is only being sent with the form if you click the button.
                // since there can be a delay due to ajax checks and the form will be submitted later
                // automatically, we need to create a hidden field
                if (self.submitButton && /input|button/.test(self.submitButton.nodeName)) {
                    self.hidden = window.document.createElement("input");
                    self.hidden.type = "hidden";
                    setAttr(self.hidden, "name", self.submitButton.name);
                    self.hidden.value = self.submitButton.value;
                    self.el.appendChild(self.hidden);
                }
            }

            self.submitButton = null;

            if (!self.isValid()) {
                self.check();
                self.onFieldStateChange();

                if (self.pending) {
                    // TODO: find out why this flag is not being set in all onSubmit handlers
                    self.submitted = true;
                    e && e.preventDefault();
                    return false;
                }
            }

            if (self.trigger('before-submit', self) === false || !self.isValid()) {

                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                if (!self.pending) {
                    self.focusInvalid();
                    self.submitted = false;
                }

                self.trigger('failed-submit', self, buttonClicked);
                return false;
            }

            if (!self.pending) {
                self.submitted = false;
            }

            var res = self.trigger('submit', self);
            self.preventFormSubmit = res === false;
            return !self.isForm ? false : res;
        },

        onFieldDestroy: function(f) {

            var elem 	= f.getElem(),
                id		= getAttr(elem, 'name') || getAttr(elem, 'id');

            delete this.fields[id];
        },

        onFieldErrorChange: function(f, error) {
            this.trigger("field-error-change", this, f, error);
        },

        onFieldStateChange: function(f, valid) {

            var self        = this,
                num 		= self.invalid,
                fields      = self.fields;

            self.invalid 	= 0;

            for (var i in fields) {
                self.invalid += fields[i].isValid() ? 0 : 1;
            }

            if (f) {
                self.trigger('field-state-change', self, f, valid);
            }

            if (num === null || (num !== null && self.invalid !== num)) {
                self.doDisplayState();
                self.trigger('state-change', self, self.isValid());
            }
        },

        onGroupStateChange:	function() {

            var self        = this,
                groups      = self.groups,
                num 		= self.grps;

            self.grps 	= 0;

            for (var i in groups) {
                self.grps += groups[i].isValid() ? 0 : 1;
            }

            if (num === null || (num !== null && self.grps !== num)) {
                self.doDisplayState();
                self.trigger('state-change', self, self.isValid());
            }
        },

        doDisplayState: function() {

            var self        = this,
                cfg         = self.cfg,
                valid 		= self.isValid(),
                errorCls	= cfg.cls.error,
                validCls	= cfg.cls.valid,
                el          = self.el;

            if (self.isField || !self.displayState) {
                valid		= null;
            }

            if (self.invalid === null) {
                valid = null;
            }

            if (errorCls) {
                valid === false ? addClass(el, errorCls) : removeClass(el, errorCls);
            }
            if (validCls) {
                valid === true ? addClass(el, validCls) : removeClass(el, validCls);
            }

            self.trigger('display-state', self, valid);
        },

        onBeforeAjax: function() {
            var self = this;
            self.pending++;
            if (self.cfg.cls.ajax) {
                addClass(self.el, self.cfg.cls.ajax);
            }
        },

        onAfterAjax: function() {

            var self    = this,
                fields  = self.fields,
                cfg     = self.cfg;

            self.pending = 0;

            for (var i in fields) {
                self.pending += fields[i].isPending() ? 1 : 0;
            }

            self.doDisplayState();

            if (cfg.cls.ajax) {
                removeClass(self.el, cfg.cls.ajax);
            }

            if (self.submitted && self.pending == 0) {
                self.submitted = false;

                if (self.isValid()) {
                    self.submit();
                }
                else {
                    self.focusInvalid();
                }
            }
        },


        /**
         * Destroy validator
         */
        onDestroy: function() {

            var self    = this,
                groups  = self.groups,
                fields  = self.fields,
                i;

            self.reset();
            //self.trigger('destroy', self);

            delete validators[self.id];

            for (i in groups) {
                if (groups.hasOwnProperty(i) && groups[i]) {
                    self.setGroupEvents(groups[i], 'un');
                    groups[i].$destroy();
                }
            }

            for (i in fields) {
                if (fields.hasOwnProperty(i) && fields[i]) {
                    self.setFieldEvents(fields[i], 'un');
                    fields[i].$destroy();
                }
            }

            self.initForm('unbind');

            self.fields = null;
            self.groups = null;
            self.el = null;
            self.cfg = null;
        }

    }, {

        defaults:   {},

        addMethod:  function(name, fn, message) {
            var methods = ns.get("validator.methods");
            if (!methods[name]) {
                methods[name] = fn;
                if (message) {
                    Validator.messages[name] = message;
                }
            }
        },

        getValidator: function(el) {
            var vldId = getAttr(el, "data-validator");
            return validators[vldId] || null;
        }


    });



    return Validator;

}());
