var _path = require("path");
var fs = require("fs");
var _=require("lodash");
var log = global.bl.logger.get("blacklight.edit.widget");

/// each widget contains  a configProcessor, field-template, content-template and any other named templates in the folder

module.exports = function widgetLoader(options){
	var hb=options.hb;

	return function loadWidget(widgetRoot, name){
		var widget={
			name: name, 
			compiled: {},
			templates:{
				content:"{{#if config.name}}\\{{ {{config.name}} }}{{else}}No 'name' found in widget config '" + name + "'{{/if}}", 
				field:"Widget '" + name + "' has no field template"}
		};

		var root=_path.join(widgetRoot, name) + "/";

		widget.path=root;

		var processorPath = root + name + ".js";

		if(fs.existsSync(processorPath)){
			widget.processor = require(processorPath);				
		}


		var names=fs.readdirSync(root);
		names.forEach(function(name){
			var cur=name.match(/(.*)\.hbs$/);
			if(cur){
				var templateText = fs.readFileSync(root + "/" + name).toString();
				widget.templates[cur[1]] = templateText;
				if(widget.processor && widget.processor.makePartials){
					hb.registerPartial(widget.name + "." + cur[1] ,templateText);
				}
			}
		});


		///TODO: clarify division of responsibilities between "getcompiledtemplate" and "rendermetatemplate" + "templatesfromconfig" 

		/////////////////////////////////////////////////////////////////////////////
		widget.templatesFromConfig=function(config){
			var templates={};
			if(widget.processor && typeof(widget.processor.processConfig)==="function"){
				config=widget.processor.processConfig(config, {widget:widget,templates:widget.templates, registry:options.registry});
			}

			templates.field = widget.renderMetaTemplate(widget.templates.field, widget.path + "field.hbs", config);
			templates.content = widget.renderMetaTemplate(widget.templates.content, widget.path + "content.hbs",  config);

			return templates;

		}



		///////////////////////////////////////////////////////////////////////////////////
		widget.renderMetaTemplate = function(templateText, sourceURL, configData){
			try{
				var metaCompiled = hb.compile(templateText);

				//TODO:  taking publicMount and appsMount from global.bl (see below) is not so good
				return metaCompiled({config: configData, blConfig:{publicMount:global.bl.publicMount, appsMount: global.bl.appsMount}});
			}catch(err){
				err.message = "Problem with HBS template at " + sourceURL + "\n" + (err.message?err.message:"")
				throw err;
			}
		}


		///////////////////////////////////////////////////////////////////////////////////
		widget.getCompiledTemplate = function(templateId){
			if(!widget.compiled[templateId]){
				try{
					 widget.compiled[templateId]=hb.compile(widget.templates[templateId]);
				}catch(err){
					err.message = "Problem building stage 2 HBS template at " + widget.path + templateId + ".hbs" + "\n-------------------------------------\n"  + (err.message?err.message:"")
					throw(err);
				}			
			}

			return function(data){
				try{
					return widget.compiled[templateId](data);
				}catch(err){
					var lines = widget.templates[templateId].split("\n");
					var numbered=_.map(lines, function(line, idx){return (("000"+(idx+1)).slice(-4)) + ":  " +  line;  });
					err.templateText=numbered.join("\n");
					err.message = "Problem running stage 2 HBS template at "  + widget.path + templateId + ".hbs"  + "\n-------------------------------------\n"  + (err.message?err.message:"");
					log.error(err.message);
					throw(err);
				}
			}
		}


		return widget;
	}



	/****************************************************************************/
	/****************************************************************************/
	/****************************************************************************/

}









