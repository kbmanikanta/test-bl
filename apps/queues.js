var SC = require("sling-connector");
var restubFromBlQuery = require("./lib/restub-from-blquery");
var restubFromMove = require("./lib/restub-from-move");
var postData = require("./lib/post-data");
var performMigration = require("./lib/migrations").performMigration;
const _=require("lodash");
const log = global.bl.logger.get("blacklight.queues");

var queues = module.exports;
var config=global.bl.config;
var slingConnectors={};
var mixins=/"jcr:mixinTypes/g ;
var docx=/":docx/g ;
var jcrIndex=/\[(\d)\]\"\:/g;




// TODO:  store details of source connection
// TODO:  you need a model for impersonating users who instigated the requests, right?


/*************************************************************************************************/
queues.transfer={

	description: "Queue for transfering data from one Sling instance to another",

	displayMap: (task, taskPrototype)=>{
		var targetSC = getTargetSC(taskPrototype.target);
		return {title:task.url, link: targetSC.baseUri.replace(/\/$/,"") + task.url + "/jcr:content.infinity.json"}
	},

	on:{
		process:(task, job, cb)=>{
			if(!task.target){cb("Error: no 'target' Sling server specified in task.");return;}
			var targetSC = getTargetSC(task.target);

			var sourceSC=_.get(global.bl.config,[task.sourceSite,"modes",task.sourceMode, "sling"]);
			sourceSC = new SC(sourceSC);

			log.debug("Transfering: ", task.url, "to", targetSC.baseUri);

			var path = task.url.replace(/\/$/,"") + "/jcr:content"
			var sourcePath = path + ".infinity.json";
			


			sourceSC.getSling(sourcePath, {dontParseBody:true, leaveMangledNames:true}, function(err, data){
				if(err){cb({message:"ERROR replicating:" + sourcePath, error: err}); return;}

				// data = data.replace(dropNamespaceRegex,"\"");
				// data = data.replace(stashNamespaceRegex,function(match,p1){return "\"_" + p1 + "_"});
				data = data.replace(mixins,"\"_jcr_mixinTypes");
				data = data.replace(docx,"\"_docx");
				data = data.replace(jcrIndex, "_$1\":");

				targetSC.import(path,data,{}, function(err, result, resp, respBody){
					if(err){
						log.error("Transfer error: ", path, "\n", data, "\nErr:",err,"\n");
						cb({message:"ERROR replicating:" + sourcePath, error: err}); return;
					}
					cb(null, targetSC.baseUri + sourcePath)
				})

			})
		},

		complete:(err, task, job, results)=>{
			if(err){
				log.error("Back in bl.edit.queue.js.  Transfer failed:", err);
			}else{
				log.info("OK.  Back in bl.edit.queue.js.  Transfer complete for job:",job.id);
			}
		}
	}
}








/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/
queues["mapped-stubs"]={

	description: "Queue for updating data-mapped stubs based on changes to collection data",


	displayMap: (task, taskPrototype)=>{
		return {title:task.path, link: task.path}
	},

	on:{
		process:(task, job, cb)=>{
			restubFromBlQuery({blQueryPath: task.path}, cb);
		},

		complete:(err, task, job, results)=>{
			if(err){
				log.error("mapped-stub queue failed when processing changes to collection data:", err);
			}else{
				log.info("mapped-stub job complete, id:",job.id);
			}
		}
	}
}

/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/
queues["mapped-stubs-rename"]={

	description: "Queue for updating data-mapped stubs based on collections items being renames",


	displayMap: (task, taskPrototype)=>{
		return {title:task.path, link: task.path}
	},

	on:{
		process:(task, job, cb)=>{
			restubFromMove({moveInfo: task.move}, cb);
		},

		complete:(err, task, job, results)=>{
			if(err){
				log.error("rename mapped-stub queue failed:", err);
			}else{
				log.info("mapped-stub job complete, id:",job.id);
			}
		}
	}
}



/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/
queues["post-data"]={

	description: "Queue for POSTing data to a sling connector",


	displayMap: (task, taskPrototype)=>{
		return {title:task.path, link: task.path}
	},

	on:{
		process:(task, job, cb)=>{
			postData.process({path: task.path, form: task.form, attempt: task.attemptCount}, cb);
		},

		complete:(err, task, job, results)=>{
			if(err){
				log.error(`post-data queue failed after ${task.attemptCount + 1} attempts:`, err);
			}else{
				log.info(`post-data job complete on attempt ${task.attemptCount + 1}, id:`,job.id);
			}
		}
	}, 
	config: {
		maxRetries : postData.maxRetries, 
		retryInterval : postData.retryInterval, 
		taskInterval: postData.taskInterval
	}

}


/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/
queues.migrations={

	description: "Queue for migrating resource-types from an older to a newer schema version",


	displayMap: (task, taskPrototype)=>{
		// For migration display, you should link to the item that has been changed.  Like "/path/to/mything.infinity.json"		
		return {title:task.path, link: task.path}
	},

	on:{
		process:(task, job, cb)=>{
			performMigration(task, cb);
		},

		complete:(err, task, job, results)=>{
			if(err){
				log.error("migrations job failed:", job.id, err);
			}else{
				log.info("migrations job complete, id:", job.id);
			}
		}
	}
}






/*************************************************************************************************/
function getTargetSC(targetSlingId){
	var targetSC=slingConnectors[targetSlingId];

	if(!targetSC){
		var targetConfig=config.environment.slings[targetSlingId];
		targetSC=new SC(targetConfig);
		slingConnectors[targetSlingId]=targetSC;
	}
	return targetSC
}
