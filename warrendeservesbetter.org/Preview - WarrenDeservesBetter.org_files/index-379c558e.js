define("@widget/LAYOUT/c/index-379c558e.js",["exports","~/c/Layout","~/c/getCommonNavProps","~/c/SplitNav","~/c/NavItems","~/c/index3"],(function(e,o,a,t,l,r){"use strict";function g(e){let{hasNav:o,hasRenderedLogo:a,showUtilitiesMenu:t}=e;return a||!o?"flex-end":a||t||!o?"space-between":"center"}function s(e){const{navigation:a,id:r,usePipe:s,logo:c,hasRenderedLogo:p,commerce:n,showUtilitiesMenu:i,searchFormLocation:u,hasOverhang:d,fullWidth:y,hasNav:b,maxLines:m,styleOverrides:h}=e,P=(global._||guac.lodash).uniqueId("logo-"),v=(global._||guac.lodash).uniqueId("navBarId-"),T=s&&b&&p,{logoAlign:f}=c,w=function(e){let{hasNav:o,hasRenderedLogo:a,hasOverhang:t,showUtilitiesMenu:l,styleOverrides:r}=e;return(global._||guac.lodash).merge({container:{},navbarContainer:{display:"flex",justifyContent:"flex-start",alignItems:"center",flexWrap:"nowrap"},sharedGridStyle:{display:"none",paddingVertical:t?"xsmall":0,"@md":{display:"flex"}},logoContainer:{paddingRight:0,display:"flex",alignItems:"center",justifyContent:"flex-start",width:a?"35%":0,minWidth:"35%",flexShrink:0},logo:{textAlign:"left"},rightContainer:{display:"flex",minWidth:a?"65%":"100%",alignItems:"center",flexBasis:"auto",justifyContent:g({hasNav:o,hasRenderedLogo:a,showUtilitiesMenu:l})},menuItemContainer:{display:"flex",position:"relative",paddingTop:"5px"},utilContainer:{display:"flex",position:"relative"}},r)}({logoAlign:f,hasNav:b,showUtilitiesMenu:i,hasRenderedLogo:p,hasOverhang:d,showPipe:T,usePipe:s,styleOverrides:h});return(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Container,{fluid:y,style:w.container},p&&"center"===f?(global.React||guac.react).createElement(t.S,o.c({},e,{sharedGridStyle:w.sharedGridStyle,pipe:T,maxLines:m})):(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{id:v,bottom:!1,style:{...w.navbarContainer,...w.sharedGridStyle}},p&&(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:w.logoContainer},(global.React||guac.react).createElement(o.t,o.c({},e,{id:P,maxLines:m,style:w.logo}))),(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:w.rightContainer},b&&(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:w.menuItemContainer},(global.React||guac.react).createElement(l.N,o.c({},e,{maxWidth:"100%",id:r,navigation:a,containerId:v,logoImageId:P}))),i&&(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:w.utilContainer},(global.React||guac.react).createElement(o.U,o.c({},e,{commerce:n,pipe:T,adjustMembershipDropdown:!0,searchFormLocation:u}))))))}function c(e){const{id:a,logo:t,hasRenderedLogo:l,logoData:r,commerce:g,hasNav:s,showUtilitiesMenu:c,renderMode:p,hasOverhang:n,scaledLogoFontSizes:i,styleOverrides:u,...d}=e,{logoAlign:y}=t,b=function(e){let{logoAlign:o,showCells:a,styleOverrides:t}=e;return(global._||guac.lodash).merge({navbarContainer:{alignItems:"center",flexWrap:"nowrap",width:"100%",margin:0,display:"flex","@md":{display:"none"}},logoContainer:{display:"flex",width:a?"70%":"100%",textAlign:o,justifyContent:"center"===o?"center":"flex-start",overflowWrap:"break-word",paddingHorizontal:"xsmall"},cell:{width:a?"center"===o?"15%":"30%":0,paddingRight:0,paddingLeft:0},additionalItemContainer:{display:"flex",justifyContent:"flex-end"},logoWrapper:{"@xs-only":{justifyContent:"center"===o?"center":"flex-start",maxWidth:"100%"}}},t)}({logoAlign:y,showCells:s||g||c,styleOverrides:u}),m="center"===y||!l,h="left"===y&&l,P=(s||g||c)&&(global.React||guac.react).createElement(o.M,{id:a,renderMode:p}),v=c&&(global.React||guac.react).createElement(o.U,o.c({commerce:g,renderMode:p,isMobile:!0},d));return(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{bottom:!1,style:b.navbarContainer},m&&(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:b.cell},P),(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:b.logoContainer},l&&(global.React||guac.react).createElement(o.t,o.c({},d,{style:b.logoWrapper,logo:t,logoData:r,renderMode:p,hasOverhang:n,scaledFontSizes:i,isMobileLogoFullWidth:!1}))),(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:{...b.cell,...b.additionalItemContainer}},v,h&&P))}s.propTypes={navigation:(global.PropTypes||guac["prop-types"]).array,usePipe:(global.PropTypes||guac["prop-types"]).bool,id:(global.PropTypes||guac["prop-types"]).string.isRequired,logo:(global.PropTypes||guac["prop-types"]).object,hasRenderedLogo:(global.PropTypes||guac["prop-types"]).bool,fullWidth:(global.PropTypes||guac["prop-types"]).bool,hasNav:(global.PropTypes||guac["prop-types"]).bool,commerce:(global.PropTypes||guac["prop-types"]).string,showUtilitiesMenu:(global.PropTypes||guac["prop-types"]).bool,hasOverhang:(global.PropTypes||guac["prop-types"]).bool,searchFormLocation:(global.PropTypes||guac["prop-types"]).oneOf([o.p,o.q,o.N,o.r]),maxLines:(global.PropTypes||guac["prop-types"]).number,styleOverrides:(global.PropTypes||guac["prop-types"]).object},s.defaultProps={maxLines:1,usePipe:!0},c.propTypes={id:(global.PropTypes||guac["prop-types"]).string.isRequired,logo:(global.PropTypes||guac["prop-types"]).object,hasRenderedLogo:(global.PropTypes||guac["prop-types"]).bool,logoData:(global.PropTypes||guac["prop-types"]).object,commerce:(global.PropTypes||guac["prop-types"]).string,showUtilitiesMenu:(global.PropTypes||guac["prop-types"]).bool,hasNav:(global.PropTypes||guac["prop-types"]).bool,renderMode:(global.PropTypes||guac["prop-types"]).string,logoAlign:(global.PropTypes||guac["prop-types"]).oneOf(["left","center"]),hasOverhang:(global.PropTypes||guac["prop-types"]).bool,scaledLogoFontSizes:(global.PropTypes||guac["prop-types"]).arrayOf((global.PropTypes||guac["prop-types"]).oneOf(Object.values((global.Core||guac["@wsb/guac-widget-core"]).constants.fontSizes))),styleOverrides:(global.PropTypes||guac["prop-types"]).object};const{fontSizes:p,layers:{Z_INDEX_NAV:n}}=(global.Core||guac["@wsb/guac-widget-core"]).constants;function i(e){const{style:t,usePipe:l,logoOverhangHeight:g,enableLogoOverhang:p,searchFormLocation:i,...u}=e,{id:d,category:y,section:b,commerce:m,navigation:h,renderMode:P,googleTranslateOptions:v,domainName:T,pageRoute:f,staticContent:w,firstWidgetBackground:C,isHomepage:L,logo:R={},isBigLogo:x,renderSecondaryHR:E,sticky:O,stickyProps:k,scaledLogoFontSizes:N,showUtilitiesMenu:B,hasRenderedLogo:U,hasLogoImage:j,hasNavBackground:S,maxLinesDesktop:I}=e,M=(global.React||guac.react).useContext(o.H),{hasNav:W}=a.g({navigation:h}),F={commerce:m,keepOpen:!0},H=o.j(R,{isBigLogo:x,isHomepage:L}),z=L&&p&&H>g;let X=null;p&&z&&!L&&(X=(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{style:{width:"100%",height:30,backgroundColor:"section","@md":{height:H-60,backgroundColor:"section"}},category:C.category||"neutral",section:C.section||"default"}));const A=U&&"center"===R.logoAlign,q=M===o.v,D=function(e){let{style:o,hasLogoImage:a,hasNavBackground:t,hasLogoOverhang:l,isWideInset:r}=e;return{navStyle:(global._||guac.lodash).merge({position:"relative",paddingVertical:a?"xsmall":"medium",paddingHorizontal:"medium","@md":{paddingVertical:r?"medium":"small",paddingHorizontal:0},backgroundColor:t?"navSolid":"transparent"},o,{zIndex:l?n+1:"auto"})}}({style:t,hasLogoImage:j,shouldCenterLogo:A,hasNavBackground:S,hasLogoOverhang:p&&z,isWideInset:q});let _=(global.React||guac.react).createElement((global.React||guac.react).Fragment,null,(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Block,{tag:"nav",style:D.navStyle,category:y,section:b},(global.React||guac.react).createElement(c,o.c({hasOverhang:z,scaledLogoFontSizes:N,hasNav:W,useLogoBackground:p},u)),(global.React||guac.react).createElement(s,o.c({usePipe:l,hasOverhang:z,scaledLogoFontSizes:N,searchFormLocation:i,hasNav:W,useLogoBackground:p,maxLines:I,styleOverrides:q?{container:{"@md":{paddingHorizontal:"xlarger"}}}:{}},u))),!L&&E&&(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.HR,{style:{margin:"0"}}));return O&&(_=(global.React||guac.react).createElement(r.S,o.c({hasAnimation:!0,navigation:h,renderMode:P,logoHeight:H},k),_)),(global.React||guac.react).createElement((global.React||guac.react).Fragment,null,_,X,(W||B)&&(global.React||guac.react).createElement(o.u,{id:d,navigation:h,renderMode:P,googleTranslateOptions:v,domainName:T,pageRoute:f,staticContent:w,searchFormProps:F,navProps:u}))}i.propTypes={style:(global.PropTypes||guac["prop-types"]).object,fullWidth:(global.PropTypes||guac["prop-types"]).bool,navigation:(global.PropTypes||guac["prop-types"]).array,id:(global.PropTypes||guac["prop-types"]).string.isRequired,commerce:(global.PropTypes||guac["prop-types"]).string,renderMode:(global.PropTypes||guac["prop-types"]).string,usePipe:(global.PropTypes||guac["prop-types"]).bool,category:(global.PropTypes||guac["prop-types"]).string,section:(global.PropTypes||guac["prop-types"]).string,googleTranslateOptions:(global.PropTypes||guac["prop-types"]).object,domainName:(global.PropTypes||guac["prop-types"]).string,pageRoute:(global.PropTypes||guac["prop-types"]).string,staticContent:(global.PropTypes||guac["prop-types"]).object,logo:(global.PropTypes||guac["prop-types"]).object,isBigLogo:(global.PropTypes||guac["prop-types"]).bool,logoOverhangHeight:(global.PropTypes||guac["prop-types"]).number,enableLogoOverhang:(global.PropTypes||guac["prop-types"]).bool,firstWidgetBackground:(global.PropTypes||guac["prop-types"]).object,isHomepage:(global.PropTypes||guac["prop-types"]).bool,renderSecondaryHR:(global.PropTypes||guac["prop-types"]).bool,sticky:(global.PropTypes||guac["prop-types"]).bool,stickyProps:(global.PropTypes||guac["prop-types"]).object,scaledLogoFontSizes:(global.PropTypes||guac["prop-types"]).arrayOf((global.PropTypes||guac["prop-types"]).oneOf(Object.values(p))),containerStyle:(global.PropTypes||guac["prop-types"]).object,hasNavBackground:(global.PropTypes||guac["prop-types"]).bool,searchFormLocation:(global.PropTypes||guac["prop-types"]).oneOf([o.p,o.q,o.N,o.r]),navContainerStyle:(global.PropTypes||guac["prop-types"]).object,useLogoBackground:(global.PropTypes||guac["prop-types"]).bool,showUtilitiesMenu:(global.PropTypes||guac["prop-types"]).bool,hasRenderedLogo:(global.PropTypes||guac["prop-types"]).bool,hasLogoImage:(global.PropTypes||guac["prop-types"]).bool,maxLinesDesktop:(global.PropTypes||guac["prop-types"]).bool},i.defaultProps={logoOverhangHeight:o.i,enableLogoOverhang:!0,firstWidgetBackground:{category:"neutral",section:"default"},sticky:!1,style:{}},e.N=i})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=index-379c558e.js.map