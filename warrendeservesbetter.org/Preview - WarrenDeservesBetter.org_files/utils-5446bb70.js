define("@widget/LAYOUT/c/utils-5446bb70.js",["exports","~/c/utils2","~/c/Layout"],(function(e,i,o){"use strict";const d=e=>e.map((e=>e.cta?{...e,ctaList:[e.cta]}:{...e,ctaList:[{enabled:!1}]}));e.g=(e,i)=>{const{slideshowOptions:a={},slideshowType:t=o.A,background:s={},video:n={},slides:l=[],alignmentOption:p,slideshowEnabled:m,renderMode:y,mediaType:v=o.e,videoEmbed:r,videoType:u=o.E}=e,{transition:c="fade",autoplay:g=!0,autoplayDelay:w=7,dots:b=!0,arrows:T=!1}=a,h={slides:d(l),type:t,transition:c,autoplay:g,autoplayDelay:w,dots:b,arrows:T,alignmentOption:p,themeConfig:i||{},heroIdPrefix:(global._||guac.lodash).uniqueId("slide-hero-")},f=!(n&&n.video)&&s&&s.video;return v!==o.S||"DISPLAY"!==y&&m?v===o.e&&f?{mediaType:o.V,image:s,video:s,videoEmbed:r,videoType:u}:{mediaType:v,image:s,video:f?s:n,slideshow:h,videoEmbed:r,videoType:u}:f?{mediaType:o.V,video:s,videoEmbed:r,videoType:u}:{mediaType:o.e,image:s}},e.h=e=>{const{mediaType:d,image:a,video:t,slideshow:s,videoEmbed:n}=e;return d===o.e?Boolean(a.image||a.video):d===o.V?Boolean(t.video||n&&n.vimeoId):d===o.S&&i.s(s)}})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=utils-5446bb70.js.map