/* Read-only DOM/stacking diagnosis, called by the one controller browser. */
'use strict';
async function run(page){return page.evaluate(()=>{
 const lisa=document.querySelector('.mg-shop .mg-lisa-placed'),root=document.querySelector('.mg-shop');
 if(!lisa||!root)return {exists:false};
 const rect=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};},b=rect(lisa),cs=getComputedStyle(lisa),children=Array.from(root.children);
 function overlap(a,b){return a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;}
 return {exists:true,className:lisa.className,inline:lisa.getAttribute('style'),rect:b,svgCount:lisa.querySelectorAll('svg').length,svgGeometry:lisa.querySelectorAll('svg path,svg circle,svg ellipse').length,style:{display:cs.display,visibility:cs.visibility,opacity:cs.opacity,position:cs.position,zIndex:cs.zIndex},rootStyle:{opacity:getComputedStyle(root).opacity,visibility:getComputedStyle(root).visibility},domIndex:children.indexOf(lisa),overlappingSiblings:children.map((n,index)=>{const c=getComputedStyle(n);return {index,className:n.className,rect:rect(n),display:c.display,visibility:c.visibility,opacity:c.opacity,position:c.position,zIndex:c.zIndex,backgroundColor:c.backgroundColor,pointerEvents:c.pointerEvents};}).filter(n=>n.index!==children.indexOf(lisa)&&overlap(n.rect,b))};
 });}
module.exports={run};
