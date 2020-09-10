
const cls             = require("metaphorjs-class/src/cls.js"),
    MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
    extend          = require("metaphorjs-shared/src/func/extend.js"),
    bind            = require("metaphorjs-shared/src/func/bind.js"),
    isFunction      = require("metaphorjs-shared/src/func/isFunction.js"),
    isString        = require("metaphorjs-shared/src/func/isString.js"),
    nextUid         = require("metaphorjs-shared/src/func/nextUid.js");

require("../__init.js");
require("metaphorjs/src/func/dom/addListener.js");
require("metaphorjs/src/func/dom/removeListener.js");
require("metaphorjs/src/func/dom/addClass.js");
require("metaphorjs/src/func/dom/removeClass.js");
require("metaphorjs/src/func/dom/select.js");
require("metaphorjs/src/func/dom/isField.js");
require("metaphorjs/src/func/dom/normalizeEvent.js");
require("metaphorjs/src/func/dom/getAttr.js");
require("metaphorjs/src/func/dom/setAttr.js");
require("metaphorjs-observable/src/mixin/Observable.js");    
require("./Field.js");
require("./Group.js");


module.exports = MetaphorJs.validator.Validator = (function(){


    var validators  = {};

    var Field = MetaphorJs.validator.Field,
        Group = MetaphorJs.validator.Group;


    /**
     * @object MetaphorJs.validator.Validator.defaults
     */
    var defaults = {

        /**
         * @property {HTMLElement} form The form being validated
         */
        form:               null,

        /**
         * @property {object} all All fields properties. 
         * See <code>MetaphorJs.validator.Field.defaults</code>
         */
        all: 				{},

        /**
         * @property {object} fields {
         *  <code>name: config</code>. 
         * For config see <code>MetaphorJs.validator.Field.defaults</code>.
         * }
         */
        fields: 			{},

        /**
         * @property {object} rules {
         *  <code>field: []</code> set of rules. 
         *  See <code>MetaphorJs.validator.Field.defaults</code> for rules description.
         * }
         */
        rules: 				{},				// {field: rules}

        /**
         * Css classes to apply to the form
         * @object cls
         */
        cls: {
            /**
             * @property {string} valid Form is valid
             */
            valid: 			'',	
            /**
             * @property {string} valid Form has an error
             */	
            error:			'',			
            /**
             * @property {string} valid Form is being checked (async check)
             */
            checking:		''

            /**
             * @end-object
             */
        },

        /**
         * @property {object} groups {
         *  <code>name: cfg</code> set of options. 
         * See <code>MetaphorJs.validator.Group.defaults</code>.
         * }
         */
        groups: 			{},				// see groupDefaults. {name: cfg}

        // callbacks are case insensitive
        // you can use camel case if you like.
        /**
         * @object callback
         */
        callback: {
            /**
             * @property {object} state all callback's context
             */
            state:			null,

            /**
             * @property {function} * {
             *  eventName: function(v); See class's events
             *  @param {MetaphorJs.validator.Validator} v
             * }
             */

            destroy:		null,			// when validator is being destroyed. fn(api)
            reset:			null,			// when the form was resetted. fn(api)
            beforesubmit:	null,			// when form is about to be submitted: valid and non-valid. fn(api)
            submit:			null,			// when form is about to be submitted: only valid. fn(api).
            // return false to prevent submitting
            statechange:	null,			// when form's state has been changed. fn(api, state)
            check:			null,			// fn(api) performe some additional out-of-form checks
            // if false is returned, form becomes invalid

            displaystate:	null,			// fn(api, valid)
            displaystatechange:	null		// fn(api, state)

            /**
             * @end-object
             */
        }
        /**
         * @end-object
         */
    };


    /**
     * @class MetaphorJs.validator.Validator
     * @mixes MetaphorJs.mixin.Observable
     */
    var Validator = cls({

        /**
         * @event display-state-change {
         *  When displayState has been enabled or disabled
         *  @param {MetaphorJs.validator.Validator} v
         *  @param {boolean} state
         * }
         */
        /**
         * @event check {
         *  When form is being checked
         *  @param {MetaphorJs.validator.Validator} v
         *  @returns {boolean} return false to cancel check
         * }
         */
        /**
         * @event state-change {
         *  After form check, if it changed its state
         *  @param {MetaphorJs.validator.Validator} v
         *  @param {boolean} valid 
         * }
         */
        /**
         * @event reset {
         *  @param {MetaphorJs.validator.Validator} v
         * }
         */
        /**
         * @event before-submit {
         *  @param {MetaphorJs.validator.Validator} v
         *  @returns {boolean} return false to cancel submitting
         * }
         */
        /**
         * @event submit {
         *  @param {MetaphorJs.validator.Validator} v
         *  @returns {boolean} return false to cancel submitting
         * }
         */
        /**
         * @event failed-submit {
         *  @param {MetaphorJs.validator.Validator} v
         * }
         */
        /**
         * @event field-error-change {
         *  @param {MetaphorJs.validator.Validator} v
         *  @param {MetaphorJs.validator.Field} f 
         *  @param {string} error
         * }
         */
        /**
         * @event field-state-change {
         *  @param {MetaphorJs.validator.Validator} v
         *  @param {MetaphorJs.validator.Field} f 
         *  @param {boolean} valid
         * }
         */
        /**
         * @event display-state {
         *  @param {MetaphorJs.validator.Validator} v
         *  @param {boolean} valid
         * }
         */

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


        /**
         * @constructor
         * @method
         * @param {HTMLElement} el 
         * @param {object} options See <code>MetaphorJs.validator.Validator.defaults</code>
         */

        /**
         * @constructor
         * @method
         * @param {HTMLElement} el 
         * @param {string} preset Preset name to take options from. 
         * (Preset options will be overriden by <code>options</code>)
         * @param {object} options See <code>MetaphorJs.validator.Validator.defaults</code>
         */
        $init: function(el, preset, options) {

            var self    = this,
                tag     = el.nodeName.toLowerCase(),
                cfg;

            self.id     = nextUid();
            validators[self.id] = self;

            MetaphorJs.dom.setAttr(el, "data-validator", self.id);

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

        /**
         * Get validator id
         * @method
         * @returns {string}
         */
        getVldId:       function() {
            return this.id;
        },

        /**
         * Get form element
         * @method
         * @returns {HTMLElement}
         */
        getElem:        function() {
            return this.el;
        },

        /**
         * Get group by its name
         * @method
         * @param {string} name
         * @returns {MetaphorJs.validator.Group}
         */
        getGroup: function(name) {
            return this.groups[name] || null;
        },

        /**
         * Get field by name or id
         * @method
         * @param {string} id
         * @return {MetaphorJs.validator.Field}
         */
        getField:	function(id) {
            return this.fields[id] || null;
        },

        /**
         * Enable validator (enabled by default)
         * @method
         */
        enable: function() {
            this.enabled = true;
            return this;
        },

        /**
         * Disable validator
         * @method
         */
        disable: function() {
            this.enabled = false;
            return this;
        },

        /**
         * Is this validator enabled
         * @method
         * @returns {boolean}
         */
        isEnabled: function() {
            return this.enabled;
        },

        /**
         * Make validator show form errors and other messages. (Enabled by default)
         * @method
         */
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

        /**
         * Make validator not show form errors and other messages
         * @method
         */
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
         * Check if form shows errors and messages
         * @method
         * @return {boolean}
         */
        isDisplayStateEnabled:	function() {
            return this.displayState;
        },

        /**
         * Is the form valid
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

        /**
         * Get form errors
         * @method 
         * @param {boolean} plain {
         *  If plain=true, will return array [err, err], if false (default),
         *  object: (field: err, field: err)
         * }
         * @returns {array|object}
         */
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
         * @method
         * @returns {boolean} returns current form state 
         * (it may change in a second after remote checks)
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
         * @method 
         * @param {HTMLElement} node
         * @param {object} fieldCfg See <code>MetaphorJs.validator.Field.defaults</code>
         * @returns {MetaphorJs.validator.Validator}
         */
        add: function(node, fieldCfg) {

            var self    = this;

            if (!MetaphorJs.dom.isField(node)) {
                return self;
            }
            if (MetaphorJs.dom.getAttr(node, "data-no-validate") !== null) {
                return self;
            }
            if (MetaphorJs.dom.getAttr(node, "data-validator") !== null) {
                return self;
            }

            var id 			= MetaphorJs.dom.getAttr(node, 'name') || 
                                MetaphorJs.dom.getAttr(node, 'id'),
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
         * @method
         * @param {string} name
         * @param {object} cfg See <code>MetaphorJs.validator.Group.defaults</code>
         * @returns {MetaphorJs.validator.Validator}
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

            return self;
        },


        /**
         * Focus first invalid field
         * @method
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
         * Reset validator: reset all groups and fields to untouched state.
         * @method
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
         * Submit form or display errors
         * @method
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

            els = MetaphorJs.dom.select("input, textarea, select", el);

            for (i = -1, l = els.length; ++i < l; self.add(els[i])){}

            return self;
        },

        initForm: function(mode) {

            var self    = this,
                el      = self.el,
                nodes   = el.getElementsByTagName("input"),
                submits = MetaphorJs.dom.select(".submit", el),
                resets  = MetaphorJs.dom.select(".reset", el),
                fn      = mode === "bind" ? MetaphorJs.dom.addListener : 
                                            MetaphorJs.dom.removeListener,
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

            for (i = -1, l = submits.length; ++i < l;){
                if (submits[i].type !== "submit" || 
                    submits[i].tagName.toLowerCase() === "button")  {
                    fn(submits[i], "click", self.onSubmitClickDelegate);
                }
            }

            for (i = -1, l = resets.length;
                 ++i < l;
                 resets[i].type !== "reset" && fn(resets[i], "click", self.resetDelegate)
            ){}

            if (self.isForm) {
                fn(el, "submit", self.onFormSubmitDelegate);
            }
        },

        onRealSubmitClick: function(e) {
            e = MetaphorJs.dom.normalizeEvent(e || window.event);
            this.submitButton  = e.target || e.srcElement;
            this.preventFormSubmit = false;
            return this.onSubmit(e);
        },

        onSubmitClick: function(e) {
            this.preventFormSubmit = false;
            return this.onSubmit(MetaphorJs.dom.normalizeEvent(e || window.event));
        },

        onFormSubmit: function(e) {
            e = MetaphorJs.dom.normalizeEvent(e);
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
                    MetaphorJs.dom.setAttr(self.hidden, "name", self.submitButton.name);
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
                id		= MetaphorJs.dom.getAttr(elem, 'name') || 
                            MetaphorJs.dom.getAttr(elem, 'id');

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
                valid === false ? MetaphorJs.dom.addClass(el, errorCls) : 
                                MetaphorJs.dom.removeClass(el, errorCls);
            }
            if (validCls) {
                valid === true ? MetaphorJs.dom.addClass(el, validCls) : 
                                MetaphorJs.dom.removeClass(el, validCls);
            }

            self.trigger('display-state', self, valid);
        },

        onBeforeAjax: function() {
            var self = this;
            self.pending++;
            if (self.cfg.cls.ajax) {
                MetaphorJs.dom.addClass(self.el, self.cfg.cls.ajax);
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
                MetaphorJs.dom.removeClass(self.el, cfg.cls.ajax);
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

        /**
         * Add validator
         * @static
         * @method
         * @param {string} name 
         * @param {function} fn {
         *  @param {string} value
         *  @param {HTMLElement} node
         *  @param {string|*} param {
         *      Validator's attribute value. <br>
         *      <pre><input minlength="10"></pre><br>
         *      param=10
         *  }
         *  @returns {boolean} Return false to invalidate field
         * }
         * @param {string} message Error message to display if the field is invalid
         */
        addMethod:  function(name, fn, message) {
            var methods = ns.get("MetaphorJs.validator.methods");
            if (!methods[name]) {
                methods[name] = fn;
                if (message) {
                    Validator.messages[name] = message;
                }
            }
        },

        /**
         * Check if dom element already has validator initialized
         * @static
         * @method
         * @param {HTMLElement} el 
         * @returns {MetaphorJs.validator.Validator|null}
         */
        getValidator: function(el) {
            var vldId = MetaphorJs.dom.getAttr(el, "data-validator");
            return validators[vldId] || null;
        }
    });



    return Validator;

}());
