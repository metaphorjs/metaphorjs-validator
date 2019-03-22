
var cls             = require("metaphorjs-class/src/cls.js"),
    MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
    extend          = require("metaphorjs-shared/src/func/extend.js"),
    bind            = require("metaphorjs-shared/src/func/bind.js"),
    isFunction      = require("metaphorjs-shared/src/func/isFunction.js"),
    isString        = require("metaphorjs-shared/src/func/isString.js"),
    isBool          = require("metaphorjs-shared/src/func/isBool.js"),
    ajax            = require("metaphorjs-ajax/src/func/ajax.js"),
    undf            = require("metaphorjs-shared/src/var/undf.js");

require("../__init.js");
require("metaphorjs/src/func/dom/data.js");
require("metaphorjs/src/func/dom/getAttr.js");
require("metaphorjs/src/func/dom/setAttr.js");
require("metaphorjs/src/func/dom/removeAttr.js");
require("metaphorjs/src/func/dom/addClass.js");
require("metaphorjs/src/func/dom/removeClass.js");
require("metaphorjs/src/func/dom/normalizeEvent.js");
require("metaphorjs/src/lib/Input.js");
require("metaphorjs/src/lib/Config.js");
require("metaphorjs-observable/src/mixin/Observable.js");
require("../var/messages.js");
require("../var/methods.js");
require("../func/empty.js");
require("../func/format.js");


