
const _ = require('lodash');

module.exports.process=function(data, $, cb){
	data.referenceMode=true; 
	
	const req=$.express.req;
	const res=$.express.res;
	const sc = req.bl.sling;


	const slingPath=req.query.slingPath;

	if(slingPath){
		let url = slingPath; 
		let forceMetaType = false; 
		
		if(!_.includes(slingPath, 'jcr:content')){
			url += '/jcr:content'; 
			forceMetaType = true; 
		}

		sc.getSling(url + '.infinity.json',{leaveMangledNames:true}, (err, slingData)=>{

			if(slingData && forceMetaType){
				var metaType = "blacklight/edit/page/resource-type"; 
				var rtype = slingData['sling:resourceType'];

				if(rtype){
					var pageComponent=$.componentRegistry.get(rtype); 

					if(pageComponent){
						var rTypeParts = rtype.split('/');
						//is there a meta dialog defined for:
						var discoveredMetaType =
							//this page?
							_.get(pageComponent, 'container.metaType') ||
							//this module?
							_.get(global.bl.modules.modelHelpers, _.join([rTypeParts[0], rTypeParts[1], 'pageMetaType'],'.')) ||
							//this site?
							_.get(global, 'bl.sites.' +rTypeParts[0] + '.helpers.pageMetaType') ||
							//default
							metaType;
					}
				}
					
				slingData['sling:resourceType'] = _.isFunction(metaType) ? metaType($) : metaType;
			}

			if(slingData['sling:resourceType']){
				data.slingData = slingData;
			}

			cb(false)
		}); 
	}else{
		cb(false);
	}

}