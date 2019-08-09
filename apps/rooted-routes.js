
var proxy = require("./routes/proxy.js");
var _=require("lodash");
var os = require('os');
var ipInfo=null;


module.exports = function(options){
	var router=options.express.Router();
	var defaultSite = _.get(global.bl,"config.environment.defaultSite");
	var appsMount = _.get(global.bl, ["config",defaultSite,"appsMount"]);

	////////////////////////////////////////////////////////////////////////////////////
	router.all("/pm", function(req, res, next){	
		var config=req.bl.config;
		req.url = config.appsMount + "blacklight/edit/page-manager";
		next('route');
	});


	////////////////////////////////////////////////////////////////////////////////////
	router.all("/bl", function(req, res, next){	
		var config=req.bl.config;
		req.url = config.appsMount + "blacklight/edit/home";
		next('route');
	});


	////////////////////////////////////////////////////////////////////////////////////
	router.get("/libs/granite/csrf/token.json", function(req, res, next){
		proxy.process(null,{express:{req, res}},function(){});
	});

	////////////////////////////////////////////////////////////////////////////////////
	router.get("/bin/typeahead.*", function(req, res, next){
		proxy.process(null,{express:{req, res}},function(){});
	});

	////////////////////////////////////////////////////////////////////////////////////
	router.all(/^\/bin\/|^\/libs\/|^\/system\//, function(req, res, next){
		if(req.authorization){
			var $={express:{req, res}};
			proxy.process(null,$,function(){});
		}else{
			res.status(403).send("Unauthorized");
		}

	});



	return router;
	
};
