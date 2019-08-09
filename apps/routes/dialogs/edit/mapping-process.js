
// This route processes and validates raw bl:map data from the edit dialog, and returns easily-consumable name/value pairs (for the dialog to eventually post to sling).

var _=require("lodash");
var json5 = require("json5");
var flatten=global.bl.flattenObject;

module.exports.process=function(data,$,cb){
	"use strict";
	var {req, res} = $.express;

	var mapEntries = req.body.maps;
	console.log('mapEntries', mapEntries);
	var postFields=[];

	_.each(mapEntries, (mapEntry)=>{
	
		var keys = _.keys(mapEntry.fields);
		postFields.push({name:mapEntry.name + "@Delete", value:true}); 
		console.log('keys', keys);
		_.each(keys, function(key){
			var match=key.match(/^([^\_]*)\_type$/);
			if(match){
				let key=match[1];
				let prefix=mapEntry.name+"/" + key;
				let type=mapEntry.fields[key + "_type"];
				let typeValue=mapEntry.fields[key + "_type_value"];
				let jsonKey = key + "_json5";
				let jsonValue;
				if(_.includes(keys, jsonKey)){
					try{
						jsonValue = json5.parse(mapEntry.fields[jsonKey]);

					}catch(err){

					}
				}else if(mapEntry.fields[key + "_delete"]){
					postFields.push({name:prefix + "@Delete", value: true})
				}else{
					jsonValue= {error:"Some custom non-JSON submission"};
				}

				if(jsonValue){
					if(typeValue){jsonValue[type] = typeValue;}
					//postFields.push({name:prefix + "/" + type, value: typeValue});
					let vals=flatten(jsonValue, {prefix, slingArrays: true});
					vals = _.filter(vals, (val)=>!/^bl:map\/[^\/]*\/error$/.test(val.name));  // Filter out any auto-inserted bl-lookup error messages;  don't write those to disk.
					Array.prototype.push.apply(postFields, vals);
				}
			}
		})
	})

	res.json({status:"success", postFields });

	cb(null, false);
}