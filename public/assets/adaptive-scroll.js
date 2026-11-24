/* CreAid adaptive motion: smooth animation progress, never the document scroll position.
   Wheel deltas reveal likely input patterns, not a reliably identifiable hardware model. */
(() => {
  'use strict';
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticStory = window.matchMedia('(max-height:620px),(max-width:900px) and (max-height:700px),(prefers-reduced-motion:reduce)');
  window.CreAidMotion = Object.freeze({reduced:media,staticStory});
  const positions = new WeakMap();
  const input = {wheelAt:-Infinity,previousWheel:-Infinity,discrete:0,nativeUntil:0,touchUntil:0};
  const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
  const now = () => performance.now();

  window.addEventListener('wheel',event => {
    const t = now();
    const factor = event.deltaMode===1 ? 16 : event.deltaMode===2 ? window.innerHeight : 1;
    const delta = Math.abs(event.deltaY*factor);
    const gap = t-input.previousWheel;
    // Standard wheel: coarse steps or line/page delta modes.
    // Touchpad/Magic Mouse: mostly fine-grained, frequent pixel deltas.
    const stepped = event.deltaMode!==0 || delta>=55 || (delta>=26 && gap>48);
    input.discrete = clamp(input.discrete*.67 + (stepped ? .48 : 0),0,1);
    input.previousWheel = t;
    input.wheelAt = t;
    input.nativeUntil = 0;
  },{passive:true});

  const navigationKeys = new Set(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ']);
  window.addEventListener('keydown',event => {
    if(navigationKeys.has(event.key)) input.nativeUntil = now()+700;
  },{passive:true});
  window.addEventListener('pointerdown',event => {
    if(event.pointerType==='touch') input.touchUntil=now()+850;
  },{passive:true});
  window.addEventListener('pointermove',event => {
    if(event.pointerType==='touch') input.touchUntil=now()+500;
  },{passive:true});
  window.addEventListener('pointerup',event => {
    if(event.pointerType==='touch') input.touchUntil=now()+400;
  },{passive:true});

  function progress(element,target) {
    target=clamp(Number(target)||0,0,1);
    const t=now();
    let current=positions.get(element);
    if(!current){
      current={value:target,time:t};
      positions.set(element,current);
      return {value:target,pending:false};
    }
    const dt=clamp(t-current.time,1,64);
    current.time=t;
    const hasWheel=t-input.wheelAt<430;
    const native=media.matches || t<input.nativeUntil || t<input.touchUntil || !hasWheel;
    if(native) {
      current.value=target;
      return {value:target,pending:false};
    }
    // Faster response to high-resolution input, gentler easing for discrete wheel steps.
    const duration=42 + 154*input.discrete;
    const weight=1-Math.exp(-dt/duration);
    current.value+= (target-current.value)*weight;
    if(Math.abs(target-current.value)<.0006)current.value=target;
    return {value:current.value,pending:Math.abs(target-current.value)>.0006};
  }
  window.CreAidAdaptiveScroll=Object.freeze({
    progress,
    reset(element){if(element)positions.delete(element)},
    getMode(){
      const t=now();
      if(media.matches)return 'reduced';
      if(t<input.touchUntil)return 'touch';
      if(t<input.nativeUntil)return 'keyboard';
      if(t-input.wheelAt>430)return 'native';
      return input.discrete>.45?'stepped':'continuous';
    }
  });
})();
