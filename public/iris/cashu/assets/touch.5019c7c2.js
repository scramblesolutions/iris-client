import{B as i,E as l,k as n,I as u}from"./index.f0702a55.js";var c=i({name:"QToolbarTitle",props:{shrink:Boolean},setup(t,{slots:e}){const r=l(()=>"q-toolbar__title ellipsis"+(t.shrink===!0?" col-shrink":""));return()=>n("div",{class:r.value},u(e.default))}});const o={left:!0,right:!0,up:!0,down:!0,horizontal:!0,vertical:!0},a=Object.keys(o);o.all=!0;function f(t){const e={};for(const r of a)t[r]===!0&&(e[r]=!0);return Object.keys(e).length===0?o:(e.horizontal===!0?e.left=e.right=!0:e.left===!0&&e.right===!0&&(e.horizontal=!0),e.vertical===!0?e.up=e.down=!0:e.up===!0&&e.down===!0&&(e.vertical=!0),e.horizontal===!0&&e.vertical===!0&&(e.all=!0),e)}const s=["INPUT","TEXTAREA"];function h(t,e){return e.event===void 0&&t.target!==void 0&&t.target.draggable!==!0&&typeof e.handler=="function"&&s.includes(t.target.nodeName.toUpperCase())===!1&&(t.qClonedBy===void 0||t.qClonedBy.indexOf(e.uid)===-1)}export{c as Q,f as g,h as s};
