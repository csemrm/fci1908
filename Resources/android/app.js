var Alloy = require("alloy"), _ = Alloy._, Backbone = Alloy.Backbone;

_ = require("/lib/underscore")._;

Alloy.Globals.DEMO_MODE = false;

Alloy.Globals.LOG_ENABLED = true;

Ti.include("/template/fonts.js");

Ti.include("/template/colors.js");

Ti.include("/template/constants.js");

Alloy.Globals.Fonts = commonFonts;

Alloy.Globals.Colors = commonColors;

Alloy.Globals.Constants = commonConstants;

Alloy.Managers = {};

Alloy.Managers.LogManager = Alloy.createController("business/LogManager");

Alloy.Managers.PushNotificationManager = Alloy.createController("business/PushNotificationManager");

Alloy.Managers.ConnectionManager = Alloy.createController("business/ConnectionManager");

Alloy.createController("index");