//
//  ConnectionManager.js
//  Vettore.Mobile
//
//  Created by Leandro Macrini on 2013-06-01.
//  Copyright 2013 Leandro Macrini. All rights reserved.
//

var LogManager = Alloy.createController('business/LogManager');
//here we don't have the Alloy Globals instances

var htmlparser = require('/lib/htmlparser');
Ti.include('/lib/soupselect.js');
Ti.include('/lib/encoder.js');

_ = require('/lib/underscore')._;

var that = this;

/**
 * Make and call a HTTP Request with the given parameters
 *
 * @param {Object} parameters {URI, method, payload, loadingMsg, callback, errorCallback}
 */

var httpRequest = function(parameters) {

	if ( ! parameters ) throw "Invalid operation!";

	var popup = null;
	
	//create a loading popup if needed
	if (parameters.loadingMsg) {
		popup = Alloy.createController('LoadingPopup', {
			title : parameters.loadingMsg
		});
	}
	
	if (popup) popup.open();

	var client = Ti.Network.createHTTPClient({
		autoRedirect : false,
		onload : function(e) {
			if (popup) popup.close();
			if (parameters.callback) parameters.callback(e.source.responseText);
		},
		onerror : function (e) {
			if (popup) popup.close();
			
			//return KO
			LogManager.error("Http Request Connection Error: " + e.error);
		
			if (parameters.errorCallback) {
				//call the error callback
				parameters.errorCallback("Errore di connessione con il server.");
			} else {
				//display a default error dialog
				Ti.UI.createAlertDialog({
					buttonNames : ['OK'],
					message : 'Errore di connessione con il server.',
					title : 'Errore!'
				}).show();
			}
		},
		timeout : 10000
	});
	
	//doesn't work at creaction time //HACK
	client.setTimeout(10000);
	client.timeout = 10000;

	//handle 'GET' method appending key/value to URI and removing payload
	if (parameters.method == 'GET' && parameters.payload) {
		var values = [];
		for (var key in payload) {
			values.push(key + '=' + payload[key]);
		}
		parameters.URI = parameters.URI + '?' + values.join('&');
		parameters.payload = null;
	}

	client.open(parameters.method, parameters.URI);
	
	
	client.send(parameters.payload);
};

var loading = false;

/**
 * Load the news from the mobile site and parse the xhtml
 * @param {Function} callback
 */
var loadAllNews = function(callback) {
	if(loading){
		if(callback)callback(false);
		return;
	}
	loading = true;
	
	LogManager.info('loadAllNews');
	
	httpRequest({
		URI : 'http://m.fcinter1908.it/ricerca/?start=0&limit=499',
		method : "GET",
		errorCallback : function(error){
			loading = false;
			if(callback) callback(false);
		},
		callback : function(data) {
			var htmlparser = require('/lib/htmlparser');
			
			var handler = new htmlparser.DefaultHandler(function(error, dom) {
				if (error) {
					if(callback) callback(false);
					loading = false;
				} else {
					var newslist = soupselect.select(dom, '.list')[0];

					/*
					 *  [	Categoria (Ultime Notizie contiene TUTTE le news) { count, listed}
					 * 		[
					 * 			Giorno
					 * 			[
					 * 				News { title, category, url, image, *detail } (detail è disponibile solo dopo aver letto i dettagli dall'url)
					 * 			]
					 * 		]
					 * 
					 * 	]
					 */

					var sitenews = [];
					var lastDay = null;
					var patt = new RegExp("(..:..) (.+)"); //ora e categoria
					
					for(var i = 0; i < newslist.children.length; i++){
						var child = newslist.children[i];
						
						//giorni 
						if(child.attribs.class === "sezioni"){
							try{
								lastDay = child.children[0].data.replace("  "," ").replace("  "," ");
							} catch(ex){
								lastDay = null;
							}
							continue;
						}
						
						//notizie
						if(child.attribs.class === "list-item"){
							var snews = { day : lastDay };
							
							// BEST EFFORT
							try { snews.image = child.children[0].children[0].attribs.src; } catch (e) { }
							try { snews.hour = patt.exec(child.children[1].children[0].children[0].data)[1]; } catch (e) { }
							try { snews.category = patt.exec(child.children[1].children[0].children[0].data)[2]; } catch (e) { }
							try { snews.title = child.children[1].children[2].children[0].children[0].data; } catch (e) { }
							try { snews.url = 'http://m.fcinter1908.it' + child.children[1].children[2].attribs.href; } catch (e) { }
							
							sitenews.push(snews);
						}
					}
					
					//category separation
					var groups = _(_(sitenews).groupBy('category')).toArray();
					var data = [];
					
					//first category is Hard Coded "Ultime Notizie" with all news
					data.push({
						name : "Ultime Notizie",
						news : sitenews,
						count : sitenews.length,
						listed : 0
					});
					
					_(groups).each(function(group){
						data.push({
							name : group[0].category, //the category of the first
							news : group,
							count : group.length,
							listed : 0
						});
						group = _(group).groupBy('day');
					});
					
					//ultime notizie
					
					Ti.App.fireEvent('fcinter.newsUpdated', {data : data});
					if(callback) callback(data);
					loading = false;
				}
			}, { verbose: false, ignoreWhitespace: true });
			var parser = new htmlparser.Parser(handler);
			parser.parseComplete(data);
		}
	});
}; 

