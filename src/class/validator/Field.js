
var defineClass     = require("metaphorjs-class/src/func/defineClass.js"),
    getValue        = require("metaphorjs-input/src/func/getValue.js"),
    extend          = require("metaphorjs/src/func/extend.js"),
    trim            = require("metaphorjs/src/func/trim.js"),
    bind            = require("metaphorjs/src/func/bind.js"),
    addClass        = require("metaphorjs/src/func/dom/addClass.js"),
    removeClass     = require("metaphorjs/src/func/dom/removeClass.js"),
    normalizeEvent  = require("metaphorjs/src/func/event/normalizeEvent.js"),
    Input           = require("metaphorjs-input/src/lib/Input.js"),
    isFunction      = require("metaphorjs/src/func/isFunction.js"),
    isString        = require("metaphorjs/src/func/isString.js"),
    isBool          = require("metaphorjs/src/func/isBool.js"),
    ajax            = require("metaphorjs-ajax/src/func/ajax.js"),
    undf            = require("metaphorjs/src/var/undf.js"),
    getAttr         = require("metaphorjs/src/func/dom/getAttr.js"),
    setAttr         = require("metaphorjs/src/func/dom/setAttr.js"),
    removeAttr      = require("metaphorjs/src/func/dom/removeAttr.js");


require("../../var/messages.js");
require("../../var/methods.js");
require("../../func/empty.js");
require("../../func/format.js");
require("metaphorjs-observable/src/mixin/Observable.js");

