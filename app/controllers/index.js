_ = require('/lib/underscore')._;

var Admob = require('ti.admob');
var LogManager = Alloy.createController('business/LogManager');

if(OS_IOS){
	$.index.top = 20;
	$.index.statusBarStyle = Titanium.UI.iPhone.StatusBar.LIGHT_CONTENT;
}

var menuOpened = false;
var currentCategory = 0;
var datasource = null;
var lastSection = null;

var popup = Alloy.createController('LoadingPopup', {
	parent: $.index
});

function toggleMenu(e){
	// If the menu is opened
    if(menuOpened){
        $.pagesContainer.animate({
            left:0,
            duration:250
        }, function(){
        	menuOpened = false;
        });
    }
    // If the menu isn't opened
    else{
    	menuOpened = true;
        $.pagesContainer.animate({
            left:"60%",
            duration:250
        });
    }
}

function onVideoClick(ea){
	if(ea.source.url) Ti.Platform.openURL(ea.source.url);
}

var currentNews;
function setCurrentDetailView(news) {
	currentNews = news;
	
	$.newsDetail.removeAllChildren();
	
	$.newsTitle.text = news.title || "";
	$.newsAuthor.text = String.format("%s %s %s", news.detail.author || "", news.day || "", news.hour || "");
	var newsImage = Ti.UI.createImageView({
		width : "90%",
		left : '5%',
		top  : 5
	});
	if(news.detail.photo){
		Ti.API.info("Image: " + news.detail.photo);
		Alloy.Managers.ConnectionManager.lazyLoadImage(news.detail.photo, newsImage, function(){
			newsImage.setWidth("90%");
		});
	}

	if(OS_IOS){
		$.newsContent.text = news.detail.content || "Nessun contenuto da visualizzare";
	} else {
		$.newsContent.autoLink = Ti.UI.AUTOLINK_URLS;
		$.newsContent.html = news.detail.content || "Nessun contenuto da visualizzare";
	}
	
	$.newsDetail.add($.newsTitle);
	$.newsDetail.add($.newsAuthor);
	$.newsDetail.add(newsImage);
	if(news.detail.fonte){
		$.newsFonte.text = "Fonte: " + news.detail.fonte;
		$.newsDetail.add($.newsFonte);
	} else {
		$.newsFonte.text = "";
	}
	if(news.detail.summary){
		$.newsSummary.backgroundColor = "#ededed"; // hack
		$.newsSummary.text = news.detail.summary;
		$.newsDetail.add($.newsSummary);
	}
	if(news.detail.video){
		$.newsDetail.add($.newsVideo);
		$.newsVideo.url = news.detail.video;
	} else {
		$.newsVideo.url = null;
	}
	$.newsDetail.add($.newsContent);
	
	if(OS_IOS){
		_.each(news.detail.images, function(url){
			$.newsDetail.add(Ti.UI.createImageView({
				width : "90%",
				left : '5%',
				top  : 5,
				image : url
			}));
		});
	}
	
	$.optionsButton.visible = false;
	$.searchButton.visible = false;
	
	$.backButton.visible = true;
	$.shareButton.visible = true;
	$.newsPages.scrollToView(1);
	$.newsDetail.animate({
		opacity : 1,
		duration : 150
	}, function(){
		$.newsDetail.setOpacity(1);
	});
	Alloy.Managers.ConnectionManager.trackApplication("news");
}

function setCurrentDetailNews(news, loadText, swipe, callback){
	//already have detail?
	if(news.detail && !swipe) {
		setCurrentDetailView(news);
	} else {
		//show loading
		popup.open(loadText);
		Alloy.Managers.ConnectionManager.loadSingleNews(news, function(result){
			popup.close();
			if(result){
				setCurrentDetailView(news);
				if(callback)callback();
			} else {
				var alert = Ti.UI.createAlertDialog({
					buttonNames : ['Riprova'],
					message : "Problema di connessione con il server",
					title : 'Attenzione!'
				});
				alert.addEventListener("click", function(){
					onError = false;
					setCurrentDetailNews(news, loadText, swipe, callback);
				});
				alert.show();
			}
		});
	}
}

var currentDatasourceIndex = null;
var currentNewsIndex = null;
function onNewsClick(e){
	if(!menuOpened){
		if(searching) searchClick();
		
		currentDatasourceIndex = e.row.datasourceIndex;
		currentNewsIndex = e.row.newsIndex;
		
		setCurrentDetailNews(datasource[e.row.datasourceIndex].news[e.row.newsIndex],  "Carico i dettagli ...");
		
		if(adView && adView.requestAd) adView.requestAd();
	} else {
		toggleMenu();
	}
}