/**
 * Private method that recursivelly explore a dom element returning it's text
 */
function recursiveTextParser(element, currentText){
	if(element.data){
		currentText += element.data;
	}
	
	if(element.children && element.children.length > 0){
		_(element.children).each(function(children){
			currentText = recursiveTextParser(children, currentText);
		});
	}
	
	if(element.name === "p" || element.name === "br") currentText += "\n\n";
	
	return currentText;
};

/**
 * Load the details oh a single news
 * @param {Object} uri
 */
var loadSingleNews = function(news, callback) {
	httpRequest({
		URI : news.url,
		method : "GET",
		errorCallback : function(error){
			if(callback) callback(false);
		},
		callback : function(data) {
			var articolo;
			var handler = new htmlparser.DefaultHandler(function(error, dom) {
				if (error) {
					if(callback) callback(false);
				} else {
					articolo = soupselect.select(dom, '.articolo')[0];
					
					news.detail = { };
					
					//best effort
					try { news.detail.author = articolo.children[2].children[1].data.trim(); } catch (e) { }
					try { news.detail.fonte = articolo.children[2].children[4].data.trim(); } catch (e) { }
					try { news.detail.readers = articolo.children[2].children[6].data.trim(); } catch (e) { }
					try { news.detail.photo = articolo.children[3].children[0].children[0].attribs.src; } catch (e) { }
					try {
						news.detail.content = Encoder.htmlDecode(
								recursiveTextParser(articolo.children[3], "")
							.replace(/(<([^>]+)>)/ig,""));
					} catch (e) { }
					try{
						var video = soupselect.select(dom, "a[rel=nofollow]");
						if(video[0]){
							news.detail.video = video[0].attribs.href;
						}
					 } catch (e) { }
					if(callback) callback(news);
				}
			}, { verbose: false, ignoreWhitespace: true });

			var parser = new htmlparser.Parser(handler);
			parser.parseComplete(data);
		}
	});
};

var trackApplication = function(context){
	LogManager.info("trackApplication - context: " + context);
	
	var uri;
	if(OS_ANDROID) {
		if(context === "home")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.home,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "news")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.news,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "changecategory")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.changecategory,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
	} else {
		if(context === "home")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.home,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "news")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.news,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "changecategory")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.changecategory,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
	}
	try{
		httpRequest({
			URI : uri,
			method : "GET",
			errorCallback : function(error) { LogManager.error("trackApplication Error: " + error);}
		});
	} catch (ex) {
		LogManager.error("trackApplication catch Error: " + JSON.stringify(ex));
	}
	
};

var searchNews = function(value, data){
	var result = [];
	if(value && data) {
		for(var i = 1; i < data.length; i++){ //[0] is the all news category -> avoid redundant search
			if(!data[i].searched){ // if searched == true is a category from a search -> avoid redundant search 
				var news = data[i].news;
				for(var n = 0; news && n < news.length; n++){
					if(news[n].title && news[n].title.toLowerCase().indexOf(value.toLowerCase().trim()) > -1){
						result.push(news[n]); 
					}
				}
			}
		}
	}
	return {
		name : "Risultati ricerca",
		news : result,
		count : result.length,
		listed : 0,
		searched : true
	};
};

this.searchNews = searchNews;
this.httpRequest = httpRequest;
this.loadAllNews = loadAllNews;
this.loadSingleNews = loadSingleNews;
this.trackApplication = trackApplication;