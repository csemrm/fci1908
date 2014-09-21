function __processArg(obj, key) {
    var arg = null;
    if (obj) {
        arg = obj[key] || null;
        delete obj[key];
    }
    return arg;
}

function Controller() {
    function info(message) {
        if (!Alloy.Globals.LOG_ENABLED) return;
        "" !== message && null != message && Ti.API.info(message);
    }
    function warning(message) {
        if (!Alloy.Globals.LOG_ENABLED) return;
        "" !== message && null != message && Ti.API.warn(message);
    }
    function error(message) {
        if (!Alloy.Globals.LOG_ENABLED) return;
        "" !== message && null != message && Ti.API.error(message);
    }
    function clipboardAndAlert(text) {
        Ti.UI.Clipboard.clearText();
        Ti.UI.Clipboard.setText(text.toString());
        Ti.UI.createAlertDialog({
            message: "Il valore è stato copiato negli appunti",
            buttonNames: [ "OK" ]
        }).show();
    }
    function json(any) {
        info(JSON.stringify(any));
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "business/LogManager";
    if (arguments[0]) {
        __processArg(arguments[0], "__parentSymbol");
        __processArg(arguments[0], "$model");
        __processArg(arguments[0], "__itemTemplate");
    }
    var $ = this;
    var exports = {};
    exports.destroy = function() {};
    _.extend($, $.__views);
    this.info = info;
    this.warning = warning;
    this.error = error;
    this.json = json;
    this.clipboardAndAlert = clipboardAndAlert;
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;