module.exports = (function(){

    /* ***************************** FIELD ****************************************** */


    var defaults = /*field-options-start*/{

        allowSubmit:		true,			// call form.submit() on field's ENTER keyup
        alwaysCheck:		false,			// run tests even the field is proven valid and hasn't changed since last check
        alwaysDisplayState:	false,
        data:				null,
        ignore:				null,			// put ignore:true to field config to ignore the field completely
        disabled:			false,			// make validator disabled for this field initially

        cls: {
            valid: 			'',				// css class for a valid form
            error:			'',				// css class for a not valid form
            ajax:			''				// css class for a form while it is being checked with ajax request
        },

        // if string is provided, considered errorBox: {tag: '...'}
        errorBox: {
            cls: 			'',				// add this class to the automatically created element
            fn:				null, 			// must return dom node (cancels auto creation), receives api as the only param
            tag:			'',				// create element automatically
            position:		'after',		// place it before|after the form element
            elem:			null,			// jquery or dom object or selector (already existing object)
            enabled:		true			// can be disabled later (toggleErrorBox())
        },

        // callbacks are case insensitive
        // you can use camel case if you like.
        callback: {

            scope:			null,

            destroy:		null,			// called when field's validator is being destroyed. fn(api)
            statechange:	null,			// when field's state has been changed. fn(api, (boolean) state)
            errorchange:	null,			// fn(api, error)
            submit:			null,			// when enter key was pressed. fn(api, event). return false to prevent submitting even
            // if the form is valid
            check:          null,           // called after each check (may not be relevant, if there is a ajax check) fn(api, valid)
            beforeAjax:		null,			// when ajax check is about to be executed. fn(api, requestData)
            afterAjax:		null,			// when ajax check ended. fn(api)

            displaystate:	null			// use this to display custom field state: fn(api, valid, error)
        },

        rules: 				{},				// {name: value}
        // {name: fn(fieldValue, dom, ruleValue, api)}
        // fn must return error message, false or true.
        messages: 			{}
    }/*field-options-end*/;


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


    var messages = ns.get("validator.messages"),
        methods = ns.get("validator.methods"),
        empty = ns.get("validator.empty"),
        format = ns.get("validator.format");




    var Field = defineClass({
        $class: "validator.Field",
        $mixins: ["mixin.Observable"],

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

        $init: function(elem, options, vldr) {
            options             = options || {};

            var self            = this,
                cfg;

            self.cfg            = cfg = extend({}, defaults,
                fixFieldShorthands(Field.defaults),
                fixFieldShorthands(options),
                true, true
            );

            self.input          = Input.get(elem);
            self.input.onChange(self.onInputChange, self);
            self.input.onKey(13, self.onInputSubmit, self);

            self.elem           = elem;
            self.vldr           = vldr;
            self.enabled        = !elem.disabled;
            self.id             = getAttr(elem, 'name') || getAttr(elem, 'id');
            self.data           = options.data;
            self.rules			= {};

            cfg.messages        = extend({}, messages, cfg.messages, true, true);

            setAttr(elem, "data-validator", vldr.getVldId());

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

        getValidator: function() {
            return this.vldr;
        },

        initRadio: function() {

            var self    = this,
                radios  = self.input.radio,
                vldId   = self.vldr.getVldId(),
                i,l;

            for(i = 0, l = radios.length; i < l; i++) {
                setAttr(radios[i], "data-validator", vldId);
            }
        },

        /**
         * Set/add field rules
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
         */
        setMessage: function(rule, message) {
            this.cfg.messages[rule] = message;
            return this;
        },

        /**
         * Set rule messages
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
         */
        getMessages: function() {
            return extend({}, this.cfg.messages);
        },

        /**
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

                    val = getAttr(elem, i) || getAttr(elem, "data-validate-" + i);

                    if (val == undf || val === false) {
                        continue;
                    }
                    if ((i == 'minlength' || i == 'maxlength') && parseInt(val, 10) == -1) {
                        continue;
                    }

                    found[i] = val;

                    val = getAttr(elem, "data-message-" + i);
                    val && self.setMessage(i, val);
                }
            }

            if ((val = getAttr(elem, 'remote'))) {
                found['remote'] = val;
            }

            if (cls) {
                cls = cls.split(" ");
                for (i = 0, len = cls.length; i < len; i++) {

                    name = trim(cls[i]);

                    if (methods[name] || name == 'remote') {
                        found[name] = true;
                    }
                }
            }

            for (i in found) {
                self.setRule(i, found[i], false);
            }
        },

        /**
         * Get field rules
         */
        getRules: function() {
            return this.rules;
        },

        /**
         * @return boolean
         */
        hasRule: function(name) {
            return this.rules[name] ? true : false;
        },

        /**
         * Get field value
         */
        getValue: function() {
            return this.input.getValue();
        },

        /**
         * Get user data
         */
        getUserData: function() {
            return this.data;
        },


        /**
         * Set user data
         */
        setUserData: function(data) {
            var self    = this,
                old     = self.data;
            self.data = data;
            return old;
        },

        /**
         * @returns boolean
         */
        isEmpty: function() {
            var self = this;
            return empty(self.getValue(), self.elem);
        },

        /**
         * Enable field validation
         */
        enable: function() {
            var self = this;
            self.enabled = true;
            self.vldr.reset();
            return self;
        },

        /**
         * Disable field validation
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

        enableDisplayState:	function() {
            this.displayState = true;
        },

        disableDisplayState:	function() {
            this.displayState = false;
        },

        isDisplayStateEnabled: function() {
            return this.displayState;
        },


        toggleErrorBox: function(state) {

            var self    = this,
                cfg     = self.cfg,
                prev    = cfg.errorBox.enabled;

            cfg.errorBox.enabled = state;

            if (!prev && state && state.displayState && self.valid() === false) {
                self.doDisplayState();
            }
        },

        isEnabled: function() {
            return this.enabled;
        },

        getElem: function() {
            return this.elem;
        },

        getName: function() {
            return this.id;
        },

        getError: function() {
            return this.error;
        },

        getErrorRule: function() {
            return this.errorRule;
        },

        isValid: function() {

            var self = this;

            if (!self.isEnabled()) {
                return true;
            }
            if (self.customError) {
                return false;
            }

            return (self.valid === true && !self.pending) || self.rulesNum === 0;
        },

        getExactValidState: function() {
            return this.valid;
        },

        setCustomError:	function(error, rule) {
            var self = this;
            self.customError = error ? true : false;
            self.setValidState(error ? false : true);
            self.setError(error === true ? null : error, rule);
            self.doDisplayState();
        },

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
         */
        abort: function() {
            var self = this;
            if (self.pending) {
                self.pending.abort();
                self.pending = null;
            }
            return self;
        },

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
                if (i == 'remote') {
                    if (self.dirty || cfg.alwaysCheck || self.valid === null || force === true) {
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
                valid === false ? addClass(elem, errorCls) : removeClass(elem, errorCls);
            }
            if (validCls) {
                valid === true ? addClass(elem, validCls) : removeClass(elem, validCls);
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
         * @returns jQuery
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


        destroy: function() {

            var self = this;

            removeAttr(self.elem, "data-validator");

            if (self.errorBox) {
                self.errorBox.parentNode.removeChild(self.errorBox);
            }

            self.input.destroy();
        },


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

            e = normalizeEvent(e);

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
            acfg.data[acfg.paramName || getAttr(elem, 'name') || getAttr(elem, 'id')] = val;

            if (!acfg.handler) {
                acfg.dataType 	= 'text';
            }

            acfg.cache 		= false;

            if (cfg.cls.ajax) {
                addClass(elem, cfg.cls.ajax);
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
                removeClass(self.elem, cfg.cls.ajax);
            }

            self.setValidState(valid);
            self.doDisplayState();
            self.trigger('after-ajax', self);
        },

        onAjaxError: function(xhr, status) {

            var self    = this,
                cfg     = self.cfg;

            if (cfg.cls.ajax) {
                removeClass(self.elem, cfg.cls.ajax);
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
        messages: {}

    });


    return Field;

}());