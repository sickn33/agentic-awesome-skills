/* ============================================================================
   layout-audit.js — deterministic layout metrics that MEDIATE the eye.

   Run via Playwright MCP `browser_evaluate` on a rendered page. It does TWO things:
     1. returns a compact JSON of measured findings (geometry, contrast, tap, balance)
     2. DRAWS those findings as an SVG overlay onto the page, so the very next
        `browser_take_screenshot` is an ANNOTATED screenshot.

   The annotated screenshot is the whole point. You MUST view it and reason over the
   picture + the numbers together — the metric tells you WHERE to look; your eyes
   decide whether each flag is a real defect or an intentional choice (an avatar on a
   banner "collides"; a brutalist overlap is the design). NEVER auto-fail on a count,
   and never accept a metric you haven't looked at. The number points; the eye decides.

   Usage (Playwright MCP):
     browser_evaluate({ function: "() => { <paste this whole file> ; return __audit({}); }" })
     browser_take_screenshot()          // <-- now shows the overlay; LOOK at it
   Options (pass to __audit):
     { align: '.card .title, .card .price',  // selector whose left edges SHOULD align
       space: '.feature-list',               // container whose children's vertical rhythm to check
       draw: true }                          // set false to measure without drawing
   Re-run __clearAudit() to remove the overlay.
   ============================================================================ */