function backClick(e){
	$.newsPages.scrollToView(0);
	
	$.optionsButton.visible = true;
	$.searchButton.visible = true;
	
	$.backButton.visible = false;
	$.shareButton.visible = false;
	
	setTimeout(function(){
		$.newsDetail.scrollTo( 0,0 );
	}, 150);
}

var updating = false;
function updateClick(e){
	if(updating) return;
	
	updating = true;
	
	if($.newsPages.currentPage === 1){
		//reload news
		LogManager.info("Reload current news");
		
		$.newsDetail.animate({
			opacity : 0,
			duration : 150
		}, function(){
			$.newsDetail.setOpacity(0);
		});
		
		setCurrentDetailNews(
			datasource[currentDatasourceIndex].news[currentNewsIndex],
			"Aggiornamento notizia ...",
			true,
			function(){
				updating = false;
			}
		);
	} else {
		// load news
		LogManager.info("Reload all news");
		popup.open("Recupero le notizie ...");
		
		Alloy.Managers.ConnectionManager.loadAllNews(function(result){
			popup.close();
			updating = false;
			Ti.App.fireEvent("fcinter:updateComplete");
			
			if(!result){
				var alert = Ti.UI.createAlertDialog({
					buttonNames : ['Riprova'],
					message : "Problema di connessione con il server",
					title : 'Attenzione!'
				});
				alert.addEventListener("click", function(){
					onError = false;
					updateClick();
				});
				alert.show();
				$.newsList.data = [Ti.UI.createTableViewRow({
					title : "Errore di connessione."
				})];
			}
		});
		
		backClick();
	}
}

function shareClick(ea) {
	if (OS_ANDROID) {
		var activity = Ti.Android.currentActivity;
		var intent = Ti.Android.createIntent({
			action : Ti.Android.ACTION_SEND,
			type : 'text/plain'
		});

		intent.putExtra(Ti.Android.EXTRA_TEXT, currentNews.url);
		intent.putExtra(Ti.Android.EXTRA_SUBJECT, currentNews.title);
		activity.startActivity(Ti.Android.createIntentChooser(intent, 'Share'));
	} else {
		var Social = require('dk.napp.social');
		Social.activityView({
			text : currentNews.title,
			url : currentNews.url
		});
	}
}

var searching = false;
function searchClick(e){
	if(searching){
		$.optionsButton.animate({opacity : 1, duration : 150});
		$.updateButton.animate({opacity : 1, duration : 150});
		$.logo.animate({opacity : 1, duration : 150});
		
		$.searchTxf.visible = false;
		$.searchTxf.blur();
		$.searchTxf.value = "";
	} else {
		$.optionsButton.animate({opacity : 0, duration : 150});
		$.updateButton.animate({opacity : 0, duration : 150});
		$.logo.animate({opacity : 0, duration : 150}, function(ea){
			$.searchTxf.visible = true;
			$.searchTxf.focus();
		});
	}
	searching = !searching;
}

function search(e){
	if($.searchTxf.value){
		var result = Alloy.Managers.ConnectionManager.searchNews($.searchTxf.value, datasource);
		LogManager.info(JSON.stringify(result));
		if(result.news.length>0){
			datasource.push(result);
			showNewsByCategory(datasource.length-1, true);
		} else {
			var dialog = Ti.UI.createAlertDialog({
				buttonNames : ['Ok'],
				message : 'Nessun risultato trovato',
				title : 'Attenzione'
			});
			dialog.show();
		}
	}
}

function onOptionClick(e){
	if(e.index !== currentCategory) showNewsByCategory(e.index);
	
	toggleMenu();
}

var lastDay = null;
/*
 * Append 20 news to the view
 */
