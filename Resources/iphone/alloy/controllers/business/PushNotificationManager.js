function __processArg(obj, key) {
    var arg = null;
    if (obj) {
        arg = obj[key] || null;
        delete obj[key];
    }
    return arg;
}

function Controller() {
    function registerForPushNotification() {
        if (!Alloy.Globals.DEMO_MODE) if (Titanium.Network.online) {
            LogManager.info("Register to iOS Push Notification");
            iOsRegistration();
        } else errorCallback({
            error: "NETWORK_ERROR"
        });
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "business/PushNotificationManager";
    if (arguments[0]) {
        __processArg(arguments[0], "__parentSymbol");
        __processArg(arguments[0], "$model");
        __processArg(arguments[0], "__itemTemplate");
    }
    var $ = this;
    var exports = {};
    exports.destroy = function() {};
    _.extend($, $.__views);
    var LogManager = Alloy.createController("business/LogManager");
    var errorCallback = function(e) {
        LogManager.error(String.format("Error during push notification registration: %s", e.error));
        var message;
        if ("ACCOUNT_MISSING" == e.error) {
            message = "Nessun Google account trovato, configurarne uno per ricevere le notifiche push.";
            Titanium.UI.createAlertDialog({
                title: "Attenzione",
                message: message,
                buttonNames: [ "OK" ]
            }).show();
        }
    };
    var iOsRegistration = function() {
        Ti.Network.registerForPushNotifications({
            types: [ Ti.Network.NOTIFICATION_TYPE_BADGE, Ti.Network.NOTIFICATION_TYPE_ALERT, Ti.Network.NOTIFICATION_TYPE_SOUND ],
            success: function(e) {
                var deviceToken = e.deviceToken;
                LogManager.info("iOS Registration success with ID:" + e.deviceToken);
                var UserManager = Alloy.createController("business/UserManager");
                UserManager.registerDeviceToken(deviceToken);
            },
            error: errorCallback,
            callback: function(e) {
                Ti.UI.iPhone.appBadge = 0;
                LogManager.info("Message reveived: " + e.data.alert);
                Titanium.UI.createAlertDialog({
                    title: "Notifica",
                    message: e.data.alert,
                    buttonNames: [ "OK" ]
                }).show();
            }
        });
    };
    this.registerForPushNotification = registerForPushNotification;
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;