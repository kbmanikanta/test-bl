var santitize = global.bl.santitize;



/*********************************************************************************************/
module.exports = function (data, $, cb) {
	if ($.mainExtension === "json") {
		$.express.res.json(data);
		console.log("page-type.js:", santize.log(data), "\n", santitize.log(Object.keys($)));
		cb(null, false);
	}



	cb();
}







		// * Send path of page.
		// * option: page exists, is current name allowed?  and if so what type is allowed to be assigned?
		// * default: page does not exist, so tell me what types are allowed, and auto-name where possible, once a type is chosen.  also, create interstitial pages (e.g. hubs) if necessary

