define("@widget/GALLERY/c/util-2d71cf92.js",["exports"],(function(e){"use strict";e.a=function(){let{top:e,bottom:n}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};const t={"@xs-only":{}};return e||(t.paddingTop="0px !important",t["@xs-only"].paddingTop=t.paddingTop),n||(t.paddingBottom="0px !important",t["@xs-only"].paddingBottom=t.paddingBottom),t},e.b=function(e){let n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2,t=arguments.length>2&&void 0!==arguments[2]?arguments[2]:n+2;if(e<=t)return[e];const r=[];let i=t+1,o=e;for(;i>n;){i--;const n=e/i,t=Math.ceil(n);if(t>o)break;o=t;const d=Math.floor(n),a=e-d*i;r.push({cur:i,maxes:d,remainder:a})}const d=r.sort(((e,n)=>e.remainder>n.remainder?1:e.remainder<n.remainder?-1:0))[0],a=Array(d.maxes).fill(d.cur);if(0===d.remainder)return a;if(d.remainder<n){const e=a.pop()-d.remainder;a.push(e),a.push(n)}else a.push(d.remainder);return a},e.g=function(e,n,t){let r,i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"image";return"image"===i?r=[e,`rs=w:${n},h:${t},cg:true,m/cr=w:${n},h:${t},a:cc`].join(e.endsWith("/")?"":"/"):"background"===i&&(r=e.replace(/\{width\}/g,n).replace(/\{height\}/g,t)),r}})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=util-2d71cf92.js.map