function showNewsByCategory(category, forceReset){
	
	if(category >= 0 && datasource && datasource[category]){
		// number of news to add 
		var newsCount = Math.max(10, Math.floor(Ti.Platform.displayCaps.platformHeight/100*1.5));
		
		LogManager.info("News to add: " + newsCount);
		
		// when changing category from menu, reset the count of listed news
		if(forceReset || category !== currentCategory) {
			datasource[currentCategory].listed = 0;
			datasource[category].listed = 0;
			lastDay = null;
			$.newsList.data = [];
			Alloy.Managers.ConnectionManager.trackApplication("changecategory");
		}
		
		currentCategory = category;
		
		var count = 0;
		var startIndex = datasource[category].listed;
		
		//for each news
		_(datasource[category].news).each(function(news, newsIndex){
			if(startIndex > newsIndex) return; //already added?
			
			if(count >= newsCount) return; //ended?
			
			count++;
			datasource[category].listed += 1;
			
			var row = Ti.UI.createTableViewRow({
				className : "newsRow",
				height : 100,
				datasourceIndex : category,
				newsIndex : newsIndex,
				backgroundSelectedColor : "#24289f",
				selectedBackgroundColor : "#24289f"
			});
			
			try{
				if(false && OS_IOS){
					row.add(Ti.UI.createImageView({
						image : news.image,
						top : 10,
						left: 10,
						width: 80,
						height: 80,
						touchEnabled : false
					}));
				} else {
					var thumb = Ti.UI.createImageView({
						top : 10,
						left: 10,
						width: 80,
						height: 80,
						touchEnabled : false
					});
					
					Alloy.Managers.ConnectionManager.lazyLoadImage(news.image, thumb);
					
					row.add(thumb);
				}
			} catch(ex) {
				Ti.API.error(ex.message);
			} //HACK
			
			row.add(Ti.UI.createLabel({
				color : "#A1ABB5",
				font : Alloy.Globals.Fonts.helveticaCondensedBold12,
				text : String.format('%s %s', news.category, news.hour),
				textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
				top : 10,
				left : 100,
				touchEnabled : false
			}));
			
			var color = "#000";
			var font = Alloy.Globals.Fonts.helveticaCondensed14;
			
			if(news.category === "Esclusive"){
				color = "#F78131";
				font = Alloy.Globals.Fonts.helveticaCondensedBold14;
			}
			
			if(news.category === "Copertina"){
				color = "#24289f";
				font = Alloy.Globals.Fonts.helveticaCondensedBold14;
			}
			
			row.add(Ti.UI.createLabel({
				color : color,
				font : font,
				text : news.title,
				textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
				top : 30,
				bottom : 16,
				left : 100,
				right : 10,
				touchEnabled : false
			}));

			row.add(Ti.UI.createView({
				width : '80%',
				bottom : 0,
				backgroundColor:"#d4cbbb",
				height : 1,
				touchEnabled : false
			}));
			
			//ADD NEWS
			if(OS_ANDROID) {
				$.newsList.appendRow( row );
			} else { 
				$.newsList.appendRow( row, {
					animated :true,
					animationStyle : Titanium.UI.iPhone.RowAnimationStyle.FADE,
					position : Titanium.UI.iPhone.TableViewScrollPosition.BOTTOM
				} );
			}
		});
		updatingNews = false;
	}
}

var updatingNews = true;
function startUpdateNews(category){
	if(!updatingNews){
		updatingNews = true;
		
		//add update row
		var updateRow = Ti.UI.createTableViewRow({
			class : "loadingRow",
			height : 50,
			touchEnabled : false
		});
		
		updateRow.add(Ti.UI.createLabel({
			color : "#000",
			text : "loading ..."
		}));
		
		$.newsList.appendRow( updateRow );
		
		setTimeout(function(e){
			$.newsList.deleteRow( updateRow );
			updateRow = null;
			showNewsByCategory(category);
		}, 1000);
	}
} 

function updateCategories(){
	if(datasource){
		var options = [];
		_(datasource).each(function(category){
			options.push({
				title : category.name,
				color : "#ccc",
				font : Alloy.Globals.Fonts.helveticaCondensed14,
				height : 50
			});
		});
		$.options.data = options;
	}
}

var lastDistance = 0; // calculate location to determine direction
 
$.newsList.addEventListener('scroll',function(e){
	if (OS_IOS) {
		var offset = e.contentOffset.y;
		var height = e.size.height;
		var total = offset + height;
		var theEnd = e.contentSize.height;
		var distance = theEnd - total;
	
		// going down is the only time we dynamically load,
		// going up we can safely ignore -- note here that
		// the values will be negative so we do the opposite
		if (distance < lastDistance) {
			// adjust the % of rows scrolled before we decide to start fetching
	
			if (total >= theEnd) {
				startUpdateNews(currentCategory);
			}
		}
		lastDistance = distance;
	}
	if (OS_ANDROID) {
		if ((e.firstVisibleItem + e.visibleItemCount) == e.totalItemCount) {
			startUpdateNews(currentCategory);
		}
	}
});

Ti.App.addEventListener("fcinter.newsUpdated", function(result){
	if(popup)popup.close();
	datasource = result.data;
	updateCategories();
	
	currentCategory = (currentCategory >= datasource.length) ? 0 : currentCategory;
	
	showNewsByCategory(currentCategory, true);
});

var onError = false;
Ti.App.addEventListener("fcinter.newsError", function(ea){
	if(onError) return;
	onError = true;
	
	LogManager.info("Error event: " + JSON.stringify(ea));
	var alert = Ti.UI.createAlertDialog({
		buttonNames : ['OK'],
		message : ea.error,
		title : 'ERRORE!'
	});
	alert.addEventListener("click", function(){
		onError = false;
		//if(OS_ANDROID) $.index.close();
	});
	alert.show();
	$.newsList.data = [Ti.UI.createTableViewRow({
		title : "Errore di connessione."
	})];
});

Ti.App.addEventListener("fcinter:loadAllNewsError", function(){
	if(popup) popup.close();
});