function __audit(opts){
  opts = opts || {};
  const DRAW = opts.draw !== false;
  const COL = {collision:'#e0245e',align:'#d98a00',spacing:'#2f7fd6',contrast:'#8a2be2',tap:'#159a4d',balance:'#111'};
  const vis = el => { const s=getComputedStyle(el); return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length>0; };
  const R = el => { const r=el.getBoundingClientRect();
    return {el,x:r.left,y:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom,cx:r.left+r.width/2,cy:r.top+r.height/2}; };

  // ---- content set: visible, sized, leaf-ish "ink" elements (skip layout wrappers) ----
  const CONTENT = (opts.contentSelector
      ? [...document.querySelectorAll(opts.contentSelector)]
      : [...document.querySelectorAll('h1,h2,h3,h4,p,li,img,svg,button,a,input,label,figure,blockquote,[class*="card"],[class*="tile"],[class*="btn"],[class*="hero"],[class*="banner"],[class*="panel"],[class*="badge"],[class*="chip"],[class*="thumb"],[class*="avatar"]')])
    .filter(vis).map(R).filter(it=>it.w>=8&&it.h>=8&&it.w<innerWidth*1.5);

  // 1. COLLISION — content rects overlapping ≥12% of the smaller (skip ancestor/descendant)
  const collisions=[];
  for(let i=0;i<CONTENT.length;i++)for(let j=i+1;j<CONTENT.length;j++){
    const a=CONTENT[i],b=CONTENT[j];
    if(a.el.contains(b.el)||b.el.contains(a.el))continue;
    const ix=Math.max(0,Math.min(a.r,b.r)-Math.max(a.x,b.x)), iy=Math.max(0,Math.min(a.b,b.b)-Math.max(a.y,b.y));
    if(ix*iy<=0)continue;
    if(ix*iy/Math.min(a.w*a.h,b.w*b.h)>0.12) collisions.push([a,b]);
  }

  // 2. ALIGNMENT near-miss — only meaningful when scoped to elements that SHOULD share a line
  let nearmiss=[], guides=[];
  if(opts.align){
    const els=[...document.querySelectorAll(opts.align)].filter(vis).map(R).sort((a,b)=>a.x-b.x);
    let cur=[]; const cl=[];
    els.forEach(e=>{ if(cur.length&&e.x-cur[cur.length-1].x>11){cl.push(cur);cur=[];} cur.push(e); });
    if(cur.length)cl.push(cur);
    cl.forEach(c=>{ if(c.length<2)return;
      const xs=c.map(e=>e.x).sort((a,b)=>a-b), med=xs[(xs.length/2)|0], spread=xs[xs.length-1]-xs[0];
      guides.push(med); if(spread<=0.8||spread>10)return;
      c.forEach(e=>{ if(Math.abs(e.x-med)>0.8) nearmiss.push({x:e.x,med,y:e.y,b:e.b,cy:e.cy,off:Math.round(e.x-med)}); });
    });
  }

  // 3. SPACING rhythm — vertical gaps among a container's direct children
  let spacing={gaps:[],cov:0,outliers:[]};
  if(opts.space){ const cont=document.querySelector(opts.space);
    if(cont){ const kids=[...cont.children].filter(vis).map(R).sort((a,b)=>a.y-b.y), gaps=[];
      for(let i=0;i<kids.length-1;i++){const g=kids[i+1].y-kids[i].b; if(g>-6&&g<400)gaps.push({g:Math.round(g),a:kids[i],b:kids[i+1]});}
      if(gaps.length>=2){ const v=gaps.map(o=>o.g),mn=v.reduce((s,x)=>s+x,0)/v.length,
        sd=Math.sqrt(v.reduce((s,x)=>s+(x-mn)**2,0)/v.length);
        spacing={gaps,cov:mn?Math.abs(sd/mn):0,mean:mn,outliers:gaps.filter(o=>Math.abs(o.g-mn)>Math.max(6,Math.abs(mn)*0.5))}; }
    }
  }

  // 4. CONTRAST — WCAG ratio of text vs effective background
  const rgb=s=>{const m=(s||'').match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(parseFloat);return{r:p[0],g:p[1],b:p[2],a:p[3]??1};};
  const ebg=el=>{let n=el;while(n&&n.nodeType===1){const c=rgb(getComputedStyle(n).backgroundColor);if(c&&c.a>0.5)return c;n=n.parentElement;}return{r:255,g:255,b:255,a:1};};
  const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
  const ratio=(a,b)=>{const L1=lum(a),L2=lum(b),hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+.05)/(lo+.05);};
  const contrast=[];
  [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,span,li,button,label,td,th,figcaption,small,strong,em')].filter(vis).forEach(el=>{
    const t=(el.childNodes.length&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));if(!t)return;
    const cs=getComputedStyle(el),fg=rgb(cs.color);if(!fg)return;
    const ra=ratio(fg,ebg(el)),px=parseFloat(cs.fontSize),wt=parseInt(cs.fontWeight)||400,large=px>=24||(px>=18.66&&wt>=700);
    if(ra < (large?3:4.5)){const r=R(el);contrast.push({x:r.x,y:r.y,w:r.w,h:r.h,ratio:Math.round(ra*10)/10,large});}
  });

  // 5. TAP — interactive targets under 44×44 (Apple HIG)
  const tap=[...document.querySelectorAll('a,button,[role="button"],input:not([type="hidden"]),select,textarea,[onclick]')]
    .filter(vis).map(R).filter(it=>it.w<44||it.h<44);

  // 6. BALANCE — ink-density-weighted centroid (box-model ESTIMATE) vs optical center (0.50,0.46)
  // NOTE: this is the cheap model. For ground truth, screenshot and run a pixel-centroid (see SKILL §6).
  const DENS={H1:.82,H2:.62,H3:.5,H4:.45,P:.16,LI:.16,IMG:.5,SVG:.5,BUTTON:.7,A:.4};
  const dens=el=>el.tagName in DENS?DENS[el.tagName]:0.3;
  let W=0,Mx=0,My=0; const pw=document.documentElement.scrollWidth, ph=document.documentElement.scrollHeight;
  CONTENT.forEach(it=>{const w=it.w*it.h*dens(it.el);W+=w;Mx+=w*(it.cx+scrollX);My+=w*(it.cy+scrollY);});
  const balance = W?{cx:Mx/W/pw,cy:My/W/ph}:{cx:.5,cy:.46};
  balance.off=Math.hypot(balance.cx-0.5,balance.cy-0.46);

  // 7. OVERFLOW — horizontal scroll (the §4 gate)
  const overflow=Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ---- draw overlay (this is what makes the next screenshot annotated) ----
  __clearAudit();
  if(DRAW){
    const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg');
    svg.id='__auditOverlay';
    Object.assign(svg.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:2147483647,pointerEvents:'none'});
    const add=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(a._t)e.textContent=a._t;svg.appendChild(e);};
    collisions.forEach(([a,b])=>[a,b].forEach(it=>add('rect',{x:it.x,y:it.y,width:it.w,height:it.h,fill:COL.collision+'22',stroke:COL.collision,'stroke-width':2.5})));
    guides.forEach(x=>add('line',{x1:x,y1:0,x2:x,y2:innerHeight,stroke:COL.align,'stroke-width':1,'stroke-dasharray':'6 5','opacity':.6}));
    nearmiss.forEach(n=>{add('line',{x1:n.x,y1:n.y,x2:n.x,y2:n.b,stroke:COL.align,'stroke-width':3});add('text',{x:n.x+8,y:n.cy+4,fill:COL.align,'font-family':'monospace','font-size':13,_t:(n.off>=0?'+':'')+n.off+'px'});});
    spacing.gaps.forEach(o=>{const bad=spacing.outliers.includes(o),x=Math.min(o.a.x,o.b.x)-16;add('line',{x1:x,y1:o.a.b,x2:x,y2:o.b.y,stroke:bad?COL.collision:COL.spacing,'stroke-width':bad?3.5:2});add('text',{x:x-7,y:(o.a.b+o.b.y)/2+4,fill:bad?COL.collision:COL.spacing,'font-family':'monospace','font-size':13,'text-anchor':'end',_t:o.g});});
    contrast.forEach(c=>{add('rect',{x:c.x-2,y:c.y-2,width:c.w+4,height:c.h+4,fill:'none',stroke:COL.contrast,'stroke-width':2,'stroke-dasharray':'3 3'});add('rect',{x:c.x,y:c.y-19,width:64,height:17,fill:COL.contrast});add('text',{x:c.x+4,y:c.y-6,fill:'#fff','font-family':'monospace','font-size':12,_t:c.ratio+':1 ✗'});});
    tap.forEach(it=>{add('rect',{x:it.x,y:it.y,width:it.w,height:it.h,fill:'none',stroke:COL.tap,'stroke-width':2.5});add('text',{x:it.x,y:it.b+13,fill:COL.tap,'font-family':'monospace','font-size':12,_t:Math.round(it.w)+'×'+Math.round(it.h)});});
    document.body.appendChild(svg);
  }

  // ---- JSON summary, split by KIND. The metric is never a verdict on its own. ----
  return {
    // GATES — correctness (accessibility/usability facts). Safe to block on; gates_pass must hold.
    gates: { overflow_px: overflow, contrast_fails: contrast.length, tap_too_small: tap.length },
    gates_pass: overflow===0 && contrast.length===0 && tap.length===0,
    // REVIEW — usually a real defect, but can be intentional (deliberate overlap). Eye-confirm; do NOT auto-fail.
    collisions: collisions.length,
    // SIGNALS — convention, NOT correctness. High score = closer to the symmetric/regular MEAN (§2).
    // Deviation is often the better design. Use to catch accidents; never auto-correct toward symmetry.
    signals: { balance_offset:+balance.off.toFixed(3), balance_centroid:[+balance.cx.toFixed(3),+balance.cy.toFixed(3)],
               align_nearmiss: nearmiss.length, spacing_cov:+spacing.cov.toFixed(2) },
    contrast_detail: contrast.map(c=>({ratio:c.ratio, large:c.large})),
    note: 'These are HEURISTICS. (1) LOOK at the annotated screenshot — a flag marks WHERE to look, never a verdict. '
        + '(2) GATES (overflow/contrast/tap) are correctness — fix them. (3) SIGNALS (balance/alignment/spacing) measure '
        + 'CONVENTION = the generic mean; off-center balance, deliberate misalignment, uneven rhythm are creative tools — '
        + 'do NOT "fix" a signal toward symmetry unless the eye judges the deviation worse. Maximizing signals designs the mean. '
        + '(4) collisions: usually a bug, sometimes intentional (overlap aesthetics) — eye-confirm. '
        + 'gates_pass is necessary, not sufficient; a passing layout can still be generic.'
  };
}
function __clearAudit(){ const o=document.getElementById('__auditOverlay'); if(o)o.remove(); }
