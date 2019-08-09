var _=require("lodash");

var removeBlQuery = /(.*)\/bl:query/;
var log=global.bl.logger.get("bl-edit.query-mapping");
var config = global.bl.config.environment; 

/**
	This route provides an end point for the sling "collections" observer
	The posted observer message contains "updates"  and  "deletes" for given property paths
	In response to collection data source changes, *all* remote subscribers that map back to this source will be re-stubbed
	
**/

exports.process=function(model, $, cb){
	var req=$.express.req, res=$.express.res;
	var SC=req.bl.sling;
	var collections = global.bl.collections;
	var message=$.express.req.body;
	var errorEncountered=false;
	var updatedCollectionItems = [];
	const postQueue = global.bl.queues.get("blacklight.edit.post-data");
	var renameQueue = global.bl.queues.get("blacklight.edit.mapped-stubs-rename");
	log.info('query-mapping message', message);

	// console.log("RECIEVED MESSAGE:", JSON.stringify(message,null,"  "));

	// Filter out observer messages to only look at page-level sling:resourceType or jcr:title changes
	let moveTasks = []; 
	_.each(message.moves, (move)=>{
		//ex: 
		/*
		{ 
			originalPath: '/content/fshr/collections/en/properties/dallas/offers/caleb_offer',
       		newPath: '/content/fshr/collections/en/properties/dallas/offers/caleb_offer-moved',
			distanceMoved: 0 
		}
		*/
		//if the distance moved was just 0, the this is a rename
		if(move.distanceMoved === 0){
			moveTasks.push({move});
		}else{
			//otherwise an item was structurally move. Treat this as an add / delete
			message.deletes.push({path: move.originalPath, property: 'jcr:primaryType'});
			message.updates.push({path: move.newPath, property: 'jcr:primaryType', created: true});

		}

	}); 

	if(moveTasks.length){
		renameQueue.makeJob(moveTasks,(err,job)=>{
			if(err){log.error("Couldn't add job to 'mapped-stubs-rename' queue", err);}
			else{
				log.info("Success adding job to 'mapped-stubs-rename' queue:", job.id);
			}
		});
	}else{
		log.info("Query-mapping.js: No renaming in response to observer message.");
	}


	_.each(message.updates, (update)=>{
		let collectionPath = update.path.split('/jcr:content')[0];
		if(!updatedCollectionItems.includes(collectionPath)){
			updatedCollectionItems.push(collectionPath);
		}
		if (update.path.includes('sling:resourceType')) {
			const componentPath = update.path.split('/sling:resourceType')[0];
			if(!updatedCollectionItems.includes(componentPath)){
				updatedCollectionItems.push(componentPath);
			}
		}

	})


	_.each(updatedCollectionItems, (path)=>{
		findAllReferencesToPath(path);
	});


	if(!errorEncountered){
		//collapse deletes down to list of collection paths. do this by removing the property
		//modified from the path, then taking everything before jcr:content
		var alreadyTracked = {}; 
		var collapsedDeletes = _.filter(_.map(message.deletes, function(item){
			return item.path.slice(0, -1 * (item.property.length + 1)).split('/jcr:content')[0];
		}), (collectionPath)=> {
			if(alreadyTracked[collectionPath]) {
				return false; 
			}else{
				alreadyTracked[collectionPath] = true; 
				return true; 
			}
		});
		_.each(collapsedDeletes, (curDelete)=>{
			findAllReferencesToPath(curDelete);
			// console.log("bl-edit-query-mapper:delete:", curDelete)
			// TODO: build a query where path "starts with" the deleted path.
			// SC.getSling();
		});	
	}
	


	/////////////////////////////////////////////////////////////////////////////////////////////
	function findAllReferencesToPath(path){
		var col=collections.testPath(path);
		if(col){
			var curPath = col.pathTemplate;
			var queries=[curPath];
			var paramKeys=_.keys(col.params);

			_.each(paramKeys, (param)=>{
				// console.log("REPLACE:", `/-${param}/`);
				curPath=curPath.replace(`/-${param}/`, `/${col.params[param]}/`);
				queries.push(curPath);
			});
			queries.reverse();

			
			if(SC.queryType === 'loki'){
				var query = {value:{$in:queries}};
				var url = "/bin/indexes/query/bl:query?query=" + global.escape(JSON.stringify(query))
				SC.getSling(url,{leaveMangledNames:true}, (err, matches)=>{
					if(err){log.error("Couldn't query Sling service using Loki protocols", err);}
					else{
						restubMatches(matches);
					}
				});
			}else{
				let queryRoots = config.blQueryRoots || ["/content"];
				queryRoots = _.isArray(queryRoots) ? queryRoots : [queryRoots];
				let rootsPredicate = _.map(queryRoots, (root)=> {return ` ISDESCENDANTNODE([${root}]) `}).join(' OR '); 
				var url = `/content.custom-query.json?statement=SELECT * FROM [nt:base] WHERE [bl:query] IN("${queries.join('" ,"')}") AND (${rootsPredicate})&queryType=JCR-SQL2&property=bl:query@Named[value]`;
				SC.getSling(url,{leaveMangledNames:true}, (err, matches)=>{
					if(err){log.error("Couldn't query Sling service", err);}
					else{
						_.each(matches, (result)=>{result.path=result['jcr:path'] + '/bl:query'; delete result['jcr:path']; });
						restubMatches(matches);
					}
				});
			}
		}

	}


	////////////////////////////////////////////////////////////////////////////
	function restubMatches(matches){
		var tasks={prototype:{}, tasks:[]}
		_.each(matches,(match)=>{
			var isBlQuery = (match && match.path) ? match.path.match(removeBlQuery) : null;
			if(!isBlQuery){ log.error("Unexpected query result format:", match); return false;}
			else{
				tasks.tasks.push({
					path:match.path.replace('/bl:query', ''),
					form: {"bl:processing": "true"}
				})
			}

		});

		if(tasks.tasks.length){
			postQueue.makeJob(tasks,(err,job)=>{
				if(err){log.error("Couldn't add job to 'post-data' queue", err);}
				else{					
					log.info("Success adding job to 'post-data' queue:", job.id);
				}
			});
		}else{
			log.info("Query-mapping.js: No new restubbing in response to observer message.");
		}

	}



	$.express.res.json({result: "ok"});
	cb(null, false);



};

exports.async=false;

