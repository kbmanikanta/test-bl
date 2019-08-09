
var _=require("lodash");

module.exports.process=function(data, $, cb){
	var parts=$.page.action.split("/");
	var queueName = parts[0], action=parts[1];
	var req=$.express.req, appsMount = req.bl.config.appsMount;
	var apiRoot = appsMount + "blacklight/edit/queues";
	var path=apiRoot + req.path;

	if($.page.extension!=="json"){
		data.scripts.js.pop(); // remove edit-page-bundled.js
		global.bl.processScripts.addScript($, "blacklight/edit/css/blacklight.css");
		data.scripts.js.push(req.bl.config.publicMount + "blacklight/edit/js/queue-client.js");
	}

	var queue = global.bl.queues.get(queueName);
	if(!queue){cb(`Could not find queue named '${queueName}'`);return;}
	if(action==="status"){
		queue.getStatus((err, status)=>{
			data.description = queue.description;
			data.title = global.bl.prettyName(queueName.split(".").pop());
			data.eventsLink = path.replace(/\/status(\.json)?$/,"/events$1")
			data.status={};
			_.each(queue.status,(s, state)=>{
				data.status[state]=_.map(s.jobs,(id)=>({id,link:`${apiRoot}/j/${queueName}/${id}/status${$.page.extension?"."+$.page.extension:""}`}));

			})
			cb();
		});
	}else{
		cb("event action not supported yet.")
	}

}
