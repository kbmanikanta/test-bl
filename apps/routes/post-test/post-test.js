var _ = require('lodash');

const formData = { 'slides/sling:resourceType': 'foundation/components/parsys',
'slides/image0/bl:autoStubbed': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image0',
'slides/image0/sling:resourceType': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image0/bl:map/ci/bl:inherit-component': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image0/bl:map/ci/exclude': 
 [ 'auto_panel',
   'title',
   'description',
   'cta/text',
   'cta/link',
   'cta/newWindow' ],
'slides/image0/bl:map/ci/exclude@TypeHint': 'String[]',
'slides/image0/bl:map/i0/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image0',
'slides/image0/bl:map/i0/nodes/n1/source': 'title',
'slides/image0/bl:map/i0/nodes/n1/target': 'title',
'slides/image0/bl:map/i0/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i0/nodes/n2/source': 'description',
'slides/image0/bl:map/i0/nodes/n2/target': 'description',
'slides/image0/bl:map/i0/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i0/nodes/n3/source': 'image',
'slides/image0/bl:map/i0/nodes/n3/target': 'image',
'slides/image0/bl:map/i0/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i0/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i0/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/videos/-video',
'slides/image0/bl:map/i1/nodes/n1/source': 'title',
'slides/image0/bl:map/i1/nodes/n1/target': 'title',
'slides/image0/bl:map/i1/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/nodes/n2/source': 'description',
'slides/image0/bl:map/i1/nodes/n2/target': 'description',
'slides/image0/bl:map/i1/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/nodes/n3/source': 'thumbnail',
'slides/image0/bl:map/i1/nodes/n3/target': 'thumbnail',
'slides/image0/bl:map/i1/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/nodes/n4/source': 'source',
'slides/image0/bl:map/i1/nodes/n4/target': 'video',
'slides/image0/bl:map/i1/nodes/n4/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/nodes/n5/source': 'hostedBy',
'slides/image0/bl:map/i1/nodes/n5/target': 'videoSource',
'slides/image0/bl:map/i1/nodes/n5/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/nodes/n6/source': 'accessibilityText',
'slides/image0/bl:map/i1/nodes/n6/target': 'accessibilityText',
'slides/image0/bl:map/i1/nodes/n6/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/i1/jcr:primaryType': 'nt:unstructured',
'slides/image0/bl:map/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:autoStubbed': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image1',
'slides/image1/sling:resourceType': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image1/bl:map/ci/bl:inherit-component': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image1/bl:map/ci/exclude': 
 [ 'auto_panel',
   'title',
   'description',
   'cta/text',
   'cta/link',
   'cta/newWindow' ],
'slides/image1/bl:map/ci/exclude@TypeHint': 'String[]',
'slides/image1/bl:map/i0/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image1',
'slides/image1/bl:map/i0/nodes/n1/source': 'title',
'slides/image1/bl:map/i0/nodes/n1/target': 'title',
'slides/image1/bl:map/i0/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i0/nodes/n2/source': 'description',
'slides/image1/bl:map/i0/nodes/n2/target': 'description',
'slides/image1/bl:map/i0/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i0/nodes/n3/source': 'image',
'slides/image1/bl:map/i0/nodes/n3/target': 'image',
'slides/image1/bl:map/i0/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i0/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i0/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/videos/-video',
'slides/image1/bl:map/i1/nodes/n1/source': 'title',
'slides/image1/bl:map/i1/nodes/n1/target': 'title',
'slides/image1/bl:map/i1/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/nodes/n2/source': 'description',
'slides/image1/bl:map/i1/nodes/n2/target': 'description',
'slides/image1/bl:map/i1/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/nodes/n3/source': 'thumbnail',
'slides/image1/bl:map/i1/nodes/n3/target': 'thumbnail',
'slides/image1/bl:map/i1/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/nodes/n4/source': 'source',
'slides/image1/bl:map/i1/nodes/n4/target': 'video',
'slides/image1/bl:map/i1/nodes/n4/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/nodes/n5/source': 'hostedBy',
'slides/image1/bl:map/i1/nodes/n5/target': 'videoSource',
'slides/image1/bl:map/i1/nodes/n5/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/nodes/n6/source': 'accessibilityText',
'slides/image1/bl:map/i1/nodes/n6/target': 'accessibilityText',
'slides/image1/bl:map/i1/nodes/n6/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/i1/jcr:primaryType': 'nt:unstructured',
'slides/image1/bl:map/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:autoStubbed': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image2',
'slides/image2/sling:resourceType': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image2/bl:map/ci/bl:inherit-component': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image2/bl:map/ci/exclude': 
 [ 'auto_panel',
   'title',
   'description',
   'cta/text',
   'cta/link',
   'cta/newWindow' ],
'slides/image2/bl:map/ci/exclude@TypeHint': 'String[]',
'slides/image2/bl:map/i0/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image2',
'slides/image2/bl:map/i0/nodes/n1/source': 'title',
'slides/image2/bl:map/i0/nodes/n1/target': 'title',
'slides/image2/bl:map/i0/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i0/nodes/n2/source': 'description',
'slides/image2/bl:map/i0/nodes/n2/target': 'description',
'slides/image2/bl:map/i0/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i0/nodes/n3/source': 'image',
'slides/image2/bl:map/i0/nodes/n3/target': 'image',
'slides/image2/bl:map/i0/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i0/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i0/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/videos/-video',
'slides/image2/bl:map/i1/nodes/n1/source': 'title',
'slides/image2/bl:map/i1/nodes/n1/target': 'title',
'slides/image2/bl:map/i1/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/nodes/n2/source': 'description',
'slides/image2/bl:map/i1/nodes/n2/target': 'description',
'slides/image2/bl:map/i1/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/nodes/n3/source': 'thumbnail',
'slides/image2/bl:map/i1/nodes/n3/target': 'thumbnail',
'slides/image2/bl:map/i1/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/nodes/n4/source': 'source',
'slides/image2/bl:map/i1/nodes/n4/target': 'video',
'slides/image2/bl:map/i1/nodes/n4/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/nodes/n5/source': 'hostedBy',
'slides/image2/bl:map/i1/nodes/n5/target': 'videoSource',
'slides/image2/bl:map/i1/nodes/n5/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/nodes/n6/source': 'accessibilityText',
'slides/image2/bl:map/i1/nodes/n6/target': 'accessibilityText',
'slides/image2/bl:map/i1/nodes/n6/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/i1/jcr:primaryType': 'nt:unstructured',
'slides/image2/bl:map/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:autoStubbed': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image3',
'slides/image3/sling:resourceType': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image3/bl:map/ci/bl:inherit-component': 'fshr/feeds/pages/photos-and-videos/content/gallery/slide',
'slides/image3/bl:map/ci/exclude': 
 [ 'auto_panel',
   'title',
   'description',
   'cta/text',
   'cta/link',
   'cta/newWindow' ],
'slides/image3/bl:map/ci/exclude@TypeHint': 'String[]',
'slides/image3/bl:map/i0/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/images/image3',
'slides/image3/bl:map/i0/nodes/n1/source': 'title',
'slides/image3/bl:map/i0/nodes/n1/target': 'title',
'slides/image3/bl:map/i0/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i0/nodes/n2/source': 'description',
'slides/image3/bl:map/i0/nodes/n2/target': 'description',
'slides/image3/bl:map/i0/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i0/nodes/n3/source': 'image',
'slides/image3/bl:map/i0/nodes/n3/target': 'image',
'slides/image3/bl:map/i0/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i0/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i0/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/bl:ref': '/content/fshr/collections/ar/properties/dubaijb/photos-and-videos/jcr:content/galleries/gallery4/mediaItems/videos/-video',
'slides/image3/bl:map/i1/nodes/n1/source': 'title',
'slides/image3/bl:map/i1/nodes/n1/target': 'title',
'slides/image3/bl:map/i1/nodes/n1/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/nodes/n2/source': 'description',
'slides/image3/bl:map/i1/nodes/n2/target': 'description',
'slides/image3/bl:map/i1/nodes/n2/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/nodes/n3/source': 'thumbnail',
'slides/image3/bl:map/i1/nodes/n3/target': 'thumbnail',
'slides/image3/bl:map/i1/nodes/n3/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/nodes/n4/source': 'source',
'slides/image3/bl:map/i1/nodes/n4/target': 'video',
'slides/image3/bl:map/i1/nodes/n4/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/nodes/n5/source': 'hostedBy',
'slides/image3/bl:map/i1/nodes/n5/target': 'videoSource',
'slides/image3/bl:map/i1/nodes/n5/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/nodes/n6/source': 'accessibilityText',
'slides/image3/bl:map/i1/nodes/n6/target': 'accessibilityText',
'slides/image3/bl:map/i1/nodes/n6/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/nodes/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/i1/jcr:primaryType': 'nt:unstructured',
'slides/image3/bl:map/jcr:primaryType': 'nt:unstructured',
_charset_: 'utf-8' }; 

const path = '/content/fshr/feeds/photos-and-videos/ar/dubaijb/jcr:content/galleries/gallery4'; 


module.exports.process = function(data, $, cb){
	const res=$.express.res;
	$.sc.post(path, formData, (err, postRes)=>{
		res.json({err, postRes});
		cb(null, false);
	})
}; 