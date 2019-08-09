/* globals module */

module.exports=function($, window){
	"use strict";
	var utils={};

	utils.prettyName = function(value, options){
		options=options||{};
		if(value && value.replace){
			value=value.replace(/\-|\_/g, " "); 
			if(options.allCaps){
				value=value.replace(/ [a-z]|^[a-z]/g, function(v){return v.toUpperCase();});
			}else{
				value=value.charAt(0).toUpperCase() + value.slice(1);
			}
			
			value=value.replace(/([a-z][A-Z])|[a-zA-Z][0-9]|[0-9][a-zA-Z]/g, function(v){return v.charAt(0) + " " + v.charAt(1);});
			return value;
		}else{
			return "";
		}	
	};

	return utils;
};