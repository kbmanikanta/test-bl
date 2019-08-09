var _=require("lodash");


/* TODO: Make sure appsMount is in the right format (leading and trailing / ... just use global.bl.appsMount ?)
	TODO: Make sure body parser is present (around line 124, check that req.body actually exists if method==POST)
	TODO: "User page" redirect, if 127.0.0.1/localhost but address bar is not, replace 127.0.0.1 w/ address domain ... or total proxy?
	TODO: Some easy way to debug if the authenticate plugin is in fact in the stream. (DEBUG:auth)
	TODO: The bodyParser is interfering with any BL-proxying that needs to happen.  bodyParsing should only happen conditionally (suggesting "sign-in" URL is needed).
	TODO: Also, all bl-proxies should be moved to "rooted-routes" so that built-in bodyParsing on "regular-routes" doesn't interfere.
*/

module.exports = function(options){
	options = options || {};
	var paths = {signOut: options.appsMount + "blacklight/edit/sign-out"};
	var signOutRegex = new RegExp("^" + paths.signOut)
	var blCookieName = "bl-auth";
	var slingCookieName = options.slingCookieName || "sling.formauth";
	var passwordParam = "bl-pass";
	var userParam = "bl-user";

	var slingAuthenticator = {options: {passwordParam, userParam, slingCookieName, paths}};

	if(!options.secret){throw new Error("Required param `options.secret` not provided to slingAuthenticator()");}
	if(!options.appsMount){throw new Error("Required param `options.appsMount` not provided to slingAuthenticator()");}
	var cookieParser = require("cookie-parser")(options.secret);
	// var authPaths = "^" + options.appsMount + "blacklight/|^/pm";
	// var authPathRegex = new RegExp(authPaths);
	var sessionExpireMins = options.sessionExpireMins || 29;
	var cookieRefreshIntervalMins = options.cookieRefreshIntervalMins || 5;
	var signOutRedirect = options.signOutRedirect || (options.appsMount + "blacklight/edit/home/");

	slingAuthenticator.authenticate = function(req, res, next){
		var didUpdateBroswerCookie=false;

		// TODO:  Add a "basic-auth" mode where if basic auth info is present, it overrides cookie auth, and gets passed through to Sling instead.  Useful for calling BL from curl, etc.  Note: never prompt for basic auth.
		// TODO:  Send json and status code, when there's a json extension.  Maybe send an image too.
		// TODO:  Nonce or some other securing mechanism for the sign-in form
		// TODO:  Move sling-authenticator.js out:  move into blacklight-render or blacklight-edit?
		// TODO:  bl-cli: setup to include user and ACE manager bundles, and to set initial admin password, etc.
		// TODO:  stash a bit more user info (full name, email) into the cookie.
		// TODO:  Maybe an entropy-sling bundle helper for user attributes?  Or possibly the restful service works?
		//						http://sling.apache.org/site/managing-users-and-groups-jackrabbitusermanager.html
		//						http://127.0.0.1:4503/system/userManager/user/tracey.tidy.1.json

		// if(!req.path.match(authPathRegex)){next(); return;}

		if(req.cookies){throw new Error("Cookies were already parsed before the slingAuthenticator(), leaving no way to ensure the correct secret is being used.  Please let the slingAuthenticator() parse cookies.");}
		

		cookieParser(req, res, function authenticate(){
			var path=req.path;

			// Request to sign out
			if(path.match(signOutRegex)){
				res.clearCookie(blCookieName);
				res.clearCookie(slingCookieName);
				res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
				res.header('Pragma', 'no-cache');
				res.header('Expires', '0');
				setUnauthorizedStatus("signed-out");
				res.status("301").setHeader("location", signOutRedirect);
				res.end("Redirect to: " + signOutRedirect);
				return;
			}


			var user, pass, stamp, sc;
			var blCookieValue=req.signedCookies?req.signedCookies[blCookieName]:"";
			var slingCookieValue = req.cookies?req.cookies[slingCookieName]:"";
			var authParts=blCookieValue?blCookieValue.match(/^(.*)\|(\d*)$/):"";

			if(authParts && slingCookieValue){
				user=authParts[1];
				stamp=authParts[2];

				req.bl.sling = req.bl.sling.clone(
					{	updateBrowserCookie: updateBrowserCookieUsingSlingResponse, 
						username: null, password: null, 
						authCookie:{name: slingCookieName, value: slingCookieValue}
					});

				req.authorization={
					user:user,
					userManager: req.bl.sling.baseUri + "system/userManager.html",
					permissionUrl: function(slingPath){return req.bl.sling.baseUri.replace(/\/$/,"") + slingPath + ".acl.html";}
				};
				// TODO:  use  routerSettings.getSlingByReq() to get SC in blacklight edit.  
			}


			/// We're already signed in, just need to validate the session is not expired 
			if(user){
				var now = Date.now();
				var cookieAgeMins = Math.floor((now - stamp)/(1000*60));

				if(cookieAgeMins > sessionExpireMins){	
					res.clearCookie(blCookieName);
					res.clearCookie(slingCookieName);
					setUnauthorizedStatus("session-expired");
					user=null;
					next();			
				}else{
					// The following code would be helpful for a page you keep hitting in BL that does not do a sling request.
					// But just adds time to pages that DO do a sling request.  And how often does a page NOT call sling?

					if(cookieAgeMins >= cookieRefreshIntervalMins){ // If TTL interval has passed, refresh cookie.
						sc=req.bl.sling.clone({username:null, password:null, fileCache:null});
						sc.post("/j_security_check", {j_validate: "true"},
							function(err, statusCode, slingResponse, data){
								if(statusCode>300){
									setUnauthorizedStatus("sling-rejected-cookie");
								}
								next();
							}
						);
					}else{
						next();
					}
				}
				return;
			}



			// We're not signed in, so ascertain situation

			if(req.body){
				user = req.body[userParam]; pass=req.body[passwordParam];
			}

			if(req.method==="POST" && user && pass){
				// Sign in to sling auth form and echo the cookie back into the `res` object.
				sc=req.bl.sling.clone({username:null, password:null, fileCache:null});

				sc.post("/j_security_check", {j_username: user, j_password: pass, j_validate: "true"},
					function(err, statusCode, slingResponse, data){
						var cookieDirective=slingResponse.headers["set-cookie"];
						if(statusCode < 299){
							res.status("301");
							setUserCookie(user, cookieDirective)
							res.setHeader("location", req.originalUrl);
							res.end("Redirect to: " + req.originalUrl);
							return;
						}else{
							setUnauthorizedStatus("bad-password");
							next();
							return;
						}
					})
			}else{
				setUnauthorizedStatus("not-signed-in");
				next(); 
			}


			return;
			

			//////////////////////////////////////////////////////////////////////////////////////
			function updateBrowserCookieUsingSlingResponse(slingResponse){
				if(didUpdateBroswerCookie){return;}
				var authCookie=slingResponse.headers["set-cookie"];
				if(authCookie){
					setUserCookie(user, authCookie);
					didUpdateBroswerCookie=true;
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			function setUserCookie(user, slingCookieDirective){
				if(!res.headersSent){
					res.header("set-cookie", slingCookieDirective);
					res.cookie(blCookieName, user + "|" + Date.now().toString(), {signed:true});
				}else{
					console.log("Would set sling auth cookie, but headers already done.", req.method, req.path);
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			function setUnauthorizedStatus(status){
				req.authorization = {
						status, 
						passwordParam: slingAuthenticator.options.passwordParam, 
						userParam: slingAuthenticator.options.userParam
					};
				req.url = options.appsMount + "blacklight/edit/sign-in";			
			}

		});
	}


	return slingAuthenticator;

}





