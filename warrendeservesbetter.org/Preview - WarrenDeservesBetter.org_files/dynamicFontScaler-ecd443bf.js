define("@wsb/guac-widget-shared/c/dynamicFontScaler-ecd443bf.js",["exports"],(function(e){"use strict";const t={wordWrap:"normal !important",overflowWrap:"normal !important",display:"none",visibility:"hidden",position:"absolute",width:"auto",overflow:"visible",left:0};e.d=function(e){let{text:a,containerId:n,font:o,fontSizes:i,style:r,Tag:l=(global.Core||guac["@wsb/guac-widget-core"]).UX2.Element.Element,typography:c,targetId:d,maxLines:s=3,prioritizeDefault:g}=e;const p={containerId:n,targetId:d,fontSizes:i,maxLines:s,prioritizeDefault:g};return{element:(global.React||guac.react).createElement((global.React||guac.react).Fragment,null,i.map((e=>(global.React||guac.react).createElement(l,{tag:"span",key:e,font:o,style:{...r,...t,fontSize:e},"data-size":e,"data-scaler-id":`scaler-${n}`,typography:c,"data-ux":"scaler","aria-hidden":!0},a)))),scriptProps:p,callback:()=>window.wsb.DynamicFontScaler(p)}}})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=dynamicFontScaler-ecd443bf.js.map