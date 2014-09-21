function __processArg(obj, key) {
    var arg = null;
    if (obj) {
        arg = obj[key] || null;
        delete obj[key];
    }
    return arg;
}

function Controller() {
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "LoadingPopup";
    if (arguments[0]) {
        __processArg(arguments[0], "__parentSymbol");
        __processArg(arguments[0], "$model");
        __processArg(arguments[0], "__itemTemplate");
    }
    var $ = this;
    var exports = {};
    $.__views.loadingPopup = Ti.UI.createView({
        backgroundColor: "transparent",
        id: "loadingPopup"
    });
    $.__views.loadingPopup && $.addTopLevelView($.__views.loadingPopup);
    $.__views.background = Ti.UI.createView({
        backgroundColor: "#000",
        opacity: .6,
        id: "background"
    });
    $.__views.loadingPopup.add($.__views.background);
    $.__views.loading = Alloy.createWidget("com.appcelerator.loading", "widget", {
        top: 200,
        id: "loading",
        __parentSymbol: $.__views.loadingPopup
    });
    $.__views.loading.setParent($.__views.loadingPopup);
    $.__views.title = Ti.UI.createLabel({
        color: "#fff",
        font: Alloy.Globals.Fonts.helveticaNeueBold16,
        text: "Loading ...",
        id: "title"
    });
    $.__views.loadingPopup.add($.__views.title);
    exports.destroy = function() {};
    _.extend($, $.__views);
    var args = arguments[0] || {};
    var that = this;
    $.title.myParent = args.parent;
    this.closed = true;
    this.minTime = false;
    this.close = function() {
        that.minTime && $.title.myParent.remove($.loadingPopup);
        that.closed = true;
    };
    this.open = function(title) {
        $.title.text = title;
        that.closed = false;
        that.minTime = false;
        $.title.myParent.add($.loadingPopup);
        setTimeout(function() {
            that.minTime = true;
            that.closed && $.title.myParent.remove($.loadingPopup);
        }, 500);
    };
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;