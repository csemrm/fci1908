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
    this.__controllerPath = "business/ConnectionManager";
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
    Ti.include("/lib/encoder.js");
    _ = require("/lib/underscore")._;
    var moment = require("lib/moment");
    moment.lang("it");
    var httpRequest = function(parameters) {
        if (!parameters) throw "Invalid operation!";
        var popup = null;
        parameters.loadingMsg && (popup = Alloy.createController("LoadingPopup", {
            title: parameters.loadingMsg
        }));
        popup && popup.open();
        var client = Ti.Network.createHTTPClient({
            validatesSecureCertificate: false,
            autoRedirect: false,
            onload: function(e) {
                popup && popup.close();
                parameters.callback && (parameters.blob ? parameters.callback(e.source.responseData) : parameters.callback(e.source.responseText));
            },
            onerror: function(e) {
                popup && popup.close();
                LogManager.error("Http Request Connection Error: " + e.error);
                parameters.errorCallback ? parameters.errorCallback("Errore di connessione con il server.") : Ti.UI.createAlertDialog({
                    buttonNames: [ "OK" ],
                    message: "Errore di connessione con il server.",
                    title: "Errore!"
                }).show();
            },
            timeout: 1e4
        });
        client.timeout = 1e4;
        client.setTimeout(1e4);
        client.autoEncodeUrl = false;
        client.setAutoEncodeUrl(false);
        if ("GET" == parameters.method && parameters.payload) {
            var values = [];
            for (var key in payload) values.push(key + "=" + payload[key]);
            parameters.URI = parameters.URI + "?" + values.join("&");
            parameters.payload = null;
        }
        client.open(parameters.method, parameters.URI);
        parameters.headers && parameters.headers.length > 0 && _.each(parameters.headers, function(header) {
            client.setRequestHeader(header.name, header.value);
        });
        client.send(parameters.payload);
    };
    var loadAllNews = function(callback) {
        LogManager.info("loadAllNews");
        var url = "https://fci1908-ios-ep98.articles-pub.v1.tccapis.com/";
        url += "?start=0&step=499";
        var salt = "uw9f6g5h4q";
        var uuid = Ti.Platform.createUUID();
        var secret = Ti.Utils.md5HexDigest(url + salt + uuid);
        httpRequest({
            URI: url,
            method: "GET",
            errorCallback: function() {
                Ti.App.fireEvent("fcinter:loadAllNewsError");
                callback && callback(false);
            },
            headers: [ {
                name: "X-TCC-Version",
                value: "1.1"
            }, {
                name: "X-TCC-UUID",
                value: uuid
            }, {
                name: "X-TCC-Secret",
                value: secret
            } ],
            callback: function(data) {
                var doc = Ti.XML.parseString(data).documentElement;
                var articles = doc.getElementsByTagName("article");
                var sitenews = [];
                for (var i = 0; articles.length > i; i++) {
                    var article = articles.item(i);
                    var snews = {
                        day: ""
                    };
                    try {
                        snews.image = article.getElementsByTagName("thumb2").item(0).textContent;
                    } catch (e) {}
                    try {
                        snews.date = article.getElementsByTagName("date").item(0).textContent;
                        snews.hour = moment(snews.date).format("HH:mm");
                        snews.day = moment(snews.date).format("DD-MM-YYYY");
                    } catch (e) {}
                    try {
                        snews.category = article.getElementsByTagName("section").item(0).textContent;
                    } catch (e) {}
                    try {
                        snews.title = article.getElementsByTagName("title").item(0).textContent;
                    } catch (e) {}
                    try {
                        snews.id = article.getElementsByTagName("id").item(0).textContent;
                    } catch (e) {}
                    try {
                        snews.source = article.getElementsByTagName("source").length > 0 ? article.getElementsByTagName("source").item(0).textContent : null;
                    } catch (e) {}
                    sitenews.push(snews);
                }
                var groups = _(_(sitenews).groupBy("category")).toArray();
                var data = [];
                data.push({
                    name: "Tutte le notizie",
                    news: sitenews,
                    count: sitenews.length,
                    listed: 0
                });
                _(groups).each(function(group) {
                    data.push({
                        name: group[0].category,
                        news: group,
                        count: group.length,
                        listed: 0
                    });
                    group = _(group).groupBy("day");
                });
                Ti.App.fireEvent("fcinter:loadAllNewsComplete");
                Ti.App.fireEvent("fcinter.newsUpdated", {
                    data: data
                });
                callback && callback(data);
            }
        });
    };
    var loadSingleNews = function(news, callback) {
        var url = "https://fci1908-ios-ep98.articles-pub.v1.tccapis.com/";
        url += "?id=" + news.id;
        var salt = "uw9f6g5h4q";
        var uuid = Ti.Platform.createUUID();
        var secret = Ti.Utils.md5HexDigest(url + salt + uuid);
        httpRequest({
            URI: url,
            method: "GET",
            errorCallback: function() {
                Ti.App.fireEvent("fcinter:loadAllNewsError");
                callback && callback(false);
            },
            headers: [ {
                name: "X-TCC-Version",
                value: "1.1"
            }, {
                name: "X-TCC-UUID",
                value: uuid
            }, {
                name: "X-TCC-Secret",
                value: secret
            } ],
            errorCallback: function() {
                callback && callback(false);
            },
            callback: function(data) {
                Ti.API.info(data);
                var doc = Ti.XML.parseString(data).documentElement;
                var article = doc.getElementsByTagName("article").item(0);
                news.detail = {};
                try {
                    news.title = article.getElementsByTagName("title").item(0).textContent;
                } catch (e) {}
                try {
                    news.url = article.getElementsByTagName("url").item(0).textContent;
                } catch (e) {}
                try {
                    news.detail.author = article.getElementsByTagName("author").item(0).textContent;
                } catch (e) {}
                try {
                    news.detail.fonte = article.getElementsByTagName("source").length > 0 ? article.getElementsByTagName("source").item(0).textContent : null;
                } catch (e) {}
                try {
                    news.detail.summary = article.getElementsByTagName("summary").length > 0 ? article.getElementsByTagName("summary").item(0).textContent : null;
                } catch (e) {}
                try {
                    news.detail.photo = article.getElementsByTagName("thumb1").item(0).textContent;
                } catch (e) {}
                try {
                    news.detail.content = Encoder.htmlDecode(article.getElementsByTagName("text").item(0).textContent.replace(/(<([^>]+)>)/gi, "")).trim();
                } catch (e) {}
                try {
                    news.detail.images = [];
                    var imgs = /<img[^>]+src\s*=\s*"[^"]+"[^>]*>/gim.exec(article.getElementsByTagName("text").item(0).textContent);
                    _.each(imgs, function(img) {
                        news.detail.images.push(/<img.*?src="([^"]+)"/.exec(img)[1]);
                    });
                    Ti.API.info("images: " + JSON.stringify(news.detail.images));
                } catch (e) {}
                try {
                    news.detail.video = article.getElementsByTagName("video").length > 0 ? article.getElementsByTagName("video").item(0).getAttribute("url") : null;
                } catch (e) {}
                callback && callback(news);
            }
        });
    };
    var trackApplication = function(context) {
        LogManager.info("trackApplication - context: " + context);
        var uri;
        "home" === context ? uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.home,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI" : "news" === context ? uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.news,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI" : "changecategory" === context && (uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.changecategory,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI");
        try {
            httpRequest({
                URI: uri,
                method: "GET",
                errorCallback: function(error) {
                    LogManager.error("trackApplication Error: " + error);
                }
            });
        } catch (ex) {
            LogManager.error("trackApplication catch Error: " + JSON.stringify(ex));
        }
    };
    var searchNews = function(value, data) {
        var result = [];
        if (value && data) for (var i = 1; data.length > i; i++) if (!data[i].searched) {
            var news = data[i].news;
            for (var n = 0; news && news.length > n; n++) news[n].title && news[n].title.toLowerCase().indexOf(value.toLowerCase().trim()) > -1 && result.push(news[n]);
        }
        return {
            name: "Risultati ricerca",
            news: result,
            count: result.length,
            listed: 0,
            searched: true
        };
    };
    var lazyLoadImage = function(url, imageView, endCallback) {
        httpRequest({
            URI: url,
            method: "GET",
            blob: true,
            callback: function(data) {
                try {
                    imageView.image = data;
                } catch (ex) {
                    Ti.API.error(ex.message);
                }
                endCallback && endCallback();
            },
            errorCallback: function(error) {
                LogManager.error("trackApplication Error: " + error);
            }
        });
    };
    this.lazyLoadImage = lazyLoadImage;
    this.searchNews = searchNews;
    this.httpRequest = httpRequest;
    this.loadAllNews = loadAllNews;
    this.loadSingleNews = loadSingleNews;
    this.trackApplication = trackApplication;
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;