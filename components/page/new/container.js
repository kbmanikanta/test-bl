exports.container = function($){

	return {
		title:"Select New Page Type",
		includes:[
			{name: "x-instructions", type:"blacklight/edit/page/instructions"},
		],

		childPages:"*"
	}
}
