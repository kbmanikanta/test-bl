
var _url=require("url");
var httpSecure=require("https");
var httpInsecure=require("http");
var log = global.bl.logger.get("blacklight.edit:proxy");
var _=require("lodash");
var authorUrls={};



module.exports.process = function(data, $, cb){

	var client_req = $.express.req;
	var client_res = $.express.res;
	var overrides=[], foundOverride=false;

	var path=client_req.path.replace(/\/\//g,"/").replace(/^\/proxy\//,"/");

	// var routeMount = client_req.bl.config.appsMount + "blacklight/edit/proxy"

	// if(path.indexOf(routeMount)===0){
	// 	path=path.slice(routeMount.length)
	// }

	client_req.url=path;
	
	var blHelpers = _.get(global, "bl.sites.blacklight.helpers");
	var siteHelpers = _.get(global, "bl.sites." + $.express.req.bl.site + ".helpers");
	
	if(blHelpers.editProxyOverride){
		overrides = blHelpers.editProxyOverride();
	}

	if(siteHelpers.editProxyOverride){
		var siteOverides = siteHelpers.editProxyOverride();
		if(siteOverides){overrides = overrides.concat(siteOverides);}
	}

	_.each(overrides, (override)=>{

		if(path.match(override.path)){
			foundOverride=true;
			if(typeof override.path === "string"){override.path = new RegExp(override.path);}

			if(override.proxyRewrite){
				var rewritten=path.replace(override.path,override.proxyRewrite);
				$.express.req.url = rewritten;
			}
			override.proxy($.express.req, $.express.res, $.express.next);
			cb(null, false);
			return false;
		}
	});

	if(foundOverride){return;}

	var authorSling = $.express.req.bl.sling;
	var authorUrl=_url.parse($.proxyHost || authorSling.baseUri);

	var host= authorUrl.hostname;
	var proxyUri = authorUrl.protocol + "//" + host  + (authorUrl.port?(":"+authorUrl.port):"") + path;
	var clientUrl =_url.parse(client_req.originalUrl);
	var isHttps = authorUrl.protocol==="https:";
	var port = authorUrl.port || (isHttps?443:80);

	var http=isHttps?httpSecure:httpInsecure;


	client_req.headers.host=host;

	var options = {
	 hostname: host,
	 port: port,
	 path: path + (clientUrl.search?clientUrl.search:""),
	 method: client_req.method,
	 headers: client_req.headers,
	 rejectUnauthorized: false
	};


	if(!client_req.authorization){
		options.auth = authorSling.username + ":" + authorSling.password;
	}

	if($.excludeAuth){
		delete options.auth;
	}
	
	// console.log("PROXY_REQUEST:", options);
	log.info("Proxying: ", proxyUri);

	// console.log("PROXY TO:", options);

	var proxy = http.request(options, function (res) {
		if(!client_res.headersSent){
			client_res.writeHead(res.statusCode, res.headers);
		}

		res.pipe(client_res, {
			end: true
		});
	});


	client_req.pipe(proxy, {
	 end: true
	});

	proxy.on("error", (err)=>{
		log.error("Could not proxy to:", proxyUri, err);
	})

	cb(null, false);
}





