define("@wsb/guac-widget-shared/lib/components/SocialLinks-1397a562.js",["exports","~/c/_rollupPluginBabelHelpers"],(function(e,o){"use strict";const{socialProviders:a,socialProviderKeys:r,socialProviderTypes:{XING:p}}=(global.Core||guac["@wsb/guac-widget-core"]).constants,t=e=>{const{dataAids:t,baseProps:l,iconProps:s,showGrayIcons:i,iconSuffix:c="",staticContent:g={},socialProvidersConfig:n={},showText:d=!1}=e,{Block:u,Link:y}=(global.Core||guac["@wsb/guac-widget-core"]).UX2.Element,b=r.map((o=>{const r=n[o],l=o===p?o.toUpperCase():o.toLowerCase();return{name:a[o].name,prefix:a[o].prefix,profileId:e[o]||e[o+"Profile"],icon:l+c,dataAid:t[o.toUpperCase()],hidden:!r}})).filter((e=>{let{profileId:o}=e;return o||i}));if(!b.length)return null;const P=(global._||guac.lodash).merge({style:{display:"flex",justifyContent:"center",paddingHorizontal:"none",paddingVertical:"small",flexWrap:"wrap",rowGap:d?"medium":0,columnGap:d?"xxlarge":0}},l),f=(global._||guac.lodash).merge({size:"medium"},s),m=b.map(((e,a)=>{const r=(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Icon.Social,o._({key:a,icon:e.icon,minTarget:!0},f)),p=(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Heading.Middle,{tag:"span",key:a,children:e.name,disabled:!!i}),t=d?p:r;return i?!e.hidden&&t:(global.React||guac.react).createElement(y,{tag:"a",href:e.prefix+e.profileId,target:"_blank",rel:"noopener",key:a,"data-aid":e.dataAid,children:t,"aria-label":g[e.name]||e.name,mobileIconSize:!1,style:{"[data-typography]":{color:"inherit"}}})}));return(global.React||guac.react).createElement(u,o._({"data-aid":t.SOCIAL},P),m)};t.propTypes={dataAids:(global.PropTypes||guac["prop-types"]).object.isRequired,baseProps:(global.PropTypes||guac["prop-types"]).object,iconProps:(global.PropTypes||guac["prop-types"]).object,facebookProfile:(global.PropTypes||guac["prop-types"]).string,twitterProfile:(global.PropTypes||guac["prop-types"]).string,instagramProfile:(global.PropTypes||guac["prop-types"]).string,pinterestProfile:(global.PropTypes||guac["prop-types"]).string,linkedinProfile:(global.PropTypes||guac["prop-types"]).string,youtubeProfile:(global.PropTypes||guac["prop-types"]).string,xingProfile:(global.PropTypes||guac["prop-types"]).string,discordProfile:(global.PropTypes||guac["prop-types"]).string,twitchProfile:(global.PropTypes||guac["prop-types"]).string,tiktokProfile:(global.PropTypes||guac["prop-types"]).string,showGrayIcons:(global.PropTypes||guac["prop-types"]).bool,iconSuffix:(global.PropTypes||guac["prop-types"]).string,staticContent:(global.PropTypes||guac["prop-types"]).object,socialProvidersConfig:(global.PropTypes||guac["prop-types"]).object,showText:(global.PropTypes||guac["prop-types"]).bool},e.default=t,Object.defineProperty(e,"__esModule",{value:!0})})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=SocialLinks-1397a562.js.map