module.exports = MetaphorJs.validator.Field = (function(){

    /* ***************************** FIELD ****************************************** */


    /**
     * @object MetaphorJs.validator.Field.defaults
     */
    var defaults = {

        /**
         * @property {boolean} allowSubmit call form.submit() on field's ENTER keyup
         */
        allowSubmit:		true,

        /**
         * @property {boolean} alwaysCheck run tests even the field is proven 
         * valid and hasn't changed since last check
         */
        alwaysCheck:		false,

        /**
         * @property {boolean} alwaysDisplayState 
         */
        alwaysDisplayState:	false,

        /**
         * @property {*} data User data to store with the field
         */
        data:				null,

        /**
         * @property {boolean} ignore put ignore:true to field config to ignore the field completely
         */
        ignore:				null,

        /**
         * @property {boolean} disabled make validator disabled for this field initially
         */
        disabled:			false,

        /**
         * @object cls
         */
        cls: {
            /**
             * @property {string} valid css class for a valid state
             */
            valid: 			'',
            /**
             * @property {string} error css class for an error state
             */
            error:			'',
            /**
             * @property {string} ajax css class for the field with it is being checked remotely
             */
            ajax:			''

            /**
             * @end-object
             */
        },

        // if string is provided, considered errorBox: {tag: '...'}
        /**
         * @object errorBox error box config
         */
        errorBox: {
            /**
             * @property {string} cls error box css class
             */
            cls: 			'',
            /**
             * @property {function} fn {
             *  Must return dom node (cancels auto creation)
             *  @param {MetaphorJs.validator.Field} f
             *  @returns {HTMLElement}
             * }
             */
            fn:				null,
            /**
             * @property {string} tag Auto-create element with this tag
             */
            tag:			'',
            /**
             * @property {string} position {
             *  before|after|appendParent where to put newly created element
             *  @default after
             * }
             */
            position:		'after',
            /**
             * @property {string|DomNode} elem {
             *  Use this element as error box. (Dom node or selector)
             * }
             */
            elem:			null,
            /**
             * @property {boolean} enabled {
             *  Enable or disable error box
             *  @default true
             * }
             */
            enabled:		true

            /**
             * @end-object
             */
        },

        // callbacks are case insensitive
        // you can use camel case if you like.
        /**
         * @object callback
         */
        callback: {
            /**
             * @property {object} scope all callback's context
             */
            scope:			null,

            /**
             * @property {function} * {
             *  eventName: function(f); See class's events
             *  @param {MetaphorJs.validator.Field} f
             * }
             */

            destroy:		null,			// called when field's validator is being destroyed. fn(api)
            statechange:	null,			// when field's state has been changed. fn(api, (boolean) state)
            errorchange:	null,			// fn(api, error)
            submit:			null,			// when enter key was pressed. fn(api, event). return false to prevent submitting even
            // if the form is valid
            check:          null,           // called after each check (may not be relevant, if there is a ajax check) fn(api, valid)
            beforeAjax:		null,			// when ajax check is about to be executed. fn(api, requestData)
            afterAjax:		null,			// when ajax check ended. fn(api)

            displaystate:	null			// use this to display custom field state: fn(api, valid, error)
            /**
             * @end-object
             */
        },

        /**
         * @property {object} rules {
         *  Keys of this object are validators from 
         *  <code>MetaphorJs.validator.methods</code>, values
         *  of this object are validator params.<br>
         *  Rule can also be a function (custom validator):
         *  fn(fieldValue, dom, ruleValue, field)<br>
         *  The function must return error message, false or true.
         * }
         */
        rules: 				{},

        /**
         * @property {object} messages {
         *  <code>rule: message</code>, error messages 
         * }
         */
        messages: 			{}

        /**
         * @end-object
         */
    };


    var fixFieldShorthands = function(options) {

        if (!options) {
            return {};
        }

        var fix = function(level1, level2, type) {
            var value   = options[level1],
                yes     = false;

            if (value === undf) {
                return;
            }

            switch (type) {
                case "string": {
                    yes     = isString(value);
                    break;
                }
                case "function": {
                    yes     = isFunction(value);
                    break;
                }
                case "boolean": {
                    yes = isBool(value);
                    break;
                }
            }
            if (yes) {
                options[level1] = {};
                options[level1][level2] = value;
            }
        };

        fix("errorBox", "enabled", "boolean");
        fix("errorBox", "tag", "string");
        fix("errorBox", "fn", "function");

        return options;
    };


    var messages = MetaphorJs.validator.messages,
        methods = MetaphorJs.validator.methods,
        empty = MetaphorJs.validator.empty,
        format = MetaphorJs.validator.format;


    /**
     * @class MetaphorJs.validator.Field
     * @mixes MetaphorJs.mixin.Observable
     */
    return cls({

        /**
         * @event check {
         *  @param {MetaphorJs.validator.Field} f
         *  @param {boolean} valid
         * }
         */
        /**
         * @event display-state {
         *  @param {MetaphorJs.validator.Field} f
         *  @param {boolean} valid
         *  @param {string} error
         * }
         */
        /**
         * @event state-change {
         *  @param {MetaphorJs.validator.Field} f
         *  @param {boolean} valid
         * }
         */
        /**
         * @event error-change {
         *  @param {MetaphorJs.validator.Field} f
         *  @param {string} error 
         *  @param {string} rule
         * }
         */
        /**
         * @event submit {
         *  @param {MetaphorJs.validator.Field} f
         *  @param {MetaphorJs.lib.DomEvent} event
         *  @returns {boolean} return false to cancel
         * }
         */
        /**
         * @event before-ajax {
         *  @param {MetaphorJs.validator.Field} f
         *  @param {object} ajaxCfg
         * }
         */
        /**
         * @event after-ajax {
         *  @param {MetaphorJs.validator.Field} f
         * }
         */
        
        $mixins: [MetaphorJs.mixin.Observable],

        vldr:           null,
        elem:           null,
        rules:          null,
        cfg:            null,

        input:          null,

        enabled:		true,
        valid:			null,			// the field has been checked and is valid (null - not checked yet)
        dirty:			false,			// the field's value changed, hasn't been rechecked yet
        id:				null,
        prev:			'',
        error:			null,
        errorRule:      null,
        pending: 		null,
        rulesNum:		0,
        displayState:	false,
        data:			null,
        checking:		false,
        checkTmt:		null,
        errorBox:       null,
        customError:    false,

        /**
         * @constructor
         * @method
         * @param {HTMLElement} elem 
         * @param {object} options See <code>MetaphorJs.validator.Field.defaults</code>
         * @param {MetaphorJs.validator.Validator} vldr 
         */
        $init: function(elem, options, vldr) {
            options             = options || {};

            var self            = this,
                cfg;

            self.cfg            = cfg = extend({}, defaults,
                fixFieldShorthands(MetaphorJs.validator.Field.defaults),
                fixFieldShorthands(options),
                true, true
            );

            self.input          = MetaphorJs.lib.Input.get(elem);
            self.input.onChange(self.onInputChange, self);
            self.input.onKey(13, self.onInputSubmit, self);

            self.elem           = elem;
            self.vldr           = vldr;
            self.enabled        = !elem.disabled;
            self.id             = MetaphorJs.dom.getAttr(elem, 'name') || 
                                    MetaphorJs.dom.getAttr(elem, 'id');
            self.data           = options.data;
            self.rules			= {};

            cfg.messages        = extend({}, messages, cfg.messages, true, true);

            MetaphorJs.dom.setAttr(elem, "data-validator", vldr.getVldId());

            if (self.input.radio) {
                self.initRadio();
            }

            if (cfg.rules) {
                self.setRules(cfg.rules, false);
            }

            self.readRules();

            self.prev 	= self.input.getValue();

            if (cfg.disabled) {
                self.disable();
            }
        },

        /**
         * @method
         * @returns {MetaphorJs.validator.Validator}
         */
        getValidator: function() {
            return this.vldr;
        },

        initRadio: function() {

            var self    = this,
                radios  = self.input.radio,
                vldId   = self.vldr.getVldId(),
                i,l;

            for(i = 0, l = radios.length; i < l; i++) {
                MetaphorJs.dom.setAttr(radios[i], "data-validator", vldId);
            }
        },

        /**
         * Set/add field rules
         * @method
         * @param {object} list {
         *  name: value set of rules. See 
         *  <code>MetaphorJs.validator.Field.defaults.rules</code> 
         * }
         * @param {boolean} check {
         *  Re-check field's validity
         *  @default false
         * }
         */
        setRules: function(list, check) {

            var self    = this;

            check = check == undf ? true : check;

            for (var i in list) {
                self.setRule(i, list[i], false);
            }

            if (check) {
                self.check(false);
            }
            else {
                self.setValidState(null);
            }

            return self;
        },

        /**
         * Set/add field rule
         * @method
         * @param {string} rule Validator name
         * @param {*|function} value
         * @param {boolean} check {
         *  Re-check field's validity
         *  @default false
         * }
         */
        setRule: function(rule, value, check) {

            var self    = this,
                rules   = self.rules;

            check = check == undf ? true : check;

            if (value === null) {
                if (rules[rule]) {
                    self.rulesNum--;
                }
                delete rules[rule];
            }
            else {
                if (!rules[rule]) {
                    self.rulesNum++;
                }
                rules[rule] = value;
                if (self.valid !== null) {
                    self.setValidState(false);
                }
            }

            if (check) {
                self.check(false);
            }
            else {
                self.setValidState(null);
            }

            return self;
        },

        /**
         * Set rule message
         * @method
         * @param {string} rule
         * @param {string} message
         */
        setMessage: function(rule, message) {
            this.cfg.messages[rule] = message;
            return this;
        },

        /**
         * Set rule messages
         * @method
         * @param {object} messages {
         *  rule: message 
         * }
         */
        setMessages: function(messages) {

            var self = this;

            for (var i in messages) {
                self.setMessage(i, messages[i]);
            }
            return self;
        },

        /**
         * Get rule messages
         * @method 
         * @returns {object}
         */
        getMessages: function() {
            return extend({}, this.cfg.messages);
        },

        /**
         * @ignore
         * Read rules from attributes and classes
         * (this happens on init)
         */
        readRules: function() {

            var self        = this,
                elem        = self.elem,
                cls 		= elem.className,
                found		= {},
                val, i, name, len;

            for (i in methods) {

                if (methods.hasOwnProperty(i)) {

                    val = MetaphorJs.dom.getAttr(elem, i) || 
                            MetaphorJs.dom.getAttr(elem, "data-validate-" + i);

                    if (val == undf || val === false) {
                        continue;
                    }
                    if ((i === 'minlength' || i === 'maxlength') && 
                        (val = parseInt(val, 10)) === -1) {
                        continue;
                    }

                    found[i] = val;

                    val = MetaphorJs.dom.getAttr(elem, "data-message-" + i);
                    val && self.setMessage(i, val);
                }
            }

            if ((val = MetaphorJs.dom.getAttr(elem, 'remote'))) {
                found['remote'] = val;
            }

            if (cls) {
                cls = cls.split(" ");
                for (i = 0, len = cls.length; i < len; i++) {

                    name = cls[i].trim();

                    if (methods[name] || name === 'remote') {
                        found[name] = true;
                    }
                }
            }

            for (i in found) {
                self.setRule(i, found[i], false);
            }
        },

        setConfigRules: function(config) {
            var self    = this,
                elem    = self.elem,
                val, i;

            this.$self.deepInitConfig(config);

            for (i in methods) {

                if (methods.hasOwnProperty(i)) {

                    val = config.get(i);

                    if (val == undf || val === false) {
                        continue;
                    }
                    if ((i === 'minlength' || i === 'maxlength') && 
                        (val = parseInt(val, 10)) === -1) {
                        continue;
                    }

                    self.setRule(i, val, false);

                    val = (config ? config.get(i + ".msg") : null) ||
                            MetaphorJs.dom.getAttr(elem, "data-message-" + i);
                    val && self.setMessage(i, val);
                }
            }
        },

        /**
         * Get field rules
         * @method
         * @returns {object}
         */
        getRules: function() {
            return this.rules;
        },

        /**
         * @method
         * @param {string} name
         * @return {boolean}
         */
        hasRule: function(name) {
            return this.rules[name] ? true : false;
        },

        /**
         * Get field value
         * @method
         * @returns {string}
         */
        getValue: function() {
            return this.input.getValue();
        },

        /**
         * Get user data
         * @method
         * @returns {*}
         */
        getUserData: function() {
            return this.data;
        },

        /**
         * Set user data
         * @method
         * @param {*} data
         */
        setUserData: function(data) {
            var self    = this,
                old     = self.data;
            self.data = data;
            return old;
        },

        /**
         * Is the field currently empty
         * @method
         * @returns {boolean}
         */
        isEmpty: function() {
            var self = this;
            return empty(self.getValue(), self.elem);
        },

        /**
         * Enable field validation
         * @method
         */
        enable: function() {
            var self = this;
            self.enabled = true;
            self.vldr.reset();
            return self;
        },

        /**
         * Disable field validation
         * @method
         */
        disable: function() {
            var self = this;
            self.enabled = false;

            if (self.valid === false) {
                self.setValidState(true);
                self.doDisplayState();
            }
            return self;
        },

        /**
         * @method
         */
        enableDisplayState:	function() {
            this.displayState = true;
        },

        /**
         * @method
         */
        disableDisplayState:	function() {
            this.displayState = false;
        },

        /**
         * @method
         * @returns {boolean}
         */
        isDisplayStateEnabled: function() {
            return this.displayState;
        },

        /**
         * @method
         * @param {boolean} state 
         */
        toggleErrorBox: function(state) {

            var self    = this,
                cfg     = self.cfg,
                prev    = cfg.errorBox.enabled;

            cfg.errorBox.enabled = state;

            if (!prev && state && state.displayState && self.valid() === false) {
                self.doDisplayState();
            }
        },

        /**
         * @method
         * @returns {boolean}
         */
        isEnabled: function() {
            return this.enabled;
        },

        /**
         * Get field's dom node
         * @method
         * @returns {HTMLElement}
         */
        getElem: function() {
            return this.elem;
        },

        /**
         * @method
         * @returns {string}
         */
        getName: function() {
            return this.id;
        },

        /**
         * Get current error
         * @method
         * @returns {string|null}
         */
        getError: function() {
            return this.error;
        },

        /**
         * Get the name of last validator that invalidated the field
         * @method
         * @returns {string|null}
         */
        getErrorRule: function() {
            return this.errorRule;
        },

        /**
         * @method
         * @returns {boolean}
         */
        isValid: function() {

            var self = this;

            if (!self.isEnabled()) {
                return true;
            }
            if (self.customError) {
                return false;
            }

            return (self.valid === true && !self.pending) || 
                    self.rulesNum === 0;
        },

        getExactValidState: function() {
            return this.valid;
        },

        /**
         * Set custom error
         * @method
         * @param {string} error 
         * @param {string} rule 
         */
        setCustomError:	function(error, rule) {
            var self = this;
            self.customError = error ? true : false;
            self.setValidState(error ? false : true);
            self.setError(error === true ? null : error, rule);
            self.doDisplayState();
        },

        /**
         * Reset field to untouched state
         * @method
         */
        reset: function() {

            var self = this;

            self.abort();
            self.dirty 	= false;
            self.prev 	= '';

            self.setValidState(null);
            self.setError(null);
            self.doDisplayState();

            return self;
        },

        /**
         * Abort ajax check
         * @method
         */
        abort: function() {
            var self = this;
            if (self.pending) {
                self.pending.abort();
                self.pending = null;
            }
            return self;
        },

        /**
         * Check if field is valid
         * @method
         * @param {boolean} force Check even if field's value haven't changed
         * @returns {boolean}
         */
        check: function(force) {

            var self = this,
                rules = self.rules,
                cfg = self.cfg,
                elem = self.elem;

            // disabled field validator always returns true
            if (!self.isEnabled()) {
                return true;
            }

            if (self.customError) {
                return false;
            }

            // if there are no rules, we return true
            if (self.rulesNum == 0 && self.valid !== false) {
                return true;
            }

            if (self.checking) {
                if (!self.checkTmt) {
                    self.checkTmt	= setTimeout(bind(self.checkTimeout, self), 100);
                }
                return self.valid === true;
            }

            self.checking = true;

            // nothing changed since last check
            // we need to find a way to indicate that (if) this field depends on others
            // and state.dirty doesn't really work in this case
            if (force !== true &&
                !rules.equalTo && !rules.notEqualTo &&
                !self.dirty && self.valid !== null &&
                !cfg.alwaysCheck) {

                if (!self.pending) {
                    self.doDisplayState();
                }

                self.checking = false;
                return self.valid === true;
            }

            var valid 			= true,
                remote 			= false,
                val				= self.getValue(),
                msg;

            for (var i in rules) {

                // we always call remote check after all others
                if (i === 'remote') {
                    if (self.dirty || cfg.alwaysCheck || 
                        self.valid === null || force === true) {
                        if (val || rules[i].checkEmpty) {
                            remote = true;
                        }
                    }
                    continue;
                }

                var fn = isFunction(rules[i]) ? rules[i] : methods[i];

                if ((msg = fn.call(self.$$callbackContext, val, elem, rules[i], self)) !== true) {
                    valid = false;
                    self.setError(format(msg || cfg.messages[i] || "", rules[i]), i);
                    break;
                }
            }

            remote	= remote && valid;

            if (valid) {
                self.setError(null);
            }

            if (!remote) {
                self.setValidState(valid);
                self.doDisplayState();
            }
            else {
                self.ajaxCheck();
            }

            self.dirty = false;
            self.checking = false;

            self.trigger("check", self, self.valid);

            return self.valid === true && !remote;
        },

        doDisplayState: function() {

            var self        = this,
                cfg         = self.cfg,
                valid 		= self.isValid(),
                errorCls	= cfg.cls.error,
                validCls	= cfg.cls.valid,
                elem        = self.elem;

            if (!self.displayState && !cfg.alwaysDisplayState) {
                valid	= null;
            }

            if (self.valid === null) {
                valid 	= null;
            }

            if (errorCls) {
                valid === false ? MetaphorJs.dom.addClass(elem, errorCls) : 
                                    MetaphorJs.dom.removeClass(elem, errorCls);
            }
            if (validCls) {
                valid === true ? MetaphorJs.dom.addClass(elem, validCls) : 
                                    MetaphorJs.dom.removeClass(elem, validCls);
            }

            var box 	= self.getErrorBox(),
                error 	= self.error;

            if (box) {
                if (valid === false && error) {
                    box.innerHTML = state.error;
                }
                box.style.display = valid !== false || !error || !cfg.errorBox.enabled ? 'none' : 'block';
            }

            self.trigger('display-state', self, valid, self.error);
        },

        /**
         * @method
         * @returns {HTMLElement}
         */
        getErrorBox: function() {

            var self        = this,
                cfg         = self.cfg,
                eb			= cfg.errorBox;

            if (eb.tag || eb.fn || eb.selector) {
                if (!self.errorBox && eb.enabled) {
                    self.createErrorBox();
                }
                return self.errorBox;
            }
            else {
                return null;
            }
        },


        onDestroy: function() {

            var self = this;

            MetaphorJs.dom.removeAttr(self.elem, "data-validator");

            if (self.errorBox) {
                self.errorBox.parentNode.removeChild(self.errorBox);
            }

            self.input.$destroy();
        },


        /**
         * Is this field still running remote check
         * @method
         * @returns {boolean}
         */
        isPending: function() {
            return this.pending !== null;
        },

        setValidState: function(valid) {

            var self = this;

            if (self.valid !== valid) {
                self.valid = valid;
                self.trigger('state-change', self, valid);
            }
        },


        setError:		function(error, rule) {

            var self = this;

            if (self.error != error || self.errorRule != rule) {
                self.error = error;
                self.errorRule = rule;
                self.trigger('error-change', self, error, rule);
            }
        },


        checkTimeout: function() {

            var self = this;

            self.checkTmt = null;
            if (self.checking) {
                return;
            }
            self.check(false);
        },

        onInputChange: function(val) {

            var self    = this,
                prev    = self.prev;

            if (prev !== val) {
                self.dirty = true;
                self.customError = false;
                self.abort();
                if (!self.pending) {
                    self.check(false);
                }

                self.prev = self.input.getValue();
            }
        },

        onInputSubmit: function(e) {

            e = MetaphorJs.dom.normalizeEvent(e);

            if (!e.isDefaultPrevented || !e.isDefaultPrevented()) {
                var res = this.trigger("submit", this, e);
                if (res === false) {
                    e.preventDefault();
                    return false;
                }
            }
        },

        createErrorBox: function() {

            var self    = this,
                cfg     = self.cfg,
                eb		= cfg.errorBox,
                tag 	= eb.tag,
                cls		= eb.cls,
                fn		= eb.fn,
                pos		= eb.position,
                dom		= eb.elem;

            if (fn) {
                self.errorBox = fn.call(self.$$callbackContext, self);
            }
            else if(dom) {
                self.errorBox = dom;
            }
            else {
                self.errorBox = window.document.createElement(tag);
                self.errorBox.className = cls;

                var r = self.input.radio,
                    f = r ?
                        r[r - 1] :
                        self.elem;

                if (pos == 'appendParent') {
                    f.parentNode.appendChild(self.errorBox);
                }
                else if (pos == "before") {
                    f.parentNode.insertBefore(self.errorBox, f);
                }
                else {
                    f.parentNode.insertBefore(self.errorBox, f.nextSibling);
                }
            }
        },

        ajaxCheck: function() {

            var self    = this,
                rules   = self.rules,
                elem    = self.elem,
                rm		= rules['remote'],
                val 	= self.getValue(),
                cfg     = self.cfg;

            var acfg 	= extend({}, isString(rm) ? {url: rm} : rm, true);

            //ajax.success 	= self.onAjaxSuccess;
            //ajax.error 		= self.onAjaxError;
            acfg.data 		= acfg.data || {};
            acfg.data[acfg.paramName || MetaphorJs.dom.getAttr(elem, 'name') || 
                                        MetaphorJs.dom.getAttr(elem, 'id')] = val;

            if (!acfg.handler) {
                acfg.dataType 	= 'text';
            }

            acfg.cache 		= false;

            if (cfg.cls.ajax) {
                MetaphorJs.dom.addClass(elem, cfg.cls.ajax);
            }

            self.trigger('before-ajax', self, acfg);

            self.pending = ajax(acfg);

            self.pending.done(bind(self.onAjaxSuccess, self));
            self.pending.fail(bind(self.onAjaxError, self));
        },

        onAjaxSuccess: function(data) {

            var self    = this,
                rules   = self.rules,
                cfg     = self.cfg;

            self.pending 	= null;
            var valid 		= true;

            if (rules['remote'].handler) {

                var res = rules['remote'].handler.call(self.$$callbackContext, self, data);

                if (res !== true) {
                    self.setError(format(res || cfg.messages['remote'] || "", rules['remote']), 'remote');
                    valid 		= false;
                }
            }
            else {
                if (data) {
                    self.setError(data, 'remote');
                    valid 		= false;
                }
                else {
                    self.setError(null);
                }
            }

            if (cfg.cls.ajax) {
                MetaphorJs.dom.removeClass(self.elem, cfg.cls.ajax);
            }

            self.setValidState(valid);
            self.doDisplayState();
            self.trigger('after-ajax', self);
        },

        onAjaxError: function(xhr, status) {

            var self        = this,
                cfg         = self.cfg,
                response    = xhr.responseData,
                rules       = self.rules;

            if (response && rules['remote'].handler) {

                var res = rules['remote'].handler.call(self.$$callbackContext, self, response);

                if (res !== true) {
                    self.setError(format(res || cfg.messages['remote'] || "", rules['remote']), 'remote');
                }
            }

            if (cfg.cls.ajax) {
                MetaphorJs.dom.removeClass(self.elem, cfg.cls.ajax);
            }

            self.pending = null;

            if (status != 'abort' && xhr != "abort") {
                self.setValidState(false);
                self.doDisplayState();
                self.trigger('after-ajax', self);
            }
        }
    }, {

        defaults: {},
        messages: {},

        deepInitConfig: function(config) {
            var ms = MetaphorJs.lib.Config.MODE_STATIC;
            for (var i in methods) {
                if (methods.hasOwnProperty(i)) {
                    if (config.hasProperty(i)) {
                        config.setDefaultMode(i, ms);
                        config.setDefaultMode(i+".msg", ms);
                    }
                }
            }
        }

    });


}());