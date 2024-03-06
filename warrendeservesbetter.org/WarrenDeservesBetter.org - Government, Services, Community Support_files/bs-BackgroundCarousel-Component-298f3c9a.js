define("@widget/LAYOUT/bs-BackgroundCarousel-Component-298f3c9a.js",["exports","~/c/bs-_rollupPluginBabelHelpers","~/c/bs-dataAids","@wsb/guac-widget-shared@^1/lib/components/Carousel","~/c/bs-index","~/c/bs-overlayTypes","~/c/bs-utils","~/c/bs-PortalContainer"],(function(e,o,a,t,r,p,l,s){"use strict";const i="slides";(global.PropTypes||guac["prop-types"]).shape({image:(global.PropTypes||guac["prop-types"]).string,video:(global.PropTypes||guac["prop-types"]).string,oWidth:(global.PropTypes||guac["prop-types"]).number,oHeight:(global.PropTypes||guac["prop-types"]).number,alt:(global.PropTypes||guac["prop-types"]).string,coordinates:(global.PropTypes||guac["prop-types"]).shape({x:(global.PropTypes||guac["prop-types"]).number,y:(global.PropTypes||guac["prop-types"]).number}),editedAspectRatio:(global.PropTypes||guac["prop-types"]).string,height:(global.PropTypes||guac["prop-types"]).string,width:(global.PropTypes||guac["prop-types"]).string,left:(global.PropTypes||guac["prop-types"]).string,top:(global.PropTypes||guac["prop-types"]).string,rotation:(global.PropTypes||guac["prop-types"]).string,scale:(global.PropTypes||guac["prop-types"]).number,position:(global.PropTypes||guac["prop-types"]).string,overlayAlpha:(global.PropTypes||guac["prop-types"]).number});const n=(global.PropTypes||guac["prop-types"]).shape({image:(global.PropTypes||guac["prop-types"]).string,oWidth:(global.PropTypes||guac["prop-types"]).number,oHeight:(global.PropTypes||guac["prop-types"]).number,alt:(global.PropTypes||guac["prop-types"]).string,coordinates:(global.PropTypes||guac["prop-types"]).shape({x:(global.PropTypes||guac["prop-types"]).number,y:(global.PropTypes||guac["prop-types"]).number}),editedAspectRatio:(global.PropTypes||guac["prop-types"]).string,height:(global.PropTypes||guac["prop-types"]).string,width:(global.PropTypes||guac["prop-types"]).string,left:(global.PropTypes||guac["prop-types"]).string,top:(global.PropTypes||guac["prop-types"]).string,rotation:(global.PropTypes||guac["prop-types"]).string,scale:(global.PropTypes||guac["prop-types"]).number,position:(global.PropTypes||guac["prop-types"]).string,overlayAlpha:(global.PropTypes||guac["prop-types"]).number}),g=(global.PropTypes||guac["prop-types"]).shape({image:(global.PropTypes||guac["prop-types"]).string,video:(global.PropTypes||guac["prop-types"]).string,oWidth:(global.PropTypes||guac["prop-types"]).number,oHeight:(global.PropTypes||guac["prop-types"]).number,alt:(global.PropTypes||guac["prop-types"]).string,overlayAlpha:(global.PropTypes||guac["prop-types"]).number}),c=(global.PropTypes||guac["prop-types"]).shape({autoplay:(global.PropTypes||guac["prop-types"]).bool,autoplayDelay:(global.PropTypes||guac["prop-types"]).number,transition:(global.PropTypes||guac["prop-types"]).oneOf(["fade","slide"]),type:(global.PropTypes||guac["prop-types"]).oneOf(["imagesOnly",i]),dots:(global.PropTypes||guac["prop-types"]).bool,arrows:(global.PropTypes||guac["prop-types"]).bool,slides:(global.PropTypes||guac["prop-types"]).arrayOf((global.PropTypes||guac["prop-types"]).shape({image:n,heroContent:(global.PropTypes||guac["prop-types"]).shape({tagline:(global.PropTypes||guac["prop-types"]).string,tagline2:(global.PropTypes||guac["prop-types"]).string,cta:(global.PropTypes||guac["prop-types"]).object})})),alignmentOption:(global.PropTypes||guac["prop-types"]).string,themeConfig:(global.PropTypes||guac["prop-types"]).shape({height:(global.PropTypes||guac["prop-types"]).string,maxWidthPercent:(global.PropTypes||guac["prop-types"]).number})});(global.PropTypes||guac["prop-types"]).shape({mediaType:(global.PropTypes||guac["prop-types"]).oneOf(["Image","Video","Slideshow"]).isRequired,background:n,video:g,slideshow:c});const{DEFAULT:d,ALT:u,OVERLAY:b}=(global.Core||guac["@wsb/guac-widget-core"]).constants.sectionTypes,y=e=>{let{data:o,blur:a,children:t,dataRoute:r,dataAid:l,overlay:s,treatment:i,style:n={},backgroundSize:g,section:c,showOverlay:d,disableOverlayMobile:u}=e;const{image:y,position:h,alt:m,overlayAlpha:T}=o;if(!y)return(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,null,t);const P=i===p.L,w=g||"cover",v={...(h||"").indexOf(" ")>-1?{backgroundPosition:h}:{},...n};return P?(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Component.Background,{backgroundSize:"contain",imageData2:{...o,additionalUrlParams:["fx-bl=s:30"]},backgroundSize2:"cover","data-aid":l,"data-field-id":r,"aria-label":m,section:b,style:v,overlay:s,treatment:i,"data-ht":i,overlayAlpha:d?T:0,disableOverlayMobile:u,imageData:o},t):(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Component.Background,{"data-aid":l,"data-field-id":r,"aria-label":m,section:c,style:v,overlay:s,treatment:i,"data-ht":i,backgroundSize:w,overlayAlpha:d?T:0,disableOverlayMobile:u,imageData:o,blur:a},t)};y.propTypes={blur:(global.PropTypes||guac["prop-types"]).bool,data:n.isRequired,dataAid:(global.PropTypes||guac["prop-types"]).string,children:(global.PropTypes||guac["prop-types"]).any,overlay:(global.PropTypes||guac["prop-types"]).oneOf([p.C,p.P,p.N,p.A,p.a]),section:(global.PropTypes||guac["prop-types"]).oneOf([d,u,b]),style:(global.PropTypes||guac["prop-types"]).object,treatment:(global.PropTypes||guac["prop-types"]).oneOf([p.F,p.b,p.I,p.B,p.L]),backgroundSize:(global.PropTypes||guac["prop-types"]).string,mobileSize:(global.PropTypes||guac["prop-types"]).string,dataRoute:(global.PropTypes||guac["prop-types"]).string,showOverlay:(global.PropTypes||guac["prop-types"]).bool,disableOverlayMobile:(global.PropTypes||guac["prop-types"]).bool},y.defaultProps={blur:!1,dataAid:a.D.BACKGROUND_IMAGE_RENDERED,overlay:p.a,section:b,showOverlay:!0};class h extends(global.React||guac.react).Component{constructor(){super(...arguments),o._(this,"goToSlide",((e,o)=>{o.stopPropagation(),this.props.goToSlide(e)}))}render(){const{numSlides:e,selectedIndex:a,editingIndex:t,visible:r,containerId:p}=this.props;if(e<=1)return null;const l={list:{listStyle:"none",padding:0,marginTop:0,marginBottom:p?0:"medium","@md":{marginBottom:p?0:"large"}},listItem:{display:"inline-block",cursor:"pointer"},wrapper:{display:r?"block":"none",position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",zIndex:2}},i=[];for(let r=0;r<e;r++){const e=r===a?(global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Dot.Active:(global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Dot,p=t>=0?{"data-field-id":"slides","data-field-route":`/mediaData/slides/${r}`}:{"data-edit-interactive":!0};i.push((global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,o.a({tag:"li",key:`dot-${r}`,style:l.listItem,onClick:this.goToSlide.bind(null,r)},p),(global.React||guac.react).createElement(e,{"data-aid":`SLIDE_SELECTION_DOT_${r}`})))}const n=(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{tag:"ul",style:l.list},i);return p?(global.React||guac.react).createElement(s.P,{containerId:p},n):(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:l.wrapper},n)}}h.propTypes={numSlides:(global.PropTypes||guac["prop-types"]).number,selectedIndex:(global.PropTypes||guac["prop-types"]).number,goToSlide:(global.PropTypes||guac["prop-types"]).func,editingIndex:(global.PropTypes||guac["prop-types"]).number,visible:(global.PropTypes||guac["prop-types"]).bool,containerId:(global.PropTypes||guac["prop-types"]).string};class m extends(global.React||guac.react).Component{constructor(e){super(e),o._(this,"goToPrevSlide",(e=>{e.stopPropagation(),this.props.prevSlide()})),o._(this,"goToNextSlide",(e=>{e.stopPropagation(),this.props.nextSlide()})),o._(this,"handleMatchMedia",(e=>{const{viewDevice:o,renderMode:a}=this.props,t=a===(global.Core||guac["@wsb/guac-widget-core"]).constants.renderModes.PUBLISH?"xs"===e.size:function(e){return/mobile/i.test(e)}(o);this.state.loaded&&this.state.isMobile===t||this.setState({loaded:!0,isMobile:t})})),this.state={isMobile:!1,loaded:!1}}render(){const{numSlides:e,editingIndex:a,visible:t,containerId:r,mobileContainerId:p}=this.props,{isMobile:l,loaded:i}=this.state;if(e<=1)return null;const n={overlay:{display:t&&i?"flex":"none",justifyContent:"center",position:"absolute","@xs-only":{bottom:0,left:"small",right:"small",marginBottom:"small"},"@sm":{left:0,right:0,top:"calc(50% - 20px)"}}},g=a>=0?{"data-route":"/mediaData"}:{},c=(global.React||guac.react).createElement((global.React||guac.react).Fragment,null,(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX.MatchMedia,{onChange:this.handleMatchMedia}),(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Group.SlideshowArrows,null,(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Button.Previous,o.a({onClick:this.goToPrevSlide,"data-edit-interactive":!0},g)),(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Button.Next,o.a({onClick:this.goToNextSlide,"data-edit-interactive":!0},g))));return l&&p?(global.React||guac.react).createElement(s.P,{containerId:p},c):r?(global.React||guac.react).createElement(s.P,{containerId:r},c):(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:n.overlay},c)}}m.propTypes={numSlides:(global.PropTypes||guac["prop-types"]).number,prevSlide:(global.PropTypes||guac["prop-types"]).func,nextSlide:(global.PropTypes||guac["prop-types"]).func,editingIndex:(global.PropTypes||guac["prop-types"]).number,visible:(global.PropTypes||guac["prop-types"]).bool,containerId:(global.PropTypes||guac["prop-types"]).string,mobileContainerId:(global.PropTypes||guac["prop-types"]).string,renderMode:(global.PropTypes||guac["prop-types"]).string,viewDevice:(global.PropTypes||guac["prop-types"]).string};class T extends(global.React||guac.react).Component{componentDidUpdate(){const{goToSlide:e,editingIndex:o}=this.props;"number"==typeof o&&o>=0&&e(o)}render(){return null}}T.propTypes={renderKey:(global.PropTypes||guac["prop-types"]).number,editingIndex:(global.PropTypes||guac["prop-types"]).number,goToSlide:(global.PropTypes||guac["prop-types"]).func};const{renderModes:{LAYOUT:P,DISPLAY:w,PUBLISH:v,EDIT:f}}=(global.Core||guac["@wsb/guac-widget-core"]).constants,C=[/mediaData\/slides\/(\d+).*/,/mediaData\/(\d+).*\/image/];class E extends(global.React||guac.react).Component{constructor(){super(...arguments),this.state={currentSlide:0,showText:!1,navOpen:!1},this.afterChange=this.afterChange.bind(this),this.beforeChange=this.beforeChange.bind(this),this.handleNavDrawerOpened=this.handleNavDrawerOpened.bind(this),this.handleNavDrawerClosed=this.handleNavDrawerClosed.bind(this),this.getSlideEditingIndex=this.getSlideEditingIndex.bind(this),this._loadedImages=new Set}fireTransitionEvent(e){window.dispatchEvent(new CustomEvent("slideshowTransition",{detail:{slide:e,id:this.props.slideshow.themeConfig.slideshowId}}))}afterChange(e){const{renderMode:o,slideshow:a}=this.props,{type:t,themeConfig:{useHeroCarousel:r}}=a;o!==v||t!==i||r||l.p(a,e),this.setState({currentSlide:e,showText:!1},(()=>{setTimeout((()=>{this.setState({showText:!0})}),800)})),this.fireTransitionEvent(e)}beforeChange(e){this.fireTransitionEvent(e)}handleNavDrawerOpened(){this.setState({navOpen:!0})}handleNavDrawerClosed(){this.setState({navOpen:!1})}componentDidMount(){this.afterChange(0),window.addEventListener("NavigationDrawerOpened",this.handleNavDrawerOpened),window.addEventListener("NavigationDrawerClosed",this.handleNavDrawerClosed)}componentWillUnmount(){window.removeEventListener("NavigationDrawerOpened",this.handleNavDrawerOpened),window.removeEventListener("NavigationDrawerClosed",this.handleNavDrawerClosed)}getSlideEditingIndex(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";const{renderMode:o}=this.props;if(o===v)return-1;let a=-1;return C.forEach((o=>{const t=e.match(o);t&&t[1]&&(a=parseInt(t[1],10))})),a}render(){const{slideshow:e,renderMode:p,mutatorPath:s,dataRoute:n,viewDevice:g,...c}=this.props,{currentSlide:d,showText:u,navOpen:b}=this.state,{slides:v,type:C,autoplay:E,autoplayDelay:I,transition:S,dots:D,arrows:x,alignmentOption:R,heroIdPrefix:O,themeConfig:k}=e,{maxWidthPercent:M=100,useHeroCarousel:A,dotsContainerId:U,arrowsContainerId:N,mobileArrowsContainerId:B}=k,L=[P,w].includes(p),_={height:"100%"};let X=!1;const H=new Set(L?[0]:[d-1<0?v.length-1:d-1,d,d+1===v.length?0:d+1]),z=v.map(((e,t)=>{const s=e||{},n=s.image||{},g=`${a.D.HEADER_SLIDE}_${t}`,b=x?Math.min(M,80):M;let h;if(C===i&&!A){let e=!1;!X&&s.tagline&&(e=!0,X=!0),h=(global.React||guac.react).createElement(l.S,{slide:s,index:t,forceH1:e,alignmentOption:R,heroIdPrefix:O,themeConfig:k,renderMode:p,currentSlide:d,showText:u,slideWidthPercent:b,style:_})}return n.image&&(this._loadedImages.has(n.image)||H.has(t))?(this._loadedImages.add(n.image),(global.React||guac.react).createElement(y,o.a({key:t,data:{overlayAlpha:r.D,...n}},(global._||guac.lodash).pick(c,Object.keys(y.propTypes)),{style:_,dataAid:g,dataRoute:""}),h)):(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{key:t,style:_,dataAid:g},h)})),W=this.getSlideEditingIndex(s),j={mobile:!1,position:"bottom",editingIndex:W,viewDevice:g,renderMode:p},$=[];D&&$.push({component:h,props:{...j,visible:!b,containerId:U}}),x&&$.push({component:m,props:{...j,visible:!b,containerId:N,mobileContainerId:B}});let F=E;if(L||b)F=!1;else if(p===f){F=E&&-1===W;const e=d===W?0:Math.random();$.push({component:T,props:{renderKey:e,editingIndex:W}})}const Y=parseFloat(I),G={style:{container:{height:"100%"},containerInner:{height:"100%"},track:{height:"100%"},..."slide"===S?{slide:{opacity:1}}:{}},viewportWidth:"100%",viewportHeight:"100%",height:"100%",slideWidth:"100%",slideHeight:"100%",autoplay:F,autoplaySpeed:Number.isNaN(Y)?7e3:Math.max(1e3*Y,2e3),transition:S,transitionDuration:1e3,infinite:!0,lazyLoad:!1,dots:!1,arrows:!1,draggable:F||D||x,pauseOnHover:!1,afterChange:this.afterChange,beforeChange:this.beforeChange,controls:$};return(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:{height:"100%"}},p===f&&(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{"data-field-id":n,style:{position:"absolute",top:0,bottom:0,left:0,right:0}}),(global.React||guac.react).createElement(t.default,G,z))}}E.propTypes={slideshow:(global.PropTypes||guac["prop-types"]).object,heroTrackId:(global.PropTypes||guac["prop-types"]).string,dataRoute:(global.PropTypes||guac["prop-types"]).string,renderMode:(global.PropTypes||guac["prop-types"]).string,viewDevice:(global.PropTypes||guac["prop-types"]).string,mutatorPath:(global.PropTypes||guac["prop-types"]).string},e.default=E,Object.defineProperty(e,"__esModule",{value:!0})})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=bs-BackgroundCarousel-Component-298f3c9a.js.map