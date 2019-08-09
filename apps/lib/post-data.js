const SC = require("sling-connector");
const _=require("lodash");

const defaultSite = _.get(global.bl,["config","environment","defaultSite"]);
const defaultSC = new SC(_.get(global.bl.config,[defaultSite, "modes", "author", "sling"]));
const log = global.bl.logger.get("blacklight.post-data");

/*

The purpose of this queue is simply to post data to the indicated SC
*/

module.exports.maxRetries = 10; 
module.exports.retryInterval = 500; // 500 ms between retrying failed job
module.exports.taskInterval = 100; // 500 ms between queue processing

module.exports.process = (params, cb)=>{

	var {path, form , attempt} = params;
	let sc = defaultSC;


	if(!path || !form){
		cb('Insufficient data provided to the post-data queue');
	}else{
		let targetPath = path; 
		let formParams = form;

		let submitRequest = (touchErr)=>{

			if(touchErr){
				log.error("Couldn't touch. Not trying POST", {path, form});
				cb(touchErr);
			}else{
				log.debug('Attempting POST to ' + path);
				sc.post(targetPath, formParams, (err)=>{
					if(err){
						if(attempt < module.exports.maxRetries){
							log.warning(`Failed to POST to ${path} on attempt ${attempt}`);
						}else{
							log.error(`Failed to POST to ${path} on attempt ${attempt}`, {targetPath, formParams});
						}
					}

					cb(err); 
				});
			}
			
		};

		/**************************
		 * Removing all of this code around touching for now.
		 * I think it's ultimiately overkill now that there's a 100ms
		 * delay between posts. 
		 */
		//we only want to go with the touch approach when we're under or on a page
		// if(_.includes(targetPath, "/jcr:content")){
		// 	//do a 'touch' to ensure there are no current conflicts
		// 	let jcrPath = targetPath.split('/jcr:content')[0] + '/jcr:content'; 
		// 	//first ensure the path exists
		// 	sc.getSling(`/bin/exists.json?path=${jcrPath}`, (err, data) => {
		// 		if (!data || !data.exists) {
		// 			log.debug(`${jcrPath} doesn't exist. Not touching.`);
		// 			//page doesn't exst, can't touch
		// 			submitRequest();
		// 		}else{
		// 			log.debug(`${jcrPath} exists. Touching.`);
		// 			//make sure all is good before proceeding
		// 			module.exports.touch(sc, jcrPath, submitRequest); 
		// 		}
		// 	});
		// }else{
			submitRequest(); 
		// }
	}



}; 

//keep retring saving to the path until success, or until 30 seconds has passed
module.exports.touch = (sc, path, touchCb, attempt) => {
	attempt = attempt || 0; 
	
	if(attempt < 60){
		sc.post(path, {'bl:touch': (new Date()).getTime() + ""}, (err)=>{
			if(!err){
				log.debug(`Successfully touched ${path} on attempt ${attempt}`);
				touchCb();
			}else{
				setTimeout(()=>{module.exports.touch(sc, path, touchCb, attempt + 1)}, 500);
			}
		});
	}else{
		let touchErr = `Failed to successfully touch ${path} after 60 attempts`;
		log.error(touchErr)
		touchCb(touchErr);
	}
	
}