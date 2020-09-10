
const cls             = require("metaphorjs-class/src/cls.js"),
    MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
    extend          = require("metaphorjs-shared/src/func/extend.js"),
    isFunction      = require("metaphorjs-shared/src/func/isFunction.js");

require("../__init.js");
require("metaphorjs/src/func/dom/addClass.js");
require("metaphorjs/src/func/dom/removeClass.js");
require("metaphorjs-observable/src/mixin/Observable.js");
require("../var/messages.js");
require("../var/methods.js");
require("../func/format.js");


module.exports = MetaphorJs.validator.Group = (function(){


/* ***************************** GROUP ****************************************** */


    /**
     * @object MetaphorJs.validator.Group.defaults
     */
    var defaults	= {

        /**
         * @property {boolean} alwaysCheck run tests even the group is proven 
         * valid and hasn't changed since last check
         */
        alwaysCheck:		false,

        /**
         * @property {boolean} alwaysDisplayState 
         */
        alwaysDisplayState:	false,

        /**
         * @property {boolean} disabled Make group disabled by default
         */
        disabled:			false,

        /**
         * @property {function} value { 
         *  @param {object} values Field values - name:value
         *  @param {MetaphorJs.validator.Group} g 
         *  @returns {*} group value
         * }
         */
        value:				null,

        /**
         * @property {HTMLElement} elem Group's dom node. 
         */
        elem:				null,			// dom node

        /**
         * @property {string|DomNode|function} errorBox {
         *  string: either field name/id or selector<br>
         *  function: fn(MetaphorJs.validator.Group)
         * }
         */
        errorBox:			null,			

        /**
         * @property {string} errorField field's name or id - where to display group's error
         */
        errorField:			null,

        /**
         * @property {*} data User data
         */
        data:				null,

        /**
         * @object cls
         */
        cls: {
            /**
             * @property {string} valid Css class for valid state
             */
            valid: 			'',
            /**
             * @property {string} error Css class for error state
             */
            error:			''

            /**
             * @end-object
             */
        },

        /**
         * @property {array} fields Array of field names/ids
         */
        fields:				[],

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
        rules:				{},

        /**
         * @property {object} messages {
         *  <code>rule: message</code>, error messages 
         * }
         */
        messages:			{},

        /**
         * @object callback
         */
        callback:		{
            /**
             * @property {object} state all callback's context
             */
            state:			null,

            /**
             * @property {function} * {
             *  eventName: function(f); See class's events
             *  @param {MetaphorJs.validator.Field} f
             * }
             */
            destroy:		null,
            statechange:	null,
            errorchange:	null,
            displaystate:	null

            /**
             * @end-object
             */
        }

        /**
         * @end-object
         */
    };


    var messages = MetaphorJs.validator.messages,
        methods = MetaphorJs.validator.methods,
        format = MetaphorJs.validator.format;


    /**
     * @class MetaphorJs.validator.Group
     * @mixes MetaphorJs.mixin.Observable
     */
    return cls({

        /**
         * @event error-change {
         *  @param {MetaphorJs.validator.Group} grp
         *  @param {string} error
         * }
         */
        /**
         * @event display-state {
         *  @param {MetaphorJs.validator.Group} grp
         *  @param {boolean} valid
         * }
         */
        /**
         * @event state-change {
         *  @param {MetaphorJs.validator.Group} grp
         *  @param {boolean} valid
         * }
         */
        /**
         * @event field-state-change {
         *  @param {MetaphorJs.validator.Group} grp
         *  @param {MetaphorJs.validator.Field} fld 
         *  @param {boolean} valid
         * }
         */

        $mixins: [MetaphorJs.mixin.Observable],

        fields:         null,
        rules:          null,
        cfg:            null,
        vldr:           null,
        enabled:		false,
        invalid:		null,
        valid:			null,
        displayState:	false,
        rulesNum:	    0,
        error:			null,
        data:			null,
        errorBox:		null,
        el:			    null,

        /**
         * @constructor
         * @method
         * @param {object} options See <code>MetaphorJs.validator.Group.defaults</code>
         * @param {MetaphorJs.validator.Validator} vldr 
         */
        $init: function(options, vldr) {

            options     = options || {};

            var self            = this,
                cfg;

            self._vldr          = vldr;

            self.cfg            = cfg = extend({},
                defaults,
                MetaphorJs.validator.Group.defaults,
                options,
                true, true
            );

            self.data           = options.data;
            self.el             = options.elem;
            self.fields         = {};
            self.rules		    = {};

            cfg.messages        = extend({}, messages, cfg.messages, true, true);

            var i, len;

            if (cfg.rules) {
                self.setRules(cfg.rules, false);
            }

            if (cfg.fields) {
                for (i = 0, len = options.fields.length; i < len; i++) {
                    self.add(vldr.getField(cfg.fields[i]));
                }
            }

            self.enabled = !cfg.disabled;
        },

        /**
         * Enable group (enabled by default)
         * @method
         */
        enable:		function() {
            this.enabled	= true;
            return this;
        },

        /**
         * Disable group
         * @method
         */
        disable:	function() {
            this.enabled	= false;
            return this;
        },

        /**
         * Is group enabled
         * @method
         * @return {boolean}
         */
        isEnabled:	function() {
            return this.enabled;
        },

        /**
         * Are all fields in this group valid
         * @method
         * @return {boolean}
         */
        isValid:		function() {
            var self = this;
            return !self.enabled || (self.invalid === 0 && self.valid === true);
        },

        /**
         * @method
         * @return {boolean|null}
         */
        getExactValidState: function() {
            return this.valid;
        },

        /**
         * Reset group
         * @method
         */
        reset:		function() {
            var self = this;
            self.invalid	= 0;
            self.setValidState(null);
            self.setError(null);
            self.doDisplayState();
            return self;
        },

        /**
         * Get user data specified in group config
         * @method
         * @returns {*}
         */
        getUserData: function() {
            return this.data;
        },

        /**
         * Get group name
         * @method
         * @returns {string}
         */
        getName: function() {
            return this.cfg.name;
        },

        /**
         * Set group's rules
         * @method
         * @param {object} list {rule: param}
         * @param {bool} check Re-check group
         */
        setRules: 	function(list, check) {

            var self = this;

            check = check == undefined ? true : check;

            for (var i in list) {
                self.setRule(i, list[i], false);
            }

            if (check) {
                self.check();
            }
            else {
                self.setValidState(null);
            }

            return self;
        },

        /**
         * Add group rule
         * @method
         * @param {string} rule
         * @param {*} value
         * @param {boolean} check Re-check group
         */
        setRule:	function(rule, value, check) {

            var self = this,
                rules = self.rules;

            check = check == undefined ? true : check;

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
                self.check();
            }
            else {
                self.setValidState(null);
            }

            return self;
        },

        /**
         * Get group rules
         * @method
         * @returns {name: value}
         */
        getRules:	function() {
            return extend({}, this.rules);
        },

        /**
         * @method
         * @param {string} name
         * @returns {boolean}
         */
        hasRule:	function(name) {
            return this.rules[name] ? true : false;
        },

        /**
         * Set group custom error
         * @method
         * @param {string} error
         */
        setError:	function(error) {

            var self = this,
                cfg = self.cfg;

            if (self.error != error) {

                if (cfg.errorField) {
                    self.vldr.getField(cfg.errorField).setError(error);
                    self.error = null;
                }
                else {
                    self.error = error;
                    self.trigger('error-change', self, error);
                }
            }
        },

        /**
         * Get current error
         * @method
         * @returns {string}
         */
        getError: function() {
            return this.error;
        },

        /**
         * @method 
         * @returns {object} 
         */
        getFields: function() {
            return this.fields;
        },

        /**
         * @method
         */
        enableDisplayState:		function() {
            this.displayState	= true;
            return this;
        },

        /**
         * @method
         */
        disableDisplayState:	function() {
            this.displayState	= false;
            return this;
        },

        /**
         * @method
         * @returns {boolean}
         */
        check: function() {

            var self    = this,
                cfg     = self.cfg,
                fields  = self.fields,
                rules   = self.rules;

            if (!self.enabled || self.rulesNum == 0) {
                self.setValidState(null);
                self.doDisplayState();
                return true;
            }

            self.countInvalid();

            if (self.invalid > 0) {
                self.setValidState(null);
                self.doDisplayState();
                return true;
            }

            var vals	= {},
                valid	= true,
                val		= null,
                msg,
                i;

            if (cfg.value) {

                for (i in fields) {
                    vals[i]	= fields[i].getValue();
                }

                val	= cfg.value.call(self.$$callbackContext, vals, self);
            }

            for (i in rules) {

                var fn = isFunction(rules[i]) ? rules[i] : methods[i];

                if ((msg = fn.call(self.$$callbackContext, val, null, rules[i], self, vals)) !== true) {

                    valid = false;

                    if (msg || cfg.messages[i]) {
                        self.setError(format(msg || cfg.messages[i] || "", rules[i]));
                    }
                    else {
                        self.setError(null);
                    }

                    break;
                }

            }

            if (valid) {
                self.setError(null);
            }

            self.setValidState(valid);
            self.doDisplayState();

            return self.valid === true;
        },

        doDisplayState:			function() {

            var self    = this,
                valid	= self.valid,
                cfg     = self.cfg;

            if (!self.displayState && !cfg.alwaysDisplayState) {
                valid	= null;
            }

            if (cfg.errorBox) {

                var ebox = self.getErrorBox();

                if (valid !== null) {

                    if (ebox) {
                        ebox.innerHTML = self.error || '';
                        ebox.style.display = self.valid === false ? 'block' : 'none';
                    }
                }
                else {
                    if (ebox) {
                        ebox.style.display = "none";
                    }
                }
            }

            var errorCls	= cfg.cls.error,
                validCls	= cfg.cls.valid;

            valid = self.valid;

            if (errorCls) {
                valid === false ? MetaphorJs.dom.addClass(self.el, errorCls) : 
                                    MetaphorJs.dom.removeClass(self.el, errorCls);
            }
            if (validCls) {
                valid === true ? MetaphorJs.dom.addClass(self.el, validCls) : 
                                    MetaphorJs.dom.removeClass(self.el, validCls);
            }

            self.trigger('display-state', self, self.valid);
        },

        /**
         * @method
         * @returns {HTMLElement}
         */
        getErrorBox: function() {

            var self    = this,
                cfg     = self.cfg,
                fields  = self.fields,
                eb	    = cfg.errorBox;

            if (fields[eb]) {
                return fields[eb].getErrorBox();
            }
            else if (!self.errorBox) {

                if (isFunction(cfg.errorBox)) {
                    self.errorBox	= cfg.errorBox.call(self.$$callbackContext, self);
                }
                else {
                    self.errorBox	= cfg.errorBox;
                }
            }

            return self.errorBox;
        },


        onDestroy:	function() {

            var self    = this,
                fields  = self.fields;

            for (var i in fields) {
                if (fields[i]) {
                    self.setFieldEvents(fields[i], 'un');
                }
            }

            if (self.errorBox) {
                self.errorBox.parentNode.removeChild(self.errorBox);
            }
        },

        /**
         * Add field to the group
         * @method
         * @param {MetaphorJs.validator.Field} field 
         */
        add:		function(field) {

            var self    = this,
                fields  = self.fields,
                id	    = field.getName();

            if (!fields[id]) {
                fields[id] 	= field;

                self.setFieldEvents(field, 'on');
            }
        },

        setFieldEvents:		function(f, mode) {
            var self = this;
            f[mode]('state-change', self.onFieldStateChange, self);
        },

        /**
         * Remove field from the group
         * @method
         * @param {MetaphorJs.validator.Field} field 
         */
        remove:		function(field) {

            var self    = this,
                fields  = self.fields,
                id	    = field.getName();

            if (fields[id]) {
                delete fields[id];
                self.setFieldEvents(field, 'un');
            }

            return self;
        },

        setValidState:			function(valid) {
            var self = this;
            if (self.valid !== valid) {
                self.valid = valid;
                self.trigger('state-change', self, valid);
            }
        },

        countInvalid:			function() {

            var self = this,
                fields = self.fields;

            self.invalid	= 0;
            for (var i in fields) {
                self.invalid += fields[i].isValid() ? 0 : 1;
            }
        },

        onFieldStateChange:		function(f, valid) {
            var self = this;
            self.trigger("field-state-change", self, f, valid);
            self.check();
        }
    }, {

        defaults: {}
    });

}());