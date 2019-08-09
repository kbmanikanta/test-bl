const _=require("lodash");

module.exports.process = function(data, $, cb){
	const res = $.express.res;
	const req = $.express.req;
	const sc = req.bl.sling; 
	const slingPath=req.query.slingPath;

	let pageResults = []; 

	const sendResults = ()=>{
		res.json(pageResults);
		cb(null, false);
	};

	if(slingPath && _.includes(slingPath, 'jcr:content')){
		sc.getSling(slingPath + '.infinity.json', (err, slingData)=>{
			let rType = _.get(slingData, '_sling_resourceType');

			if(!err && rType){

				if(rType === 'foundation/components/parsys'){
					//just list out every result
					let index = 0; 
					_.each(slingData, (entry, nodeName)=>{
						const compResType = entry['_sling_resourceType']; 
						if(_.isPlainObject(entry) && compResType){
							//need the title of the component
							var comp=$.componentRegistry.get(compResType); 
							if(comp){
								pageResults.push({path: slingPath + "/" + nodeName, title: (comp.title || comp.type) + ' (' + index + ')', indexable: slingPath + "/-" + index});
								index++; 
							}
						}
					});
				}else{
					//get that component type
					var comp=$.componentRegistry.get(rType)

					//get all of the includes
					//get the include types and recurse down
					_.each(_.get(comp, 'container.includes'), function(include){
						if(include.name && _.get(slingData, include.name.split('/'))){
							pageResults.push({path: slingPath + "/" + include.name, title: include.title || _.get($.componentRegistry.get(include.type), 'title') || include.name});
						}
					}); 
				}
				
			}

			sendResults();
		});
				
	}else{
		sendResults();
	}

	
	


}