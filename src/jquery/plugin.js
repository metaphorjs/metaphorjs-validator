
if (window.jQuery) {

    jQuery.fn.metaphorjsValidator = function(options, instanceName) {

        var dataName    = "metaphorjsValidator",
            preset;

        if (typeof options == "string" && options != "destroy") {
            preset          = options;
            options         = arguments[1];
            instanceName    = arguments[2];
        }

        instanceName    = instanceName || "default";
        options         = options || {};
        dataName        += "-" + instanceName;

        this.each(function() {

            var o = $(this),
                v = o.data(dataName);

            if (options == "destroy") {
                if (v) {
                    v.destroy();
                    o.data(dataName, null);
                }
            }
            else {
                if (!v) {
                    options.form            = o;
                    options.instanceName    = instanceName;
                    o.data(dataName, new Validator(preset, options));
                }
                else {
                    throw new Error("MetaphorJs validator is already instantiated for this html element");
                }
            }
        });
    };
}