function __processArg(obj, key) {
    var arg = null;
    if (obj) {
        arg = obj[key] || null;
        delete obj[key];
    }
    return arg;
}

function Controller() {
    function recursiveTextParser(element, currentText) {
        element.data && (currentText += element.data);
        element.children && element.children.length > 0 && _(element.children).each(function(children) {
            currentText = recursiveTextParser(children, currentText);
        });
        ("p" === element.name || "br" === element.name) && (currentText += "\n\n");
        return currentText;
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "ConnectionManager";
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
    var htmlparser = require("/lib/htmlparser");
    Ti.include("/lib/soupselect.js");
    Ti.include("/lib/encoder.js");
    _ = require("/lib/underscore")._;
    var httpRequest = function(parameters) {
        if (!parameters) throw "Invalid operation!";
        var popup = null;
        parameters.loadingMsg && (popup = Alloy.createController("LoadingPopup", {
            title: parameters.loadingMsg
        }));
        popup && popup.open();
        var client = Ti.Network.createHTTPClient({
            autoRedirect: false,
            onload: function(e) {
                popup && popup.close();
                parameters.callback && parameters.callback(e.source.responseText);
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
        client.setTimeout(1e4);
        client.timeout = 1e4;
        if ("GET" == parameters.method && parameters.payload) {
            var values = [];
            for (var key in payload) values.push(key + "=" + payload[key]);
            parameters.URI = parameters.URI + "?" + values.join("&");
            parameters.payload = null;
        }
        client.open(parameters.method, parameters.URI);
        client.send(parameters.payload);
    };
    var loading = false;
    var loadAllNews = function(callback) {
        if (loading) {
            callback && callback(false);
            return;
        }
        loading = true;
        LogManager.info("loadAllNews");
        httpRequest({
            URI: "http://m.fcinter1908.it/ricerca/?start=0&limit=499",
            method: "GET",
            errorCallback: function() {
                loading = false;
                callback && callback(false);
            },
            callback: function(data) {
                var htmlparser = require("/lib/htmlparser");
                var handler = new htmlparser.DefaultHandler(function(error, dom) {
                    if (error) {
                        callback && callback(false);
                        loading = false;
                    } else {
                        var newslist = soupselect.select(dom, ".list")[0];
                        var sitenews = [];
                        var lastDay = null;
                        var patt = new RegExp("(..:..) (.+)");
                        for (var i = 0; newslist.children.length > i; i++) {
                            var child = newslist.children[i];
                            if ("sezioni" === child.attribs.class) {
                                try {
                                    lastDay = child.children[0].data.replace("  ", " ").replace("  ", " ");
                                } catch (ex) {
                                    lastDay = null;
                                }
                                continue;
                            }
                            if ("list-item" === child.attribs.class) {
                                var snews = {
                                    day: lastDay
                                };
                                try {
                                    snews.image = child.children[0].children[0].attribs.src;
                                } catch (e) {}
                                try {
                                    snews.hour = patt.exec(child.children[1].children[0].children[0].data)[1];
                                } catch (e) {}
                                try {
                                    snews.category = patt.exec(child.children[1].children[0].children[0].data)[2];
                                } catch (e) {}
                                try {
                                    snews.title = child.children[1].children[2].children[0].children[0].data;
                                } catch (e) {}
                                try {
                                    snews.url = "http://m.fcinter1908.it" + child.children[1].children[2].attribs.href;
                                } catch (e) {}
                                sitenews.push(snews);
                            }
                        }
                        var groups = _(_(sitenews).groupBy("category")).toArray();
                        var data = [];
                        data.push({
                            name: "Ultime Notizie",
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
                        Ti.App.fireEvent("fcinter.newsUpdated", {
                            data: data
                        });
                        callback && callback(data);
                        loading = false;
                    }
                }, {
                    verbose: false,
                    ignoreWhitespace: true
                });
                var parser = new htmlparser.Parser(handler);
                parser.parseComplete(data);
            }
        });
    };
    var loadSingleNews = function(news, callback) {
        httpRequest({
            URI: news.url,
            method: "GET",
            errorCallback: function() {
                callback && callback(false);
            },
            callback: function(data) {
                var articolo;
                var handler = new htmlparser.DefaultHandler(function(error, dom) {
                    if (error) callback && callback(false); else {
                        articolo = soupselect.select(dom, ".articolo")[0];
                        news.detail = {};
                        try {
                            news.detail.author = articolo.children[2].children[1].data.trim();
                        } catch (e) {}
                        try {
                            news.detail.fonte = articolo.children[2].children[4].data.trim();
                        } catch (e) {}
                        try {
                            news.detail.readers = articolo.children[2].children[6].data.trim();
                        } catch (e) {}
                        try {
                            news.detail.photo = articolo.children[3].children[0].children[0].attribs.src;
                        } catch (e) {}
                        try {
                            news.detail.content = Encoder.htmlDecode(recursiveTextParser(articolo.children[3], "").replace(/(<([^>]+)>)/gi, ""));
                        } catch (e) {}
                        try {
                            var video = soupselect.select(dom, "a[rel=nofollow]");
                            video[0] && (news.detail.video = video[0].attribs.href);
                        } catch (e) {}
                        callback && callback(news);
                    }
                }, {
                    verbose: false,
                    ignoreWhitespace: true
                });
                var parser = new htmlparser.Parser(handler);
                parser.parseComplete(data);
            }
        });
    };
    var trackApplication = function(context) {
        LogManager.info("trackApplication - context: " + context);
        var uri;
        "home" === context ? uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.home,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI" : "news" === context ? uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.news,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI" : "changecategory" === context && (uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.changecategory,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI");
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
    this.searchNews = searchNews;
    this.httpRequest = httpRequest;
    this.loadAllNews = loadAllNews;
    this.loadSingleNews = loadSingleNews;
    this.trackApplication = trackApplication;
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;