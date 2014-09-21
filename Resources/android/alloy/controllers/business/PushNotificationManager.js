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
            LogManager.info("Register to Android Push Notification");
            androidRegistration();
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
    var androidRegistration = function() {
        gcm = require("com.activate.gcm");
        try {
            gcm.registerC2dm({
                success: function(e) {
                    var deviceToken = e.registrationId;
                    LogManager.info(String.format("Push Notification registration success with ID: %s", e.registrationId));
                    var UserManager = Alloy.createController("business/UserManager");
                    UserManager.registerDeviceToken(deviceToken);
                },
                error: errorCallback,
                callback: function(e) {
                    LogManager.info(String.format("Push Message reveived: %s", e.data.message));
                    var intent = Ti.Android.createIntent({
                        action: Ti.Android.ACTION_MAIN,
                        flags: Ti.Android.FLAG_ACTIVITY_NEW_TASK | Ti.Android.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED,
                        className: "it.vettorerinascimento.vettoremobile.VettoreMobileActivity",
                        packageName: "it.vettorerinascimento.vettoremobile"
                    });
                    intent.addCategory(Titanium.Android.CATEGORY_LAUNCHER);
                    var pending = Ti.Android.createPendingIntent({
                        activity: Ti.Android.currentActivity,
                        intent: intent,
                        type: Ti.Android.PENDING_INTENT_FOR_ACTIVITY,
                        flags: Titanium.Android.FLAG_ACTIVITY_NEW_TASK
                    });
                    var notification = Ti.Android.createNotification({
                        contentIntent: pending,
                        contentTitle: e.data.title,
                        contentText: e.data.message,
                        tickerText: e.data.ticker,
                        icon: Ti.App.Android.R.drawable.appicon
                    });
                    Ti.Android.NotificationManager.notify(1, notification);
                    Ti.API.info(JSON.stringify(e.data));
                    Titanium.UI.createAlertDialog({
                        title: "Notifica",
                        message: e.data.message,
                        buttonNames: [ "OK" ]
                    }).show();
                }
            });
        } catch (e) {
            errorCallback({
                error: "INTERNAL_ERROR"
            });
        }
    };
    this.registerForPushNotification = registerForPushNotification;
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;