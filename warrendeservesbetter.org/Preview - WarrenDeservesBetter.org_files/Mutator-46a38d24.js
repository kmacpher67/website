define("@widget/ABOUT/c/Mutator-46a38d24.js",["exports","~/c/createMutator","~/c/component","~/c/defaultProps"],(function(e,a,t,n){"use strict";class o extends a.a{render(){const{alignmentOption:e,cards:n,staticContent:o={},renderMode:i,cardDescriptionExpanded:r,enableInlineImageEdit:l,enableImageDimension:s,alignFinalRow:c=!1,numColumns:d=3}=this.props,g={enabled:!r,renderMode:i,expandIconProps:{children:o.showMore,"data-aid":a.d.ABOUT_CONTENT_DESCRIPTION_EXPAND_ICON},collapseIconProps:{children:o.showLess,"data-aid":a.d.ABOUT_CONTENT_DESCRIPTION_COLLAPSE_ICON}};return(global.React||guac.react).createElement(t.C,this.props,(global.React||guac.react).createElement((global.Core||guac["@wsb/guac-widget-core"]).UX2.Component.ContentCards,{cards:a.c(n,{alignmentOption:e,imageConfig:a.b.about1,extraProps:{text:{textCollapseProps:g}},enableInlineImageEdit:l,enableImageDimension:s}),alignFinalRow:c,numColumns:d}))}}a._(o,"displayName","About1");const{selectors:{Widget:i,utils:{createSelector:r}}}=(global.Core||guac["@wsb/guac-widget-core"]).Maniless;var l=a.e({[a.C]:{...a.f[a.C],aspectRatio:r(i.mutatorDefaultProp("about1ImageAspectRatio"),(e=>e||1)),forceFill:!0,noInitialSave:!0},routes:{[a.B]:[a.A,a.T,a.g,a.D],[a.h]:[a.i,a.j,a.k,a.l,a.m,a.n,a.o],[a.p]:[a.C,a.q],[a.r]:[a.s],[a.t]:[a.u]}});e.A=o,e.c=l})),"undefined"!=typeof window&&(window.global=window);
//# sourceMappingURL=Mutator-46a38d24.js.map