const SC = require("sling-connector");
const _=require("lodash");

const defaultSite = _.get(global.bl,["config","environment","defaultSite"]);
const defaultSC = new SC(_.get(global.bl.config,[defaultSite, "modes", "author", "sling"]));
const config = global.bl.config.environment; 
const log = global.bl.logger.get("blacklight.restub-move");

/*

This whole queue is here to deal with collection items that have been renamed

In this case we don't want to fully delete and recreate new entries as any content
manually entered on the stubs would be lost. 

Instead we can handle this by just: 

1. Updating any bl:ref that point to the old path
2. Updating any bl:autoStubbed that point to the old path 
3. Updating the actual node names housing the bl:autoStubbed, if they matched the old
*/

module.exports = function restubFromMove(params, cb){
	var {moveInfo, sc} = params;
	sc = sc || defaultSC;

	log.debug('made it to the restubFromMove', moveInfo); 

	if(moveInfo && moveInfo.originalPath && moveInfo.newPath && moveInfo.distanceMoved === 0){
		let originalNodeName = _.last(moveInfo.originalPath.split('/'));
		let newNodeName = _.last(moveInfo.newPath.split('/'));

		let updates = []; 
		let renames = []; 


		////////////////////////////////////////
		let buildQueryUrl = (prop)=>{
			let queryRoots = config.blQueryRoots || ["/content"];
			queryRoots = _.isArray(queryRoots) ? queryRoots : [queryRoots];
			let rootsPredicate = _.map(queryRoots, (root)=> {return ` ISDESCENDANTNODE([${root}]) `}).join(' OR '); 
			
			return `/content.custom-query.json?statement=SELECT * FROM [nt:base] WHERE [${prop}]='${moveInfo.originalPath}'AND (${rootsPredicate})&queryType=JCR-SQL2&property=${prop}`;
		};


		/////////////////////////////////
		let executeQueryFor = (options, queryCb)=>{
			let {prop, additionalProcessing} = options; 

			/////////////////////////////
			let addUpdate = (path, prop, oldVal)=>{
				updates.push({path, prop, updatedValue: oldVal.replace(moveInfo.originalPath, moveInfo.newPath)});
			};

			let url = buildQueryUrl(prop);
			sc.getSling(url,{leaveMangledNames:true}, (err, matches)=>{
				if(err){
					log.error("Couldn't query Sling service for " + prop, err); 
					queryCb(err);
				}else{
					if(matches.length){
						_.each(matches, (result)=>{
							let path = result['jcr:path']; 
							addUpdate(path, prop, result[prop]);

							if(additionalProcessing){
								additionalProcessing(result);
							}
						});
					}else{
						log.warning('No ' + prop + ' entries found for this move');
					}
				}

				queryCb(); 
			});
		};


		/////////////////////////////
		let doneQuerying = (err)=>{
			log.debug('done querying: ', {err, updates, renames});
			if(err){
				cb(err)
			}else{
				//do all the updates then rename, in that order
				let allOperations = _.concat(updates, renames); 

				let nextOp = ()=>{
					if(allOperations.length){
						let curOp = allOperations.shift();
						let formParams = {}, slingTarget; 
						if(curOp.prop){
							formParams[curOp.prop] = curOp.updatedValue;
							slingTarget = curOp.path; 
						}else{
							formParams[':operation'] = 'move'; 
							formParams[':dest'] = curOp.to; 
							slingTarget = curOp.from;
						}
						log.debug('post info', {slingTarget, formParams});
						sc.post(slingTarget, formParams, (err)=>{
							if(err){
								cb(err);
							}else{
								nextOp();
							}
						});
					}else{
						//done!
						cb();
					}
				}

				nextOp(); 
			}
			
		};


		//unfortunately doing a query for both at the same time breaks the indexes
		let finishedQuery = _.after(2, doneQuerying);

		executeQueryFor({prop: 'bl:ref'}, finishedQuery);
		executeQueryFor({prop: 'bl:autoStubbed', additionalProcessing: (result)=>{
			let path = result['jcr:path'];
			let pathParts = path.split('/');
			let pageMode = result.name === 'jcr:content';

			let oldStubPrefix = pathParts.splice(0, pathParts.length - (pageMode ? 2 : 1)).join('/');
			let oldStubbedNodeName = pathParts[0];  

			log.debug('looking for rename', {path, oldStubPrefix, oldStubbedNodeName});
			if(oldStubbedNodeName === originalNodeName){
				renames.push({from: `${oldStubPrefix}/${originalNodeName}`, to: `${oldStubPrefix}/${newNodeName}`});
			}
		}}, finishedQuery);
		
	}else{
		cb('Received invalid moveInfo: ' + _.toString(moveInfo));
	}

}; 
