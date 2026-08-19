(()=>{'use strict';
let tool='move',gesture=null,pinch=null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(e._v42);e._v42=setTimeout(()=>e.classList.remove('show'),1400)}
function setTool(next){tool=next;$$('.floating-tools [data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));toast(tool==='move'?'Mover peça':tool==='rotate'?'Girar peça':'Escalar peça')}
$$('.floating-tools [data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
function selectedInputs(){return{r:$('#ppR'),s:$('#ppS'),x:$('#ppX'),y:$('#ppY')}}
function fire(el){el.dispatchEvent(new Event('change',{bubbles:true}))}
const wrap=$('#viewportWrap');
if(wrap){
 wrap.addEventListener('pointerdown',e=>{
  if(tool==='move')return;
  const i=selectedInputs();if(!i.r||!i.s){toast('Selecione uma peça primeiro');return}
  e.preventDefault();e.stopImmediatePropagation();wrap.setPointerCapture?.(e.pointerId);
  const rect=wrap.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,cx,cy,startR:+i.r.value||0,startS:+i.s.value||1,startAngle:Math.atan2(e.clientY-cy,e.clientX-cx),startDist:Math.max(20,Math.hypot(e.clientX-cx,e.clientY-cy))};
 },true);
 wrap.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const i=selectedInputs();
  if(tool==='rotate'){const a=Math.atan2(e.clientY-gesture.cy,e.clientX-gesture.cx);i.r.value=Math.round((gesture.startR+(a-gesture.startAngle)*180/Math.PI)*10)/10;fire(i.r)}
  else if(tool==='scale'){const d=Math.max(10,Math.hypot(e.clientX-gesture.cx,e.clientY-gesture.cy));i.s.value=Math.max(.05,Math.min(10,gesture.startS*d/gesture.startDist)).toFixed(2);fire(i.s)}
 },true);
 const end=e=>{if(gesture&&gesture.id===e.pointerId){e.preventDefault();e.stopImmediatePropagation();gesture=null}};
 wrap.addEventListener('pointerup',end,true);wrap.addEventListener('pointercancel',end,true);
 wrap.addEventListener('touchstart',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)};e.preventDefault()}},{passive:false});
 wrap.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),delta=d-pinch.d;wrap.dispatchEvent(new WheelEvent('wheel',{deltaY:-delta,bubbles:true,cancelable:true}));pinch.d=d;e.preventDefault()}},{passive:false});
 wrap.addEventListener('touchend',()=>pinch=null,{passive:true});
}
// Snap visual: holding Shift while moving uses a 10px grid through the quick inspector.
window.addEventListener('keydown',e=>{if(e.key==='r'||e.key==='R')setTool('rotate');if(e.key==='s'||e.key==='S')setTool('scale');if(e.key==='v'||e.key==='V')setTool('move')});
// Bigger mobile hit targets and a compact contextual hint.
const hint=document.createElement('div');hint.className='gesture-hint';hint.innerHTML='<b>Gestos</b><span>1 dedo: ferramenta ativa · 2 dedos: zoom · V mover · R girar · S escala</span>';document.body.appendChild(hint);
setTimeout(()=>hint.classList.add('fade'),5000);
})();