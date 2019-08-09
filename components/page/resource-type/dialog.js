

exports.dialog=function($){
	var dialog={
		title: "Page Metadata Settings",
		items: {
			tabpanel: {
				widget: "tabs",
				items: {
					tab1: {
						widget:"panel",
						title: "Titles and Tags",
						items:{
							title: {name:"jcr:title", widget:"textfield", label:"Page title"},
							htmlFields: {						
								widget : 'fieldset',
								title : 'HTML tags',
								items : {
									html_title: {name:"pageTitle", widget:"textfield", label:"HTML title"},
									html_keywords: {name:"metaKeywords", widget:"textfield", label:"Keywords meta tag"},
									html_description: {name:"jcr:description", widget:"textarea", label:"Description meta tag"},
									propertyGroupName: {name:"propertyGroupName", widget:"textfield", label:"Property Group Name"}
								}
							},
							additionalMetaTags : {
								widget : 'fieldset',
								title : 'Additional meta tag settings',
								description: "The Meta tag name(s) and Meta tag content(s) work together to create  " +
											  "custom meta tags for the page. For example, if you have " +
											  "'google-site-verification' in the first row of " +
											  "<nobr>Meta tag name(s)</nobr> and 'someIdNumber' in the first row of " +
											  "<nobr>Meta tag content(s)</nobr>, the meta tag will look like this " +
											  "in the page head:<br/><br/>" +
											  "&lt;meta name=&quot;google-site-verification&quot; " +
											  "content=&quot;someIdNumber&quot; /&gt;" +
											  "<br/><br/>You can make more custom meta tags by adding subsequence rows.",
								items : {
									additionalMetaTagNames: {
										label: "Meta tag name(s)",
										widget: "multifield",
										name: "additionalMetaNames",
										description: "Each row in this field works along with the same row in the " +
													  "'Meta tag content(s)' field below.",
										fieldConfig: {
											widget: "textfield"
										}
									},
									additionalMetaTagContents: {
										label: "Meta tag content(s)",
										widget: "multifield",
										name: "additionalMetaContents",
										description: "Each row in this field works along with the same row in the " +
													  "'Meta tag names(s)' field above.",
										fieldConfig: {
											widget: "textfield"
										}
									}
								}
							},
							page_type: {name:"sling:resourceType", widget:"textfield", label:"Page Type", readonly: true}
						}
					},

					tab2:{
						widget:"panel",
						title: "Navigation and Links",
						items:{
							hideInNav: {widget:"selection", type:"checkbox", label:"Hide in navigation"},
							excludeFromSitemapAndSearch: {
								widget:"selection",
								type:"checkbox",
								description:"Exclude this page from appearing on any FS sitemaps or being indexed by external search engines (noindex)."
							},
							excludeFromLinkFollowing: {
								widget:"selection",
								type:"checkbox",
								description:"Exclude any links on this page from being followed by external search engines (nofollow)."
							},
							vanityUrl : {
								widget : 'fieldset',
								title : 'Vanity URL settings',
								items : {
									vanityPath: {
										label: "Vanity URLs",
										widget: "multifield",
										name: "sling:vanityPath",
										fieldConfig: {
											widget: "textfield"
										}
									},
									useVanityPathInNav: {
										label: "Use Vanity URL in Navigation",
										description: "NOTE:  Vanity URLs are applied only on activated (live) pages; Blacklight author URLs will remain the same.",
										widget: "selection",
										type: "checkbox",
										name: "useVanityPathInNav"
									},
									vanityPathRedirect: {
										label: "Redirect Vanity URL",
										widget: "selection",
										type: "checkbox",
										name: "sling:redirect"
									},
									canonicalUseVanityPath: {
										label: "Use Vanity URL for Canonical Tag",
										widget: "selection",
										type: "checkbox",
										name: "canonicalUseVanityPathURL"
									}
								}
							}
						}
					},
					openGraph : {
						widget : 'fieldset',
						title : 'Open Graph Metadata',
						items : {
							openGraphTitle: {
								label: "Title",
								description: "Defaults to the page title.",
								widget: "textfield"
							},
							openGraphDescription: {
								label: "Description",
								description: "Defaults to the page description.",
								widget: "textarea"
							},
							openGraphType: {
								label: "Type",
								widget: "textfield"
							},
							openGraphImage: {
								label: "Image",
								description: "Defaults to the logo.",
								widget: "image",
								cropping: "disabled",
								searchPaths: [
									{
										path : '/content/dam',
										title : 'DAM'
									}
								]
							},
							openGraphUrl: {
								label: "Url",
								description: "Defaults to the current page.",
								widget: "textfield"
							}
						}
					},
					twitterCard : {
						widget : 'fieldset',
						title : 'Twitter Card Tags',
						items : {
							twitterCardCard: {
								label: "Card",
								widget: "textfield"
							},
							twitterCardSite: {
								label: "Site",
								widget: "textfield"
							},
							twitterCardCreator: {
								label: "Creator",
								widget: "textfield"
							},
							twitterCardTitle: {
								label: "Title",
								description: "Defaults to the page title.",
								widget: "textfield"
							},
							twitterCardDescription: {
								label: "Description",
								widget: "textarea"
							},
							twitterCardImage: {
								label: "Image",
								widget: "image",
								cropping: "disabled",
								searchPaths: [
									{
										path : '/content/dam',
										title : 'DAM'
									}
								]
							}
						}
					}
				}
			}
		}
	}

	return dialog;
}