Ti.App.addEventListener("fcinter:loadAllNewsComplete", function(){
	if(popup) popup.close();
});

$.index.addEventListener('open', function(){
	Alloy.Managers.ConnectionManager.trackApplication("home");
	updateClick();
	
	displayAdv();
});

var closing = false;
//ask user to close this window on Android
$.index.addEventListener("androidback", function(e) {
	if($.newsPages.currentPage === 1){
		backClick();
	} else {
		if(closing) return;
		closing = true;
		
		var dialog = Ti.UI.createAlertDialog({
			cancel : 0,
			buttonNames : ['Annulla', 'Chiudi'],
			message : 'Vuoi chiudere l\'app?',
			title : 'Attenzione!'
		});
		dialog.addEventListener('click', function(e) {
			if (e.index === 1) {
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

function displayAdv(){
	var publisherId = OS_ANDROID? '/5902/fcinter/mobile_app_android': '/5902/fcinter/mobile_app_ios';

	//test case
	var random = Math.floor(Math.random() * 20) + 1;
	if( random === 20){
		LogManager.info('Random test adv');
		publisherId = OS_ANDROID? 'ca-app-pub-4666117465588141/6097002869' : 'ca-app-pub-4666117465588141/3422738069';
	} 
	
	LogManager.info('publisherId: ' + publisherId);

	if(adView){
		$.adContainer.remove(adView);
		adView = null;
	}
	
	adView = Admob.createView({
	    width: 320, height: 50,
	    publisherId: publisherId,
	    adBackgroundColor: 'white',
	    dateOfBirth: new Date(1981, 30, 5)
	});
	
	adok = false;
	adView.addEventListener('didReceiveAd', function() {
	    LogManager.info('Did receive ad!');
	    adok = true;
	});
	
	function toTestAdv() {
	    LogManager.info('Failed to receive ad! -> to test adv');
	
	    $.adContainer.remove(adView);
	    adView = null;
	    
	    adView = Admob.createView({
		    width: 320, height: 50,
		    publisherId: OS_ANDROID? 'ca-app-pub-4666117465588141/6097002869' : 'ca-app-pub-4666117465588141/3422738069',
		    adBackgroundColor: 'white',
		    dateOfBirth: new Date(1981, 30, 5)
		});
		
		$.adContainer.add(adView);
	};
	
	adView.addEventListener('ad_not_received', toTestAdv );
	adView.addEventListener('didFailToReceiveAd', toTestAdv );
	
	$.adContainer.add(adView);
}


var start = null;
$.newsDetail.addEventListener('touchstart', function(e) {
	try{
		start = e.source.convertPointToView({
			x : e.x,
			y : e.y
		}, $.index);
	} catch(ex) {
		//avoid errors
	}
});
$.newsDetail.addEventListener('touchend', function(e) {
	try{
		var end = e.source.convertPointToView({
			x : e.x,
			y : e.y
		}, $.index);
		
		if(!end) return; //avoid errors
	
		//if deltaX exceeds threshold and deltaY is less then threshold, it's a swipe.
		if (Math.abs(end.y - start.y) < 100) {
	
			if (start && end.x - start.x > 50)
				swipePrev();
			if (start && end.x - start.x < -50)
				swipeNext();
		}
		start = null;
	} catch(ex) {
		//avoid errors
	}
}); 

function swipeNext(){
	if( currentNewsIndex + 1 < datasource[currentDatasourceIndex].news.length ){
		LogManager.info("Load next news");
		currentNewsIndex++;
		$.newsDetail.animate({
			opacity : 0,
			duration : 150
		}, function(){
			$.newsDetail.setOpacity(0);
		});
		setCurrentDetailNews(
			datasource[currentDatasourceIndex].news[currentNewsIndex],
			"Carico la news successiva ...",
			true
		);
	} else {
		LogManager.info("No next news!");
		Ti.Media.vibrate();
	}
}
	
function swipePrev(){
	if( currentNewsIndex > 0){
		LogManager.info("Load prev news");
		currentNewsIndex--;
		setCurrentDetailNews(
			datasource[currentDatasourceIndex].news[currentNewsIndex],
			"Carico la news precedente ...",
			true
		);
		$.newsDetail.animate({
			opacity : 0,
			duration : 150
		}, function(){
			$.newsDetail.setOpacity(0);
		});
	} else {
		LogManager.info("No prev news!");
		Ti.Media.vibrate();
	}
}

if(OS_IOS){
	var control = Ti.UI.createRefreshControl({
	    tintColor:'#555'
	});
	control.addEventListener('refreshstart',function(e){
	    updateClick();
	});
	Ti.App.addEventListener("fcinter:updateComplete", function(e){
		control.endRefreshing();
	});
	
	$.newsList.refreshControl = control;
}

$.index.open();