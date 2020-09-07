
require("../__init.js");
require("../func/empty.js");
require("../func/getLength.js");
require("metaphorjs/src/func/dom/getInputValue.js");
require("metaphorjs-shared/src/var/regexp/url.js");
require("metaphorjs-shared/src/var/regexp/email.js");

const MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
    isString        = require("metaphorjs-shared/src/func/isString.js");

module.exports = (function(){

    var empty = MetaphorJs.validator.empty,
        getLength = MetaphorJs.validator.getLength;

    // from http://bassistance.de/jquery-plugins/jquery-plugin-validation/
    // i've changed most of the functions, but the result is the same.
    // this === field's api.

    return MetaphorJs.validator.methods = {

        /**
         * Checks that field value is not empty
         * @validator required
         * @param {boolean} param 
         */
        required: function(value, element, param) {
            if (param === false) {
                return true;
            }
            return !empty(value, element);
        },

        /**
         * Test field's value using this regular expression. 
         * Empty value passes as success.
         * @validator regexp
         * @param {string|Regexp} param 
         */
        regexp: function(value, element, param) {
            var reg = param instanceof RegExp ? param : new RegExp(param);
            return empty(value, element) || reg.test(value);
        },

        /**
         * Same as validator.regexp but with the opposite result.
         * Empty value passes as success.
         * @validator notregexp
         * @param {string|Regexp} param 
         */
        notregexp: function(value, element, param) {
            var reg = param instanceof RegExp ? param : new RegExp(param);
            return empty(value, element) || !reg.test(value);
        },

        /**
         * Check if field's value length more than param. 
         * Empty value passes as success.
         * @validator minlength
         * @param {string|int} param 
         */
        minlength: function(value, element, param) {
            return empty(value, element) ||
                   (
                       element ?
                       getLength(value.trim(), element) >= param :
                       value.toString().length >= param
                   );
        },

        /**
         * Check if field's value length less than param.
         * Empty value passes as success.
         * @validator maxlength
         * @param {string|int} param 
         */
        maxlength: function(value, element, param) {
            return empty(value, element) ||
                   (
                       element ?
                       getLength(value.trim(), element) <= param:
                       value.toString().length <= param
                   );
        },

        /**
         * Check if field's value length between given range.
         * Empty value passes as success.
         * @validator rangelength
         * @param {array} param [min, max]
         */
        rangelength: function(value, element, param) {
            var length = element ? getLength(value.trim(), element) : value.toString().length;
            return empty(value, element) || ( length >= param[0] && length <= param[1] );
        },

        /**
         * Check if field's value is greater than given number.
         * Empty value passes as success.
         * @validator min
         * @param {int} param 
         */
        min: function(value, element, param) {
            return empty(value, element) || parseInt(value, 10) >= param;
        },

        /**
         * Check if field's value is lesser than given number.
         * Empty value passes as success.
         * @validator max
         * @param {int} param 
         */
        max: function(value, element, param) {
            return empty(value, element) || parseInt(value, 10) <= param;
        },

        /**
         * Check if field's value is between given range.
         * Empty value passes as success.
         * @validator range
         * @param {array} param [min, max]
         */
        range: function(value, element, param) {
            value = parseInt(value, 10);
            return empty(value, element) || ( value >= param[0] && value <= param[1] );
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/email
        /**
         * Check is field's value matches email regexp. 
         * Empty value passes as success.
         * @validator email
         */
        email: function(value, element) {
            // contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
            return empty(value, element) || MetaphorJs.regexp.email.test(value);
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/url
        /**
         * Check is field's value matches url regexp. 
         * Empty value passes as success.
         * @validator email
         */
        url: function(value, element) {
            // contributed by Scott Gonzalez: http://projects.scottsplayground.com/iri/
            return empty(value, element) || MetaphorJs.regexp.url.test(value);
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/date
        /**
         * Check if field's value can be parsed as a date.
         * Empty value passes as success.
         * @validator date
         */
        date: function(value, element) {
            return empty(value, element) || !/Invalid|NaN/.test(new Date(value));
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/dateISO
        /**
         * Check if field's value can be parsed as a yyyy-mm-dd date.
         * Empty value passes as success.
         * @validator dateiso
         */
        dateiso: function(value, element) {
            return empty(value, element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(value);
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/number
        /**
         * Check if field's value is a number. Empty value passes as success.
         * @validator number
         */
        number: function(value, element) {
            return empty(value, element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/digits
        /**
         * Check if field's value only consists of digits. Empty value passes as success.
         * @validator digits
         */
        digits: function(value, element) {
            return empty(value, element) || /^\d+$/.test(value);
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/creditcard
        // based on http://en.wikipedia.org/wiki/Luhn
        /**
         * Check if field's value passes for credit card number. Empty value passes as success.
         * @validator creditcard
         */
        creditcard: function(value, element) {

            if (empty(value, element)) {
                return true; 
            }

            // accept only digits and dashes
            if (/[^0-9-]+/.test(value)) {
                return false;
            }

            var nCheck 	= 0,
                bEven 	= false,
                nDigit,
                cDigit;

            value = value.replace(/\D/g, "");

            for (var n = value.length - 1; n >= 0; n--) {

                cDigit = value.charAt(n);
                nDigit = parseInt(cDigit, 10);

                if (bEven) {
                    if ((nDigit *= 2) > 9) {
                        nDigit -= 9;
                    }
                }

                nCheck 	+= nDigit;
                bEven 	= !bEven;
            }

            return (nCheck % 10) == 0;
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/accept
        /**
         * Makes a file upload accept only specified mime-types. 
         * Empty value passes as success.
         * @param {string} param mime type string
         */
        accept: function(value, element, param) {
            param = isString(param) ? param.replace(/,/g, '|') : "png|jpe?g|gif";
            return empty(value, element) || value.match(new RegExp(".(" + param + ")$", "i"));
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/equalTo
        /**
         * Check if field's value equals to another field's value
         * @validator equalto
         * @param {*} param Another field's name or id
         */
        equalto: function(value, element, param, api) {
            // bind to the blur event of the target in order to revalidate 
            // whenever the target field is updated

            var f       = api.getValidator().getField(param),
                target  = f ? f.getElem() : param;

            return value == MetaphorJs.dom.getInputValue(target);
        },

        /**
         * Check if field's value does not equal another field's value
         * @validator notequalto
         * @param {*} param Another field's name or id
         */
        notequalto: function(value, element, param, api) {

            var f       = api.getValidator().getField(param),
                target  = f ? f.getElem() : param;

            return value != MetaphorJs.dom.getInputValue(target);
        },

        // this is handled separately, but should be here
        // so that validator knew that remote method exists
        remote: function() {
            return false;
        },

        /**
         * Password strength estimator. Expects zxcvbn() 
         * func to be available globally. 
         * @param {*} param 
         */
        zxcvbn: function(value, element, param) {
            return zxcvbn(value).score >= parseInt(param);
        }
    };


}());