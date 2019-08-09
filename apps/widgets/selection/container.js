exports.container = function($){
	return {
		title: "Selection",
		includes:[
			{name: "options", type:"foundation/components/parsys",  title:"Select Options",
				eccItems:"blacklight/develop/widgets/selection/option"
			},
		]
	}
}
