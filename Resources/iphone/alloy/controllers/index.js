function __processArg(obj, key) {
    var arg = null;
    if (obj) {
        arg = obj[key] || null;
        delete obj[key];
    }
    return arg;
}

function Controller() {
    function toggleMenu() {
        if (menuOpened) $.pagesContainer.animate({
            left: 0,
            duration: 250
        }, function() {
            menuOpened = false;
        }); else {
            menuOpened = true;
            $.pagesContainer.animate({
                left: "60%",
                duration: 250
            });
        }
    }
    function onVideoClick(ea) {
        ea.source.url && Ti.Platform.openURL(ea.source.url);
    }
    function setCurrentDetailView(news) {
        currentNews = news;
        $.newsDetail.remove($.newsTitle);
        $.newsDetail.remove($.newsAuthor);
        $.newsDetail.remove($.newsImage);
        $.newsDetail.remove($.newsSummary);
        $.newsDetail.remove($.newsContent);
        $.newsDetail.remove($.newsFonte);
        $.newsDetail.remove($.newsVideo);
        $.newsTitle.text = news.title || "";
        $.newsAuthor.text = String.format("%s %s %s", news.detail.author || "", news.day || "", news.hour || "");
        $.newsImage.image = news.detail.photo || null;
        $.newsImage.setWidth("90%");
        $.newsContent.text = news.detail.content || "Nessun contenuto da visualizzare";
        $.newsDetail.add($.newsTitle);
        $.newsDetail.add($.newsAuthor);
        $.newsDetail.add($.newsImage);
        if (news.detail.fonte) {
            $.newsFonte.text = "Fonte: " + news.detail.fonte;
            $.newsDetail.add($.newsFonte);
        } else $.newsFonte.text = "";
        if (news.detail.summary) {
            $.newsSummary.backgroundColor = "#ededed";
            $.newsSummary.text = news.detail.summary;
            $.newsDetail.add($.newsSummary);
        }
        if (news.detail.video) {
            $.newsDetail.add($.newsVideo);
            $.newsVideo.url = news.detail.video;
        } else $.newsVideo.url = null;
        $.newsDetail.add($.newsContent);
        $.optionsButton.visible = false;
        $.searchButton.visible = false;
        $.backButton.visible = true;
        $.shareButton.visible = true;
        $.newsPages.scrollToView(1);
        $.newsDetail.animate({
            opacity: 1,
            duration: 150
        }, function() {
            $.newsDetail.setOpacity(1);
        });
        Alloy.Managers.ConnectionManager.trackApplication("news");
    }
    function setCurrentDetailNews(news, loadText, swipe, callback) {
        if (news.detail && !swipe) setCurrentDetailView(news); else {
            popup.open(loadText);
            Alloy.Managers.ConnectionManager.loadSingleNews(news, function(result) {
                popup.close();
                if (result) {
                    setCurrentDetailView(news);
                    callback && callback();
                } else {
                    var alert = Ti.UI.createAlertDialog({
                        buttonNames: [ "Riprova" ],
                        message: "Problema di connessione con il server",
                        title: "Attenzione!"
                    });
                    alert.addEventListener("click", function() {
                        onError = false;
                        setCurrentDetailNews(news, loadText, swipe, callback);
                    });
                    alert.show();
                }
            });
        }
    }
    function onNewsClick(e) {
        if (menuOpened) toggleMenu(); else {
            searching && searchClick();
            currentDatasourceIndex = e.row.datasourceIndex;
            currentNewsIndex = e.row.newsIndex;
            setCurrentDetailNews(datasource[e.row.datasourceIndex].news[e.row.newsIndex], "Carico i dettagli ...");
            adView && adView.requestAd && adView.requestAd();
        }
    }
    function backClick() {
        $.newsPages.scrollToView(0);
        $.optionsButton.visible = true;
        $.searchButton.visible = true;
        $.backButton.visible = false;
        $.shareButton.visible = false;
        setTimeout(function() {
            $.newsDetail.scrollTo(0, 0);
        }, 150);
    }
    function updateClick() {
        if (updating) return;
        updating = true;
        if (1 === $.newsPages.currentPage) {
            LogManager.info("Reload current news");
            $.newsDetail.animate({
                opacity: 0,
                duration: 150
            }, function() {
                $.newsDetail.setOpacity(0);
            });
            setCurrentDetailNews(datasource[currentDatasourceIndex].news[currentNewsIndex], "Aggiornamento notizia ...", true, function() {
                updating = false;
            });
        } else {
            LogManager.info("Reload all news");
            popup.open("Recupero le notizie ...");
            Alloy.Managers.ConnectionManager.loadAllNews(function(result) {
                popup.close();
                updating = false;
                Ti.App.fireEvent("fcinter:updateComplete");
                if (!result) {
                    var alert = Ti.UI.createAlertDialog({
                        buttonNames: [ "Riprova" ],
                        message: "Problema di connessione con il server",
                        title: "Attenzione!"
                    });
                    alert.addEventListener("click", function() {
                        onError = false;
                        updateClick();
                    });
                    alert.show();
                    $.newsList.data = [ Ti.UI.createTableViewRow({
                        title: "Errore di connessione."
                    }) ];
                }
            });
            backClick();
        }
    }
    function shareClick() {
        var Social = require("dk.napp.social");
        Social.activityView({
            text: currentNews.title,
            url: currentNews.url
        });
    }
    function searchClick() {
        if (searching) {
            $.optionsButton.animate({
                opacity: 1,
                duration: 150
            });
            $.updateButton.animate({
                opacity: 1,
                duration: 150
            });
            $.logo.animate({
                opacity: 1,
                duration: 150
            });
            $.searchTxf.visible = false;
            $.searchTxf.blur();
            $.searchTxf.value = "";
        } else {
            $.optionsButton.animate({
                opacity: 0,
                duration: 150
            });
            $.updateButton.animate({
                opacity: 0,
                duration: 150
            });
            $.logo.animate({
                opacity: 0,
                duration: 150
            }, function() {
                $.searchTxf.visible = true;
                $.searchTxf.focus();
            });
        }
        searching = !searching;
    }
    function search() {
        if ($.searchTxf.value) {
            var result = Alloy.Managers.ConnectionManager.searchNews($.searchTxf.value, datasource);
            LogManager.info(JSON.stringify(result));
            if (result.news.length > 0) {
                datasource.push(result);
                showNewsByCategory(datasource.length - 1, true);
            } else {
                var dialog = Ti.UI.createAlertDialog({
                    buttonNames: [ "Ok" ],
                    message: "Nessun risultato trovato",
                    title: "Attenzione"
                });
                dialog.show();
            }
        }
    }
    function onOptionClick(e) {
        e.index !== currentCategory && showNewsByCategory(e.index);
        toggleMenu();
    }
    function showNewsByCategory(category, forceReset) {
        if (category >= 0 && datasource && datasource[category]) {
            var newsCount = Math.max(10, Math.floor(1.5 * (Ti.Platform.displayCaps.platformHeight / 100)));
            LogManager.info("News to add: " + newsCount);
            if (forceReset || category !== currentCategory) {
                datasource[currentCategory].listed = 0;
                datasource[category].listed = 0;
                lastDay = null;
                $.newsList.data = [];
                Alloy.Managers.ConnectionManager.trackApplication("changecategory");
            }
            currentCategory = category;
            var count = 0;
            var startIndex = datasource[category].listed;
            _(datasource[category].news).each(function(news, newsIndex) {
                if (startIndex > newsIndex) return;
                if (count >= newsCount) return;
                count++;
                datasource[category].listed += 1;
                var row = Ti.UI.createTableViewRow({
                    className: "newsRow",
                    height: 100,
                    datasourceIndex: category,
                    newsIndex: newsIndex,
                    backgroundSelectedColor: "#24289f",
                    selectedBackgroundColor: "#24289f"
                });
                row.add(Ti.UI.createImageView({
                    image: news.image,
                    top: 10,
                    left: 10,
                    width: 80,
                    height: 80,
                    touchEnabled: false
                }));
                row.add(Ti.UI.createLabel({
                    color: "#A1ABB5",
                    font: Alloy.Globals.Fonts.helveticaCondensedBold12,
                    text: String.format("%s %s", news.category, news.hour),
                    textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
                    top: 10,
                    left: 100,
                    touchEnabled: false
                }));
                var color = "#000";
                var font = Alloy.Globals.Fonts.helveticaCondensed14;
                if ("Esclusive" === news.category) {
                    color = "#F78131";
                    font = Alloy.Globals.Fonts.helveticaCondensedBold14;
                }
                if ("Copertina" === news.category) {
                    color = "#24289f";
                    font = Alloy.Globals.Fonts.helveticaCondensedBold14;
                }
                row.add(Ti.UI.createLabel({
                    color: color,
                    font: font,
                    text: news.title,
                    textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
                    top: 30,
                    bottom: 16,
                    left: 100,
                    right: 10,
                    touchEnabled: false
                }));
                row.add(Ti.UI.createView({
                    width: "80%",
                    bottom: 0,
                    backgroundColor: "#d4cbbb",
                    height: 1,
                    touchEnabled: false
                }));
                $.newsList.appendRow(row, {
                    animated: true,
                    animationStyle: Titanium.UI.iPhone.RowAnimationStyle.FADE,
                    position: Titanium.UI.iPhone.TableViewScrollPosition.BOTTOM
                });
            });
            updatingNews = false;
        }
    }
    function startUpdateNews(category) {
        if (!updatingNews) {
            updatingNews = true;
            var updateRow = Ti.UI.createTableViewRow({
                "class": "loadingRow",
                height: 50,
                touchEnabled: false
            });
            updateRow.add(Ti.UI.createLabel({
                color: "#000",
                text: "loading ..."
            }));
            $.newsList.appendRow(updateRow);
            setTimeout(function() {
                $.newsList.deleteRow(updateRow);
                updateRow = null;
                showNewsByCategory(category);
            }, 1e3);
        }
    }
    function updateCategories() {
        if (datasource) {
            var options = [];
            _(datasource).each(function(category) {
                options.push({
                    title: category.name,
                    color: "#ccc",
                    font: Alloy.Globals.Fonts.helveticaCondensed14,
                    height: 50
                });
            });
            $.options.data = options;
        }
    }
    function displayAdv() {
        function toTestAdv() {
            LogManager.info("Failed to receive ad! -> to test adv");
            $.adContainer.remove(adView);
            adView = null;
            adView = Admob.createView({
                width: 320,
                height: 50,
                publisherId: "ca-app-pub-4666117465588141/3422738069",
                adBackgroundColor: "white",
                dateOfBirth: new Date(1981, 30, 5)
            });
            $.adContainer.add(adView);
        }
        var publisherId = "/5902/fcinter/mobile_app_ios";
        var random = Math.floor(20 * Math.random()) + 1;
        if (20 === random) {
            LogManager.info("Random test adv");
            publisherId = "ca-app-pub-4666117465588141/3422738069";
        }
        LogManager.info("publisherId: " + publisherId);
        if (adView) {
            $.adContainer.remove(adView);
            adView = null;
        }
        adView = Admob.createView({
            width: 320,
            height: 50,
            publisherId: publisherId,
            adBackgroundColor: "white",
            dateOfBirth: new Date(1981, 30, 5)
        });
        adok = false;
        adView.addEventListener("didReceiveAd", function() {
            LogManager.info("Did receive ad!");
            adok = true;
        });
        adView.addEventListener("ad_not_received", toTestAdv);
        adView.addEventListener("didFailToReceiveAd", toTestAdv);
        $.adContainer.add(adView);
    }
    function swipeNext() {
        if (datasource[currentDatasourceIndex].news.length > currentNewsIndex + 1) {
            LogManager.info("Load next news");
            currentNewsIndex++;
            $.newsDetail.animate({
                opacity: 0,
                duration: 150
            }, function() {
                $.newsDetail.setOpacity(0);
            });
            setCurrentDetailNews(datasource[currentDatasourceIndex].news[currentNewsIndex], "Carico la news successiva ...", true);
        } else {
            LogManager.info("No next news!");
            Ti.Media.vibrate();
        }
    }
    function swipePrev() {
        if (currentNewsIndex > 0) {
            LogManager.info("Load prev news");
            currentNewsIndex--;
            setCurrentDetailNews(datasource[currentDatasourceIndex].news[currentNewsIndex], "Carico la news precedente ...", true);
            $.newsDetail.animate({
                opacity: 0,
                duration: 150
            }, function() {
                $.newsDetail.setOpacity(0);
            });
        } else {
            LogManager.info("No prev news!");
            Ti.Media.vibrate();
        }
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "index";
    if (arguments[0]) {
        __processArg(arguments[0], "__parentSymbol");
        __processArg(arguments[0], "$model");
        __processArg(arguments[0], "__itemTemplate");
    }
    var $ = this;
    var exports = {};
    var __defers = {};
    $.__views.index = Ti.UI.createWindow(function() {
        var o = {};
        Alloy.isTablet && _.extend(o, {
            backgroundColor: "#d4cbbb",
            navBarHidden: true,
            navTintColor: "#000",
            orientationModes: [ Ti.UI.PORTRAIT, Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT ],
            top: 0,
            bottom: 0
        });
        Alloy.isHandheld && _.extend(o, {
            backgroundColor: "#d4cbbb",
            navBarHidden: true,
            navTintColor: "#000",
            orientationModes: [ Ti.UI.PORTRAIT ],
            top: 0,
            bottom: 0
        });
        _.extend(o, {
            id: "index",
            exitOnClose: "true"
        });
        return o;
    }());
    $.__views.index && $.addTopLevelView($.__views.index);
    $.__views.options = Ti.UI.createTableView({
        backgroundColor: "#000",
        width: "60%",
        left: 0,
        rowHeight: 50,
        id: "options"
    });
    $.__views.index.add($.__views.options);
    onOptionClick ? $.__views.options.addEventListener("click", onOptionClick) : __defers["$.__views.options!click!onOptionClick"] = true;
    $.__views.pagesContainer = Ti.UI.createView({
        top: 0,
        bottom: 0,
        left: 0,
        width: "100%",
        backgroundColor: "#fff",
        scrollingEnabled: false,
        id: "pagesContainer"
    });
    $.__views.index.add($.__views.pagesContainer);
    $.__views.header = Ti.UI.createView({
        top: 0,
        height: 50,
        backgroundGradient: {
            type: "linear",
            startPoint: {
                x: "50%",
                y: "0%"
            },
            endPoint: {
                x: "50%",
                y: "100%"
            },
            colors: [ {
                color: "#d4cbbb",
                offset: 0
            }, {
                color: "#fff",
                offset: 1
            } ]
        },
        id: "header"
    });
    $.__views.pagesContainer.add($.__views.header);
    $.__views.optionsButton = Ti.UI.createButton({
        left: 0,
        top: 0,
        height: 50,
        width: 50,
        backgroundImage: "/images/btn_menu.png",
        backgroundSelectedImage: "none",
        id: "optionsButton"
    });
    $.__views.header.add($.__views.optionsButton);
    toggleMenu ? $.__views.optionsButton.addEventListener("click", toggleMenu) : __defers["$.__views.optionsButton!click!toggleMenu"] = true;
    $.__views.backButton = Ti.UI.createButton({
        left: 0,
        top: 0,
        height: 50,
        width: 50,
        visible: false,
        backgroundImage: "/images/btn_back.png",
        backgroundSelectedImage: "none",
        id: "backButton"
    });
    $.__views.header.add($.__views.backButton);
    backClick ? $.__views.backButton.addEventListener("click", backClick) : __defers["$.__views.backButton!click!backClick"] = true;
    $.__views.updateButton = Ti.UI.createButton({
        left: 50,
        top: 0,
        height: 50,
        width: 50,
        backgroundImage: "/images/btn_update.png",
        backgroundSelectedImage: "none",
        id: "updateButton"
    });
    $.__views.header.add($.__views.updateButton);
    updateClick ? $.__views.updateButton.addEventListener("click", updateClick) : __defers["$.__views.updateButton!click!updateClick"] = true;
    $.__views.logo = Ti.UI.createImageView({
        width: 150,
        height: 50,
        image: "/images/logo.png",
        id: "logo"
    });
    $.__views.header.add($.__views.logo);
    $.__views.searchButton = Ti.UI.createButton({
        right: 0,
        top: 0,
        height: 50,
        width: 50,
        backgroundImage: "/images/btn_search.png",
        backgroundSelectedImage: "none",
        id: "searchButton"
    });
    $.__views.header.add($.__views.searchButton);
    searchClick ? $.__views.searchButton.addEventListener("click", searchClick) : __defers["$.__views.searchButton!click!searchClick"] = true;
    $.__views.shareButton = Ti.UI.createButton({
        right: 0,
        top: 0,
        height: 50,
        width: 50,
        visible: false,
        backgroundImage: "/images/btn_share.png",
        backgroundSelectedImage: "none",
        id: "shareButton"
    });
    $.__views.header.add($.__views.shareButton);
    shareClick ? $.__views.shareButton.addEventListener("click", shareClick) : __defers["$.__views.shareButton!click!shareClick"] = true;
    $.__views.__alloyId0 = Ti.UI.createView({
        height: 2,
        bottom: 0,
        left: 10,
        right: 10,
        backgroundColor: "#d4cbbb",
        id: "__alloyId0"
    });
    $.__views.searchTxf = Ti.UI.createTextField({
        top: 5,
        left: 5,
        right: 60,
        height: 40,
        backgroundImage: "none",
        visible: false,
        color: "#000",
        textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
        maxLength: 20,
        returnKeyType: Ti.UI.RETURNKEY_SEARCH,
        hintText: "Cerca qui",
        id: "searchTxf"
    });
    $.__views.header.add($.__views.searchTxf);
    $.__views.searchTxf.add($.__views.__alloyId0);
    search ? $.__views.searchTxf.addEventListener("return", search) : __defers["$.__views.searchTxf!return!search"] = true;
    var __alloyId1 = [];
    $.__views.newsList = Ti.UI.createTableView({
        backgroundColor: "#FFF",
        separatorColor: "transparent",
        id: "newsList"
    });
    __alloyId1.push($.__views.newsList);
    onNewsClick ? $.__views.newsList.addEventListener("click", onNewsClick) : __defers["$.__views.newsList!click!onNewsClick"] = true;
    $.__views.newsDetail = Ti.UI.createScrollView({
        backgroundColor: "#FFF",
        layout: "vertical",
        id: "newsDetail"
    });
    __alloyId1.push($.__views.newsDetail);
    $.__views.newsTitle = Ti.UI.createLabel({
        width: "90%",
        height: Ti.UI.SIZE,
        color: "#000",
        left: "5%",
        font: Alloy.Globals.Fonts.helveticaCondensedBold16,
        textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
        top: 0,
        id: "newsTitle"
    });
    $.__views.newsDetail.add($.__views.newsTitle);
    $.__views.newsAuthor = Ti.UI.createLabel({
        width: "90%",
        height: Ti.UI.SIZE,
        color: "#A1ABB5",
        left: "5%",
        font: Alloy.Globals.Fonts.helveticaCondensedBold12,
        textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
        top: 5,
        id: "newsAuthor"
    });
    $.__views.newsDetail.add($.__views.newsAuthor);
    $.__views.newsImage = Ti.UI.createImageView({
        width: "90%",
        left: "5%",
        top: 5,
        id: "newsImage"
    });
    $.__views.newsDetail.add($.__views.newsImage);
    $.__views.newsFonte = Ti.UI.createLabel({
        width: "90%",
        height: Ti.UI.SIZE,
        color: "#A1ABB5",
        left: "5%",
        font: Alloy.Globals.Fonts.helveticaCondensed12,
        textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
        top: 5,
        id: "newsFonte"
    });
    $.__views.newsDetail.add($.__views.newsFonte);
    $.__views.newsSummary = Ti.UI.createLabel({
        width: "90%",
        height: Ti.UI.SIZE,
        color: "#000",
        left: "5%",
        font: Alloy.Globals.Fonts.helveticaCondensedBold12,
        textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
        top: 5,
        id: "newsSummary"
    });
    $.__views.newsDetail.add($.__views.newsSummary);
    $.__views.newsVideo = Ti.UI.createLabel({
        width: "60%",
        height: 40,
        color: "#FFF",
        left: "20%",
        borderRadius: 5,
        font: Alloy.Globals.Fonts.helveticaCondensedBold34,
        textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
        verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
        backgroundColor: "#23286A",
        top: 5,
        text: "VIDEO",
        id: "newsVideo"
    });
    $.__views.newsDetail.add($.__views.newsVideo);
    onVideoClick ? $.__views.newsVideo.addEventListener("click", onVideoClick) : __defers["$.__views.newsVideo!click!onVideoClick"] = true;
    $.__views.newsSummary = Ti.UI.createLabel({
        width: "90%",
        height: Ti.UI.SIZE,
        color: "#000",
        left: "5%",
        font: Alloy.Globals.Fonts.helveticaCondensedBold12,
        textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
        top: 5,
        id: "newsSummary"
    });
    $.__views.newsDetail.add($.__views.newsSummary);
    $.__views.newsContent = Ti.UI.createLabel({
        width: "90%",
        height: Ti.UI.SIZE,
        color: "#000",
        left: "5%",
        font: Alloy.Globals.Fonts.helveticaCondensed16,
        textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
        top: 5,
        id: "newsContent"
    });
    $.__views.newsDetail.add($.__views.newsContent);
    $.__views.newsPages = Ti.UI.createScrollableView({
        top: 50,
        bottom: 50,
        left: 0,
        right: 0,
        backgroundColor: "#FFF",
        scrollingEnabled: false,
        views: __alloyId1,
        id: "newsPages"
    });
    $.__views.pagesContainer.add($.__views.newsPages);
    $.__views.adContainer = Ti.UI.createView({
        height: 50,
        bottom: 0,
        backgroundColor: "#FFF",
        id: "adContainer"
    });
    $.__views.pagesContainer.add($.__views.adContainer);
    exports.destroy = function() {};
    _.extend($, $.__views);
    _ = require("/lib/underscore")._;
    var Admob = require("ti.admob");
    var LogManager = Alloy.createController("business/LogManager");
    $.index.top = 20;
    $.index.statusBarStyle = Titanium.UI.iPhone.StatusBar.LIGHT_CONTENT;
    var menuOpened = false;
    var currentCategory = 0;
    var datasource = null;
    var popup = Alloy.createController("LoadingPopup", {
        parent: $.index
    });
    var currentNews;
    var currentDatasourceIndex = null;
    var currentNewsIndex = null;
    var updating = false;
    var searching = false;
    var lastDay = null;
    var updatingNews = true;
    var lastDistance = 0;
    $.newsList.addEventListener("scroll", function(e) {
        var offset = e.contentOffset.y;
        var height = e.size.height;
        var total = offset + height;
        var theEnd = e.contentSize.height;
        var distance = theEnd - total;
        lastDistance > distance && total >= theEnd && startUpdateNews(currentCategory);
        lastDistance = distance;
    });
    Ti.App.addEventListener("fcinter.newsUpdated", function(result) {
        popup && popup.close();
        datasource = result.data;
        updateCategories();
        currentCategory = currentCategory >= datasource.length ? 0 : currentCategory;
        showNewsByCategory(currentCategory, true);
    });
    var onError = false;
    Ti.App.addEventListener("fcinter.newsError", function(ea) {
        if (onError) return;
        onError = true;
        LogManager.info("Error event: " + JSON.stringify(ea));
        var alert = Ti.UI.createAlertDialog({
            buttonNames: [ "OK" ],
            message: ea.error,
            title: "ERRORE!"
        });
        alert.addEventListener("click", function() {
            onError = false;
        });
        alert.show();
        $.newsList.data = [ Ti.UI.createTableViewRow({
            title: "Errore di connessione."
        }) ];
    });
    Ti.App.addEventListener("fcinter:loadAllNewsError", function() {
        popup && popup.close();
    });
    Ti.App.addEventListener("fcinter:loadAllNewsComplete", function() {
        popup && popup.close();
    });
    $.index.addEventListener("open", function() {
        Alloy.Managers.ConnectionManager.trackApplication("home");
        updateClick();
        displayAdv();
    });
    var closing = false;
    $.index.addEventListener("androidback", function() {
        if (1 === $.newsPages.currentPage) backClick(); else {
            if (closing) return;
            closing = true;
            var dialog = Ti.UI.createAlertDialog({
                cancel: 0,
                buttonNames: [ "Annulla", "Chiudi" ],
                message: "Vuoi chiudere l'app?",
                title: "Attenzione!"
            });
            dialog.addEventListener("click", function(e) {
                if (1 === e.index) {
                    LogManager.info("Closing app");
                    $.index.close();
                }
                closing = false;
            });
            dialog.show();
        }
    });
    var adView;
    var adok;
    var start = null;
    $.newsDetail.addEventListener("touchstart", function(e) {
        try {
            start = e.source.convertPointToView({
                x: e.x,
                y: e.y
            }, $.index);
        } catch (ex) {}
    });
    $.newsDetail.addEventListener("touchend", function(e) {
        try {
            var end = e.source.convertPointToView({
                x: e.x,
                y: e.y
            }, $.index);
            if (!end) return;
            if (100 > Math.abs(end.y - start.y)) {
                start && end.x - start.x > 50 && swipePrev();
                start && -50 > end.x - start.x && swipeNext();
            }
            start = null;
        } catch (ex) {}
    });
    var control = Ti.UI.createRefreshControl({
        tintColor: "#555"
    });
    control.addEventListener("refreshstart", function() {
        updateClick();
    });
    Ti.App.addEventListener("fcinter:updateComplete", function() {
        control.endRefreshing();
    });
    $.newsList.refreshControl = control;
    $.index.open();
    __defers["$.__views.options!click!onOptionClick"] && $.__views.options.addEventListener("click", onOptionClick);
    __defers["$.__views.optionsButton!click!toggleMenu"] && $.__views.optionsButton.addEventListener("click", toggleMenu);
    __defers["$.__views.backButton!click!backClick"] && $.__views.backButton.addEventListener("click", backClick);
    __defers["$.__views.updateButton!click!updateClick"] && $.__views.updateButton.addEventListener("click", updateClick);
    __defers["$.__views.searchButton!click!searchClick"] && $.__views.searchButton.addEventListener("click", searchClick);
    __defers["$.__views.shareButton!click!shareClick"] && $.__views.shareButton.addEventListener("click", shareClick);
    __defers["$.__views.searchTxf!return!search"] && $.__views.searchTxf.addEventListener("return", search);
    __defers["$.__views.newsList!click!onNewsClick"] && $.__views.newsList.addEventListener("click", onNewsClick);
    __defers["$.__views.newsVideo!click!onVideoClick"] && $.__views.newsVideo.addEventListener("click", onVideoClick);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;