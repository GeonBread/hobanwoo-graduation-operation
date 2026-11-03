(() => {
  'use strict';
  let W=922,H=960;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  let seed=240601;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const FOCUS={x:.51,y:.245},CORRUPTION_FOCUS={x:.5,y:.5},BUILDING_CAMERA={zoom:1,x:.5,y:5/7},SKY_CAMERA={zoom:1,x:.5,y:2/7};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const stars=Array.from({length:90},()=>{
    const a=rnd()*Math.PI*2,r=Math.sqrt(rnd()),x=.51+Math.cos(a)*r*.46,y=.23+Math.sin(a)*r*.205;
    const dx=FOCUS.x-x,dy=FOCUS.y-y,bend=(rnd()-.5)*.85,turn=(rnd()-.5)*.45;
    return {x,y,r:.8+rnd()*1.6,phase:rnd()*6.28,depart:.18+rnd()*1.35,travel:2.1+rnd()*1.1,power:1.05+rnd()*.65,
      c1:{x:x+dx*.2-dy*bend,y:y+dy*.2+dx*bend},c2:{x:FOCUS.x-dx*.24+dy*turn,y:FOCUS.y-dy*.24-dx*turn}};
  }).sort((a,b)=>b.y-a.y);
  stars.forEach((s,i)=>{s.birth=.35+i*.035+rnd()*.08;});
  // Build fracture geometry from the CURRENT canvas dimensions. The original
  // 922x960 coordinates are invalid once the cinematic enters a wide viewport.
  let crackLayout=null;
  function createCrackLayout(width,height){
    const cx=width*.5,cy=height*.5,shortSide=Math.min(width,height);
    let state=0x6d2b79f5;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const point=(x,y)=>({x,y});
    const targets=[];
    // All four corners and three landmarks on EACH side are mandatory,
    // but the total ray count should stay restrained so the fracture does not
    // become visually noisy.
    for(const [x,y] of [[0,0],[width,0],[width,height],[0,height]])targets.push({x,y,mandatory:true});
    for(const ratio of [.24,.5,.76]){
      targets.push({x:width*ratio,y:0,mandatory:true});
      targets.push({x:width*ratio,y:height,mandatory:true});
      targets.push({x:0,y:height*ratio,mandatory:true});
      targets.push({x:width,y:height*ratio,mandatory:true});
    }
    // Add only a small number of extra directions to avoid an overly dense spiderweb.
    for(let i=0;i<8;i++){
      const angle=(i+(random()-.5)*.56)*Math.PI*2/8;
      const ux=Math.cos(angle),uy=Math.sin(angle);
      const span=Math.min(ux>1e-6?(width-cx)/ux:ux < -1e-6?-cx/ux:Infinity,
                          uy>1e-6?(height-cy)/uy:uy < -1e-6?-cy/uy:Infinity);
      const x=cx+span*ux,y=cy+span*uy;
      const duplicate=targets.some(q=>Math.hypot(q.x-x,q.y-y)<shortSide*.075);
      if(!duplicate)targets.push({x,y,mandatory:false});
    }
    function jaggedPath(from,to,steps,roughness,extension=0){
      const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1;
      const nx=-dy/length,ny=dx/length,ux=dx/length,uy=dy/length;
      const points=[point(from.x,from.y)];
      let drift=0;
      for(let k=1;k<steps;k++){
        const u=k/steps;
        // A bounded random walk makes genuine zigzags instead of smooth rays.
        // Near the center, even small lateral drift can make adjacent rays
        // intersect and their falling polygons overlap. Bound the offset by
        // traveled radius so sector boundaries stay non-intersecting.
        const maxJitter=Math.min(roughness*.68,length*u*.022);
        drift=clamp(drift+(random()-.5)*maxJitter*.7,-maxJitter*.62,maxJitter*.62);
        const jag=(random()-.5)*maxJitter*.55+drift;
        points.push(point(from.x+dx*u+nx*jag,from.y+dy*u+ny*jag));
      }
      points.push(point(to.x,to.y)); // guaranteed, exact viewport edge/corner
      if(extension)points.push(point(to.x+ux*extension,to.y+uy*extension));
      return points;
    }
    const rays=targets.map((target,i)=>{
      const a=Math.atan2(target.y-cy,target.x-cx);
      const distance=Math.hypot(target.x-cx,target.y-cy),steps=Math.max(12,Math.ceil(distance/52));
      const points=jaggedPath(point(cx,cy),target,steps,Math.min(52,shortSide*.054),Math.max(55,shortSide*.09));
      const branches=[];
      const count=target.mandatory?(random()>.5?1:0):(random()>.82?1:0);
      for(let j=0;j<count;j++){
        const anchorIndex=3+Math.floor(random()*Math.max(1,points.length-7));
        const anchor=points[Math.min(anchorIndex,points.length-3)];
        const direction=a+(random()>.5?1:-1)*(.39+random()*.73);
        const bx=Math.cos(direction),by=Math.sin(direction);
        const edgeDistance=Math.min(bx>1e-6?(width-anchor.x)/bx:bx < -1e-6?-anchor.x/bx:Infinity,
                                    by>1e-6?(height-anchor.y)/by:by < -1e-6?-anchor.y/by:Infinity);
        const reach=edgeDistance*(.59+random()*.49);
        const end=point(anchor.x+bx*reach,anchor.y+by*reach);
        const branchSteps=Math.max(5,Math.ceil(reach/55));
        const path=jaggedPath(anchor,end,branchSteps,Math.min(20,shortSide*.021),0);
        const start=.18+anchorIndex/(points.length-1)*1.72+random()*.16;
        branches.push({points:path,start,width:1.25+random()*0.55});
      }
      const corner=i<4;
      return {points,branches,delay:corner?0:(i<16?.06+random()*.12:.12+random()*.16),width:corner?3.6:target.mandatory?3.05:2.55};
    });
    return {width,height,cx,cy,rays};
  }
  function currentCrackLayout(){
    if(!crackLayout||crackLayout.width!==W||crackLayout.height!==H)crackLayout=createCrackLayout(W,H);
    return crackLayout;
  }
  const campus=new Image(),core=new Image();campus.src='/assets/chapter1/story/prologue/campus_night.png';core.src='/assets/chapter1/story/prologue/core_interior.png';campus.decode?.().catch(()=>{});core.decode?.().catch(()=>{});
  let layer,canvas,ctx,title,stage,style,mode='',start=0,skyStart=0,raf=null,lastFrame=0,snapshot=null,fragments=[];
  let camera={...BUILDING_CAMERA},gatherFrom={...SKY_CAMERA},gatherSkyAge=4;
  function rewrite(segments){
    if(segments.prologue?.[0]?.prologueV2)return;
    const old=segments.prologue||[],i=old.findIndex(x=>x.effect==='scene-preview'&&x.scene?.id==='prologue-entrance-day');
    if(i<0)throw Error('Original admission-day scene missing; revised opening was not inserted.');
    const fx=(beat,ms)=>({effectOnly:true,effect:'prologue-v2',effectDuration:ms,prologueV2:beat});
    const line=(beat,text)=>({left:null,right:null,speaker:'narrator',text,illustration:null,prologueV2:beat});
    segments.prologue=[fx('awakening',3600),
      line('campus','경북대학교에는 오래전부터 눈에 보이지 않는 특별한 별빛이 흐르고 있었다.'),
      line('campus','수많은 학생의 꿈과 노력, 그리고 그들이 학교에서 보내온 시간들.'),
      line('sky','그 모든 것은 보이지 않는 별빛이 되어 학교 곳곳에 쌓여갔다.'),fx('gather',7600),
      line('threshold','그리고 그 모든 별빛이 모이는 곳에는,'),line('threshold','현실의 누구도 볼 수 없는 거대한 공간이 존재했다.'),
      fx('core-approach',3100),fx('core-reveal',5000),fx('core-title',4400),
      line('orbits','그 안에는 학생들의 대학생활과 이어진 수많은 코어 영역이 존재했다.'),
      line('connections','각각의 영역은 서로 연결되어, 보이지 않는 곳에서 별빛의 흐름을 이어가고 있었다.'),
      line('seed','하지만 어느 날.'),line('growth','정체를 알 수 없는 오염이 그 빛에 스며들기 시작했다.'),
      fx('burst',1800),fx('fracture',4000),fx('shatter',2600),
      line('void','그것은 학생들의 혼란과 불안, 그리고 압박을 뒤틀며 점차 영역들을 잠식해 갔다.'),fx('reality-return',2200),
      line('reality','그리고 그 영향은, 마침내 현실의 학교에도 나타나기 시작했다.'),
      line('library-error','도서관에서는 학생증 인증 오류로 출입문이 열리지 않아, 학생들이 입구에서 발길을 멈춰야 했다.'),
      line('navigation-error','강의동의 길 안내는 엉뚱한 방향을 가리켰고, 학생들은 강의실을 찾지 못한 채 복도를 헤맸다.'),
      line('notification-error','휴대전화에는 공지사항이 쉴 새 없이 쏟아져, 정작 필요한 안내를 찾기조차 어려워졌다.'),
      line('notification-error','그러나 대부분의 학생들은 그것을 단순한 시스템 오류로 여길 뿐이었다.'),fx('reality-out',1000),...v7AdmissionTail(old.slice(i))];
  }
  function mount(target){
    stage=target;
    if(!style?.isConnected){style=document.createElement('style');style.textContent="\n      .prologue-v2-layer{position:absolute;inset:0;z-index:200;pointer-events:none;background:#000;overflow:hidden;container-type:inline-size}\n      .prologue-v2-layer canvas{display:block;width:100%;height:100%}\n      .has-prologue-v2 #dialogueLayer{z-index:250!important}\n      .has-prologue-v2 #sceneLocation,.has-prologue-v2 #sceneChapter,.has-prologue-v2 #sceneTitle,.has-prologue-v2 #sceneSubtitle{visibility:hidden!important}\n      .prologue-v2-title{position:absolute;left:5%;right:5%;top:40%;padding:24px 12px;text-align:center;color:#fff8e3;font-family:\"Noto Sans KR\",\"Malgun Gothic\",sans-serif;font-size:clamp(30px,6.1cqw,60px);font-weight:900;line-height:1.35;letter-spacing:.12em;background:linear-gradient(90deg,transparent,#030711ed 17%,#030711ed 83%,transparent);text-shadow:0 3px 3px #000,0 0 4px #000;opacity:0}\n      .prologue-v2-title::before,.prologue-v2-title::after{content:\"\";position:absolute;left:16%;right:16%;height:1px;background:linear-gradient(90deg,transparent,#e5c47b,transparent)}\n      .prologue-v2-title::before{top:0}.prologue-v2-title::after{bottom:0}\n    ";style.textContent += "\n/* CH1_CORE_V5_STYLE */\n@font-face{font-family:CoreTitleSerif;src:url('/assets/chapter1/story/prologue/core-title-serif.woff') format('woff');font-style:normal;font-weight:500;font-display:swap}\n.is-core-v5 .prologue-v2-layer::after{content:\"\";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 40%,rgba(13,12,10,.06) 53%,rgba(10,14,18,.58) 80%,rgba(7,12,17,.84) 100%)}\n.prologue-v2-title{left:8%!important;right:8%!important;top:auto!important;bottom:14%!important;z-index:2;padding:0!important;border:0!important;background:none!important;text-align:left!important;font-weight:500!important;letter-spacing:normal!important;text-shadow:none!important;line-height:1.4!important}\n.prologue-v2-title::before,.prologue-v2-title::after{display:none!important}\n.core-v5-kicker{display:flex;align-items:center;gap:12px;color:#e6c185;font:500 clamp(11px,1.45cqw,14px)/1.4 CoreTitleSerif,\"Batang\",serif;letter-spacing:.24em}\n.core-v5-mark{width:32px;height:32px;flex:none;filter:drop-shadow(0 0 7px #c59b5655)}\n.core-v5-main{display:block;margin:12px 0 22px;font-family:CoreTitleSerif,\"Noto Serif KR\",\"Batang\",serif;font-size:clamp(34px,6.7cqw,64px);font-style:normal;font-weight:500;line-height:1.35;letter-spacing:.14em;color:#fff2cf;text-shadow:0 2px 20px #05080b66}\n.core-v5-rule{display:block;position:relative;width:min(330px,80%);height:1px;transform-origin:left;background:linear-gradient(90deg,#e5c380dd,#d1ac5f66 60%,transparent)}\n.core-v5-rule::before{content:\"\";position:absolute;left:0;top:-2px;width:5px;height:5px;transform:rotate(45deg);background:#e5c380}\n.core-v5-caption{display:block;margin-top:16px;color:#e6dec9;font:400 clamp(12px,1.65cqw,16px)/1.8 CoreTitleSerif,\"Batang\",serif;letter-spacing:.09em}\n.prologue-v2-layer[data-beat=\"core-title\"] .core-v5-kicker{animation:coreV5TextIn 1s .1s both}\n.prologue-v2-layer[data-beat=\"core-title\"] .core-v5-main{animation:coreV5TextIn 1.5s .25s both}\n.prologue-v2-layer[data-beat=\"core-title\"] .core-v5-rule{animation:coreV5LineIn 1.3s .5s both}\n.prologue-v2-layer[data-beat=\"core-title\"] .core-v5-caption{animation:coreV5TextIn 1.2s .7s both}\n@keyframes coreV5TextIn{from{opacity:0;transform:translateY(12px);filter:blur(3px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}\n@keyframes coreV5LineIn{from{opacity:0;transform:scaleX(.15)}to{opacity:1;transform:scaleX(1)}}\n@media(prefers-reduced-motion:reduce){.core-v5-kicker,.core-v5-main,.core-v5-rule,.core-v5-caption{animation:none!important}}\n";stage.appendChild(style);}
    if(!layer?.isConnected){layer=document.createElement('div');layer.className='prologue-v2-layer';layer.setAttribute('aria-hidden','true');canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d',{alpha:false});title=document.createElement('div');title.className='prologue-v2-title';title.innerHTML="<span class=\"core-v5-kicker\"><svg class=\"core-v5-mark\" viewBox=\"0 0 40 40\" aria-hidden=\"true\"><circle cx=\"20\" cy=\"20\" r=\"15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\".65\"/><ellipse cx=\"20\" cy=\"20\" rx=\"18\" ry=\"6.5\" transform=\"rotate(-30 20 20)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\".65\"/><path d=\"M20 11L22 18L29 20L22 22L20 29L18 22L11 20L18 18Z\" fill=\"currentColor\"/></svg><span>별빛이 모이는 중심</span></span><span class=\"core-v5-main\">첨성대 코어</span><span class=\"core-v5-rule\" aria-hidden=\"true\"></span><span class=\"core-v5-caption\">학사의 흐름을 잇는 성소</span>";layer.append(canvas,title);stage.appendChild(layer);}
    layer.hidden=false;stage.classList.add('has-prologue-v2');
  }
  function present(item,target){
    if(!item?.prologueV2){clear();return;}mount(target);const now=performance.now(),next=item.prologueV2;
    v7SyncPresentation(next,item);
    stage.classList.toggle('is-core-v5',['core-reveal','core-title','orbits','connections','seed','growth','burst','fracture','shatter'].includes(next));
    if(mode!==next){
      beginRealityCG(next,now);
      if(next==='shatter'){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);drawCore(1,10,4);gas(6,1);drawCracks(4);makeFragments();}
      if(next==='sky'){skyStart=now;camera={...BUILDING_CAMERA};}
      if(next==='awakening'||next==='campus')camera={...BUILDING_CAMERA};
      if(next==='gather'){
        gatherFrom=mode==='sky'?skyCamera((now-start)/1000):{...SKY_CAMERA};
        gatherSkyAge=mode==='sky'?Math.max(0,(now-skyStart)/1000):4;
      }
      mode=next;start=now;layer.dataset.beat=mode;
    }
    title.style.opacity='0';if(raf===null){lastFrame=now;raf=requestAnimationFrame(tick);}
  }
  function clear(){v7ResetPresentation();resetRealityCG();if(raf!==null)cancelAnimationFrame(raf);raf=null;if(layer)layer.hidden=true;stage?.classList.remove('has-prologue-v2','is-core-v5');mode='';snapshot=null;fragments=[];camera={...BUILDING_CAMERA};}
  function cover(image,zoom=1,pan=0,alpha=1){if(!image.complete||!image.naturalWidth)return;const s=Math.max(W/image.naturalWidth,H/image.naturalHeight)*zoom,w=image.naturalWidth*s,h=image.naturalHeight*s;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(image,(W-w)/2,(H-h)/2+pan,w,h);ctx.restore();}
  // 3.1-second voyage: the camera travels along converging starlight into
  // the sealed core, rather than just fading in a static background.
  const gatewayParticles=Array.from({length:154},(_,i)=>{
    const angle=(i*.6180339887%1)*Math.PI*2;
    const lane=.12+Math.sqrt((i*.754877666%1))*.88;
    return {angle,lane,depth:(i*.569840291%1),size:.65+(i*.313379%1)*1.4,phase:i*2.39996};
  });
  function drawCoreApproach(t){
    const p=clamp(t/3.1),cx=W*.5,cy=H*.5,extent=Math.hypot(W,H)*.67;
    const bg=ctx.createRadialGradient(cx,cy,5,cx,cy,extent);
    bg.addColorStop(0,'#241c36');bg.addColorStop(.2,'#0a1529');bg.addColorStop(.66,'#040916');bg.addColorStop(1,'#010307');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(cx,cy);
    // Perspective tunnel rings originate at the same point where the stars gathered.
    for(let i=0;i<7;i++){
      const q=(i/7+p*1.45)%1,r=12+Math.pow(q,2.32)*extent*.85;
      ctx.beginPath();ctx.ellipse(0,0,r,r*(.53+.16*Math.sin(p*5+i)),p*.38+i*.23,0,Math.PI*2);
      ctx.lineWidth=.6+2.6*q;ctx.strokeStyle=`rgba(232,201,144,${(.22+.28*q)*(1-ease((q-.9)/.12))})`;ctx.stroke();
    }
    for(const star of gatewayParticles){
      // Stars expand in perspective as the camera moves FORWARD toward the focus.
      const q=(star.depth+p*.84)%1,r=8+Math.pow(q,2.23)*extent*star.lane;
      const a=star.angle+p*.12;
      const x=Math.cos(a)*r,y=Math.sin(a)*r;
      const previous=Math.max(2,r-(4+q*44+76*p*p));
      ctx.beginPath();ctx.moveTo(Math.cos(a)*previous,Math.sin(a)*previous);ctx.lineTo(x,y);
      ctx.lineWidth=star.size*(.6+q*1.8);
      ctx.strokeStyle=`rgba(255,232,185,${(.22+.56*q)*ease(q/.09)*(1-ease((q-.94)/.065))})`;
      ctx.stroke();
    }
    const portalPulse=.75+.25*Math.sin(t*8),portalRadius=18+82*ease(p);
    ctx.beginPath();ctx.arc(0,0,portalRadius*(.72+.28*portalPulse),0,Math.PI*2);
    ctx.lineWidth=1.5+2*ease(p);ctx.strokeStyle=`rgba(254,230,185,${.48+.3*p})`;ctx.stroke();
    ctx.restore();
    glow(cx,cy,60+260*ease(p),'245,213,169',.24+.43*ease(p));
    glow(cx,cy,20+95*ease((p-.68)/.32),'255,252,238',.28+.56*ease((p-.68)/.32));
    // A concentrated convergence flash bridges into the next existing core reveal.
    if(p>.85){ctx.fillStyle=`rgba(255,247,228,${ease((p-.85)/.15)*.16})`;ctx.fillRect(0,0,W,H);}
  }
  function drawCore(alpha=1,wobble=0,t=0){
    if(!core.complete||!core.naturalWidth)return;
    const s=Math.max(W/core.naturalWidth,H/core.naturalHeight)*1.045,w=core.naturalWidth*s,h=core.naturalHeight*s,x=(W-w)/2,y=(H-h)/2;
    ctx.save();ctx.globalAlpha=alpha;
    if(wobble){for(let sy=0;sy<core.naturalHeight;sy+=12){const sh=Math.min(12,core.naturalHeight-sy);ctx.drawImage(core,0,sy,core.naturalWidth,sh,x+Math.sin(sy*.035+t*11)*wobble,y+sy*s,w,sh*s+.5);}}else ctx.drawImage(core,x,y,w,h);ctx.restore();
  }
  const glowCache=new Map();
  function glow(x,y,r,color='255,222,154',alpha=1){
    let image=glowCache.get(color);if(!image){image=document.createElement('canvas');image.width=image.height=256;const c=image.getContext('2d'),g=c.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,`rgba(${color},1)`);g.addColorStop(.18,`rgba(${color},.7)`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(0,0,256,256);glowCache.set(color,image);}
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=clamp(alpha);ctx.drawImage(image,x-r,y-r,r*2,r*2);ctx.restore();
  }
  function mixCamera(a,b,p){return {zoom:lerp(a.zoom,b.zoom,p),x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p)};}
  function skyCamera(t){return mixCamera(BUILDING_CAMERA,SKY_CAMERA,ease(t/4.6));}
  function gatherCamera(t){const base=mixCamera(gatherFrom,SKY_CAMERA,ease(t/1.35)),dive=ease((t-5.1)/2.5);return {zoom:base.zoom*(1+Math.pow(dive,1.6)*3.6),x:lerp(base.x,FOCUS.x,dive),y:lerp(base.y,FOCUS.y,dive)};}
  function campusProjection(view){
    const iw=W,ih=H*1.75,scale=view.zoom;
    return {scale,x:W/2-clamp(view.x*iw,W/(2*scale),iw-W/(2*scale))*scale,
      y:H/2-clamp(view.y*ih,H/(2*scale),ih-H/(2*scale))*scale,iw,ih};
  }
  function drawCampus(view,alpha=1){
    const p=campusProjection(view),imageWidth=Math.min(W,campus.naturalWidth||W),
      imageHeight=(campus.naturalHeight||1024)*imageWidth/(campus.naturalWidth||1536),
      imageTop=p.ih-imageHeight;
    ctx.save();ctx.globalAlpha=alpha;
    const sky=ctx.createLinearGradient(0,p.y,0,p.y+imageTop*p.scale);
    sky.addColorStop(0,'#020619');sky.addColorStop(.45,'#03091f');sky.addColorStop(1,'#050d2b');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    if(campus.complete&&campus.naturalWidth){
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(campus,p.x+(p.iw-imageWidth)*p.scale/2,p.y+imageTop*p.scale,imageWidth*p.scale,imageHeight*p.scale);
    }
    ctx.restore();
  }
  function starPosition(s,u){const v=1-u;return {x:v*v*v*s.x+3*v*v*u*s.c1.x+3*v*u*u*s.c2.x+u*u*u*FOCUS.x,y:v*v*v*s.y+3*v*v*u*s.c1.y+3*v*u*u*s.c2.y+u*u*u*FOCUS.y};}
  function starField(age,view,gatherTime=null){
    const p=campusProjection(view),screen=point=>({x:p.x+point.x*p.iw*p.scale,y:p.y+point.y*p.ih*p.scale});let arrived=0;
    for(const s of stars){
      const delay=Math.max(s.depart,s.birth-gatherSkyAge+.22),progress=gatherTime===null?0:clamp((gatherTime-delay)/s.travel),u=Math.pow(ease(progress),s.power);
      if(progress===1){arrived++;continue;}
      const alpha=clamp((age-s.birth)/.65)*(.8+.2*Math.sin(age*1.5+s.phase))*(1-ease((u-.92)/.08));if(alpha<=0)continue;
      const point=screen(starPosition(s,u)),r=s.r*Math.min(1.8,Math.sqrt(view.zoom/SKY_CAMERA.zoom));
      if(point.x<-30||point.x>W+30||point.y<-30||point.y>H+30)continue;
      if(u>0){const tail=screen(starPosition(s,Math.max(0,u-.045)));ctx.strokeStyle=`rgba(255,222,158,${alpha*.45})`;ctx.lineWidth=r*.75;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(point.x,point.y);ctx.stroke();}
      glow(point.x,point.y,r*5,'255,222,154',alpha*.55);ctx.fillStyle=`rgba(255,246,211,${alpha})`;ctx.fillRect(point.x-r*.4,point.y-r,r*.8,r*2);ctx.fillRect(point.x-r,point.y-r*.4,r*2,r*.8);
    }
    if(gatherTime!==null){const focus=screen(FOCUS),dive=ease((gatherTime-5.1)/2.5),a=ease(gatherTime/2.5);glow(focus.x,focus.y,16+arrived*.7+dive*210,'255,235,180',a*.9);}
  }
  const nodes=[[.18,.35],[.82,.35],[.17,.64],[.82,.64],[.5,.18],[.5,.7]];
  function orbits(t,connect){for(let i=0;i<nodes.length;i++){const [nx,ny]=nodes[i],a=ease((t-i*.5)/.7),x=nx*W,y=ny*H;if(a<=0)continue;ctx.save();ctx.globalAlpha=a*.8;ctx.strokeStyle=i%2?'#9dd9ff':'#ffe5a3';ctx.lineWidth=1.5;ctx.setLineDash([8,8]);ctx.lineDashOffset=-t*18;ctx.beginPath();ctx.ellipse(x,y,55,20,(i%2?1:-1)*.25,0,Math.PI*2);ctx.stroke();ctx.restore();glow(x,y,38,i%2?'127,199,255':'255,214,124',a*.45);if(connect){ctx.strokeStyle=`rgba(255,225,158,${a*.35})`;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(W*.5,y-80,W*.5,H*.4);ctx.stroke();const p=(t*.25+i*.17)%1;glow(x+(W*.5-x)*p,y+(H*.4-y)*p,10,'255,236,172',.9);}}}
  function orb(t,grow){const r=grow?28+ease(t/3.2)*80:6+ease(t/1.4)*20,x=W*CORRUPTION_FOCUS.x,y=H*CORRUPTION_FOCUS.y;glow(x,y,r*2.2,'131,38,249',.8);ctx.save();ctx.fillStyle='#160623';ctx.strokeStyle='#b970ff';ctx.lineWidth=2+Math.sin(t*7);ctx.beginPath();ctx.arc(x,y,r*(1+.04*Math.sin(t*8)),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#e8afff';for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(x,y,r*(1.1+j*.1),r*.3,t*(j%2?1:-1)+j,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  function gas(t,strength=1){for(let i=0;i<10;i++)glow(W*.5+Math.sin(i*2.3+t*.8)*W*.48,H*.43+Math.cos(i*1.7+t*.55)*H*.42,230+i%3*65,i%2?'97,24,185':'162,44,216',(.14+.04*Math.sin(t+i))*strength);ctx.fillStyle=`rgba(64,9,107,${.36*strength})`;ctx.fillRect(0,0,W,H);}
  function traceCrack(points,progress){
    const steps=(points.length-1)*clamp(progress);
    if(steps<=0)return null;
    const count=Math.floor(steps),fraction=steps-count;
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(let j=1;j<=count;j++)ctx.lineTo(points[j].x,points[j].y);
    const p=count<points.length-1
      ?{x:lerp(points[count].x,points[count+1].x,fraction),y:lerp(points[count].y,points[count+1].y,fraction)}
      :points[points.length-1];
    if(count<points.length-1)ctx.lineTo(p.x,p.y);
    return p;
  }
  function renderCrack(points,progress,width,alpha=1){
    if(progress<=0)return null;
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.shadowColor='rgba(163,99,255,.32)';ctx.shadowBlur=width*1.55;
    ctx.strokeStyle=`rgba(12,5,22,${.93*alpha})`;ctx.lineWidth=width*1.08;
    const tip=traceCrack(points,progress);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle=`rgba(122,77,187,${.52*alpha})`;ctx.lineWidth=Math.max(.55,width*.24);
    traceCrack(points,progress);ctx.stroke();
    ctx.save();ctx.translate(-width*.13,-width*.13);
    ctx.strokeStyle=`rgba(236,216,255,${.72*alpha})`;ctx.lineWidth=Math.max(.45,width*.11);
    traceCrack(points,progress);ctx.stroke();ctx.restore();
    ctx.restore();return tip;
  }
  function drawCracks(t){
    const layout=currentCrackLayout(),p=clamp(t/4),impact=ease(p/.18),scale=clamp(Math.min(W,H)/960,.75,1.9);
    ctx.save();
    // Both the initial rupture and every primary crack share this exact center.
    glow(layout.cx,layout.cy,40+impact*110*scale,'236,203,255',.25+.35*impact);
    glow(layout.cx,layout.cy,25+impact*72*scale,'113,30,196',.32+.3*impact);
    ctx.fillStyle=`rgba(12,1,20,${.24+.35*impact})`;
    ctx.beginPath();ctx.arc(layout.cx,layout.cy,10+impact*15*scale,0,Math.PI*2);ctx.fill();
    for(const ray of layout.rays){
      // All rays finish past the screen border before the 4-second beat ends.
      const grow=ease(clamp((t-ray.delay)/(3.36-ray.delay)));
      const tip=renderCrack(ray.points,grow,ray.width*scale);
      for(const branch of ray.branches){
        const branchGrow=ease(clamp((t-branch.start)/(3.75-branch.start)));
        renderCrack(branch.points,branchGrow,branch.width*scale,.82);
      }
      if(tip&&grow<.99)glow(tip.x,tip.y,8+scale*7,'210,151,255',.72);
    }
    ctx.restore();
  }
  // The falling pieces are bounded by the SAME jagged primary crack paths.
  // Each sector follows ray A -> viewport border -> reversed ray B.
  // This prevents independent rectangular grid fragments from contradicting the cracks.
  function makeFragments(){
    snapshot=document.createElement('canvas');snapshot.width=W;snapshot.height=H;
    snapshot.getContext('2d').drawImage(canvas,0,0);
    fragments=[];
    const layout=currentCrackLayout(),perimeter=2*(W+H),eps=.002;
    const perimeterAt=pt=>{
      const x=clamp(pt.x,0,W),y=clamp(pt.y,0,H);
      if(y<=eps&&x<=eps)return perimeter;
      if(y<=eps)return x;
      if(x>=W-eps)return W+y;
      if(y>=H-eps)return W+H+(W-x);
      return 2*W+H+(H-y);
    };
    const edgePoint=position=>{
      const d=((position%perimeter)+perimeter)%perimeter;
      if(d<=W)return {x:d,y:0};
      if(d<=W+H)return {x:W,y:d-W};
      if(d<=2*W+H)return {x:2*W+H-d,y:H};
      return {x:0,y:perimeter-d};
    };
    const edge=layout.rays.map(ray=>{
      const inner=ray.points.slice(0,-1),end=inner[inner.length-1];
      const angle=(Math.atan2(end.y-layout.cy,end.x-layout.cx)+Math.PI*2)%(Math.PI*2);
      return {inner,end,angle,perimeter:perimeterAt(end)};
    }).sort((a,b)=>a.angle-b.angle);
    let randomState=0x196b93f5;
    const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
    for(let i=0;i<edge.length;i++){
      const left=edge[i],right=edge[(i+1)%edge.length];
      let endPerimeter=right.perimeter;
      if(endPerimeter<=left.perimeter+eps)endPerimeter+=perimeter;
      const border=[];
      for(let lap=0;lap<=1;lap++){
        for(const c of [0,W,W+H,2*W+H,perimeter]){
          const value=c+lap*perimeter;
          if(value>left.perimeter+eps&&value<endPerimeter-eps)border.push({value,...edgePoint(value)});
        }
      }
      border.sort((a,b)=>a.value-b.value);
      const pts=[...left.inner,...border.map(({x,y})=>({x,y})),...right.inner.slice().reverse()];
      // Polygon area centroid: unlike the average of ray points, this preserves
      // the physical centre of each wedge for believable rotation and falling.
      let twiceArea=0,cx=0,cy=0;
      for(let j=0;j<pts.length;j++){
        const a=pts[j],b=pts[(j+1)%pts.length],cross=a.x*b.y-b.x*a.y;
        twiceArea+=cross;cx+=(a.x+b.x)*cross;cy+=(a.y+b.y)*cross;
      }
      if(Math.abs(twiceArea)<1)continue;
      cx/=3*twiceArea;cy/=3*twiceArea;
      const x=Math.max(0,Math.floor(Math.min(...pts.map(q=>q.x))-2)),y=Math.max(0,Math.floor(Math.min(...pts.map(q=>q.y))-2));
      const rightX=Math.min(W,Math.ceil(Math.max(...pts.map(q=>q.x))+2)),bottomY=Math.min(H,Math.ceil(Math.max(...pts.map(q=>q.y))+2));
      const radialX=cx-layout.cx,radialY=cy-layout.cy;
      fragments.push({pts,cx,cy,box:{x,y,w:rightX-x,h:bottomY-y},
        vx:radialX*(.19+random()*.12)+(random()-.5)*95,
        vy:-140+radialY*.11-random()*115,
        spin:(i%2?-1:1)*(.26+random()*.65),delay:random()*.14});
    }
  }
  function shatter(t){
    if(!snapshot)return;
    for(const fragment of fragments){
      const a=Math.max(0,t-fragment.delay),dx=fragment.vx*a,dy=fragment.vy*a+475*a*a;
      if(fragment.cy+dy>H+Math.max(180,fragment.box.h))continue;
      const opacity=1-ease((a-1.45)/1.25);
      if(opacity<=0)continue;
      ctx.save();ctx.globalAlpha=opacity;
      ctx.translate(fragment.cx+dx,fragment.cy+dy);
      ctx.rotate(fragment.spin*a);
      ctx.scale(1-.05*ease(a/1.8),1-.11*ease(a/1.8));
      ctx.translate(-fragment.cx,-fragment.cy);
      ctx.beginPath();
      fragment.pts.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
      ctx.closePath();ctx.clip();
      const b=fragment.box;
      if(b.w>0&&b.h>0)ctx.drawImage(snapshot,b.x,b.y,b.w,b.h,b.x,b.y,b.w,b.h);
      ctx.strokeStyle='rgba(204,144,255,.23)';ctx.lineWidth=1;ctx.stroke();
      ctx.restore();
    }
  }
  function errors(t){const panels=[[80,360,235,128,'학생증 인증 오류','인증 정보를 확인할 수 없습니다'],[590,450,240,130,'강의실 안내 오류','목적지 좌표가 일치하지 않습니다'],[210,145,285,138,'공지 알림 폭주','읽지 않은 공지가 계속 도착합니다']];for(let i=0;i<3;i++){const [x,y,w,h,label,sub]=panels[i],a=ease((t-i*.9)/.8)*.88;if(a<=0)continue;ctx.save();ctx.globalAlpha=a;ctx.translate(x+Math.sin(t*15+i)*1.5,y+Math.sin(t+i)*4);ctx.fillStyle='#10162be8';ctx.strokeStyle='#ac76ea';ctx.lineWidth=2;ctx.fillRect(0,0,w,h);ctx.strokeRect(0,0,w,h);ctx.fillStyle='#d9caff';ctx.font='bold 19px Noto Sans KR, sans-serif';ctx.fillText(label,15,30);ctx.fillStyle='#afabc6';ctx.font='800 12px Noto Sans KR, sans-serif';ctx.fillText(sub,15,54);ctx.strokeStyle='#ff847e';ctx.lineWidth=3;if(i===0){ctx.strokeRect(18,73,62,36);ctx.beginPath();ctx.moveTo(100,78);ctx.lineTo(126,104);ctx.moveTo(126,78);ctx.lineTo(100,104);ctx.stroke();}else if(i===1){ctx.font='bold 38px Noto Sans KR, sans-serif';ctx.fillStyle='#ffb3c8';ctx.fillText('←   →',30,105);}else for(let j=0;j<4;j++){ctx.fillStyle=j%2?'#a77bda':'#5a427c';ctx.fillRect(18+j*15,76+j*9,150,8);}ctx.restore();}}
  // CH1_REALITY_ILLUSTRATIONS_V6
  const realityCGImages=Object.fromEntries(Object.entries({"library-error":"/assets/chapter1/story/prologue/reality_library_auth_error.png","navigation-error":"/assets/chapter1/story/prologue/reality_navigation_error.png","notification-error":"/assets/chapter1/story/prologue/reality_notification_overload.png"}).map(([key,src])=>{
    const image=new Image();image.src=src;image.decode?.().catch(()=>{});return [key,image];
  }));
  let realityCGTransition=null;
  function resetRealityCG(){realityCGTransition=null;}
  function beginRealityCG(next,now){
    if(!realityCGImages[next]){if(next!=='reality-out')resetRealityCG();return;}
    const from=document.createElement('canvas');from.width=W;from.height=H;from.getContext('2d').drawImage(canvas,0,0);
    realityCGTransition={key:next,from,frame:null,started:now};
  }
  function composeRealityCG(image){
    const frame=document.createElement('canvas');frame.width=W;frame.height=H;const c=frame.getContext('2d',{alpha:false});
    c.fillStyle='#090f18';c.fillRect(0,0,W,H);
    const backdrop=Math.max(W/image.naturalWidth,H/image.naturalHeight),bw=image.naturalWidth*backdrop,bh=image.naturalHeight*backdrop;
    c.globalAlpha=.28;c.drawImage(image,(W-bw)/2,(H-bh)/2,bw,bh);c.globalAlpha=1;
    const fit=Math.min(W/image.naturalWidth,H/image.naturalHeight),w=image.naturalWidth*fit,h=image.naturalHeight*fit;
    c.drawImage(image,(W-w)/2,(H-h)/2,w,h);return frame;
  }
  function drawRealityCGFrame(now){
    const transition=realityCGTransition;if(!transition)return;
    const image=realityCGImages[transition.key];
    if(!image.complete||!image.naturalWidth){if(transition.from)ctx.drawImage(transition.from,0,0);transition.started=now;return;}
    if(!transition.frame)transition.frame=composeRealityCG(image);
    const p=ease(clamp((now-transition.started)/850));
    if(transition.from&&p<1)ctx.drawImage(transition.from,0,0);
    ctx.save();ctx.globalAlpha=p;ctx.drawImage(transition.frame,0,0);ctx.restore();
    if(p===1)transition.from=null;
  }
  // CH1_PRESENTATION_FULLSCREEN_V7
  const v7CoreModes=new Set(['awakening','campus','sky','gather','threshold','core-approach','core-reveal','core-title','orbits','connections','seed','growth','burst','fracture','shatter']);
  let v7FullscreenState=null,v7Style=null,v7OriginalTitleHTML=null,v7ResizeObserver=null;
  function v7AdmissionTail(tail){
    if(!tail.length||tail[0]?.scene?.id!=='prologue-entrance-day')throw Error('Original admission scene missing.');
    return [{...tail[0],prologueV2:'admission-v7',effectDuration:10000,previewStyle:'admission-hold-fit',holdBlackAfter:false},...tail.slice(1)];
  }
  function v7EnsureStyle(){
    if(v7Style?.isConnected)return;
    v7Style=document.createElement('style');v7Style.textContent=`
.prologue-v7-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:2147481000!important;background:#000;isolation:isolate;pointer-events:auto;overflow:hidden}
.prologue-v7-fullscreen .prologue-v2-layer{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none}
.prologue-v7-fullscreen .prologue-v2-layer canvas{width:100%!important;height:100%!important;display:block}
.prologue-v7-fullscreen .prologue-v2-layer::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 40%,rgba(13,12,10,.06) 53%,rgba(10,14,18,.58) 80%,rgba(7,12,17,.84))}
.prologue-v7-fullscreen #dialogueLayer{position:absolute!important;z-index:300!important;left:50%!important;right:auto!important;bottom:var(--v7-dialogue-bottom,43px)!important;width:858px!important;transform:translateX(-50%) scale(var(--v7-dialogue-scale,1))!important;transform-origin:50% 100%!important;pointer-events:auto}
.prologue-v7-fullscreen #dialogueJumpButton,.prologue-v7-fullscreen #previewMenuButton{position:absolute!important;top:18px!important;z-index:340!important;pointer-events:auto}
.prologue-v7-fullscreen #dialogueJumpButton{right:116px!important}
.prologue-v7-fullscreen #previewMenuButton{right:18px!important}
.prologue-v7-fullscreen #dialogueJumpPanel{position:absolute!important;inset:0!important;z-index:360!important;pointer-events:auto}
.prologue-v7-fullscreen .controls{position:absolute!important;right:12px!important;bottom:10px!important;z-index:340!important;pointer-events:auto}
.prologue-v7-fullscreen .prologue-v2-layer[data-beat="fracture"]::after,.prologue-v7-fullscreen .prologue-v2-layer[data-beat="shatter"]::after{background:none!important}
.prologue-v7-fullscreen .core-v5-main{font-size:clamp(42px,5.2cqw,104px)}
.prologue-v7-fullscreen .core-v5-kicker{font-size:clamp(12px,1.05cqw,18px)}
.prologue-v7-fullscreen .core-v5-caption{font-size:clamp(14px,1.15cqw,20px)}
#storyStage.is-v7-admission .scene-background{transition:none!important;animation:none!important}
#storyStage.is-v7-admission .scene-background:not(.is-visible){opacity:0!important}
#storyStage.is-v7-admission .scene-background.is-visible{opacity:1!important}
.prologue-v2-layer[data-v7-admission="true"]::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 43%,rgba(9,12,16,.04) 55%,rgba(9,12,16,.64));opacity:0;transition:opacity 1.2s}
.prologue-v2-layer[data-v7-admission-title="true"]::after{opacity:1}
.prologue-v2-layer[data-v7-admission-title="true"] .core-v5-kicker{animation:coreV5TextIn 1s .1s both}
.prologue-v2-layer[data-v7-admission-title="true"] .core-v5-main{animation:coreV5TextIn 1.5s .25s both}
.prologue-v2-layer[data-v7-admission-title="true"] .core-v5-rule{animation:coreV5LineIn 1.3s .5s both}
.prologue-v2-layer[data-v7-admission-title="true"] .core-v5-caption{animation:coreV5TextIn 1.2s .7s both}
`;stage.appendChild(v7Style);
  }
  function v7ResizeFullscreen(){
    if(!v7FullscreenState)return;
    const width=Math.max(1,Math.round(window.innerWidth)),height=Math.max(1,Math.round(window.innerHeight));
    W=width;H=height;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);}
    const scale=Math.min(1,width/922,height/960);
    v7FullscreenState.host.style.setProperty('--v7-dialogue-scale',String(scale));
    v7FullscreenState.host.style.setProperty('--v7-dialogue-bottom',String(43*scale)+'px');
  }
  function v7EnterFullscreen(){
    if(v7FullscreenState){v7ResizeFullscreen();return;}
    const dialogue=document.getElementById('dialogueLayer');if(!dialogue)throw Error('The original narrator window was not found.');
    const movable=[document.getElementById('dialogueJumpButton'),document.getElementById('previewMenuButton'),document.getElementById('dialogueJumpPanel'),stage?.querySelector?.('.controls')].filter(Boolean);
    const layerMark=document.createComment('prologue V7 layer'),dialogueMark=document.createComment('prologue V7 dialogue');
    const movableEntries=[];
    layer.parentNode.insertBefore(layerMark,layer);dialogue.parentNode.insertBefore(dialogueMark,dialogue);
    for(const element of movable){
      if(!element.parentNode)continue;
      const mark=document.createComment('prologue V7 movable');
      element.parentNode.insertBefore(mark,element);
      movableEntries.push({element,mark});
    }
    const host=document.createElement('div');host.className='prologue-v7-fullscreen';host.setAttribute('role','presentation');
    v7FullscreenState={host,dialogue,layerMark,dialogueMark,movableEntries};
    document.body.appendChild(host);host.append(layer,dialogue,...movableEntries.map(entry=>entry.element));
    host.addEventListener('click',event=>{if(!v7FullscreenState||dialogue.contains(event.target)||movableEntries.some(entry=>entry.element.contains(event.target)))return;stage.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    v7ResizeFullscreen();
    v7ResizeObserver=new MutationObserver(()=>{if(v7FullscreenState&&!stage?.isConnected)v7LeaveFullscreen();});
    v7ResizeObserver.observe(document.body,{childList:true,subtree:true});
  }
  function v7LeaveFullscreen(){
    if(!v7FullscreenState)return;
    v7ResizeObserver?.disconnect();v7ResizeObserver=null;
    const state=v7FullscreenState;v7FullscreenState=null;
    if(state.layerMark.parentNode)state.layerMark.replaceWith(layer);else layer.remove();
    if(state.dialogueMark.parentNode)state.dialogueMark.replaceWith(state.dialogue);else state.dialogue.remove();
    for(const entry of state.movableEntries||[]){
      if(entry.mark.parentNode)entry.mark.replaceWith(entry.element);else entry.element.remove();
    }
    state.host.remove();W=922;H=960;canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d',{alpha:false});
    snapshot=null;fragments=[];
  }
  function v7SyncPresentation(next,item){
    v7EnsureStyle();if(v7OriginalTitleHTML===null)v7OriginalTitleHTML=title.innerHTML;
    if(v7CoreModes.has(next))v7EnterFullscreen();else v7LeaveFullscreen();
    const admission=next==='admission-v7';
    stage.classList.toggle('is-v7-admission',admission);
    layer.dataset.v7Admission=String(admission);layer.dataset.v7AdmissionTitle='false';
    const html=admission?"<span class=\"core-v5-kicker\"><svg class=\"core-v5-mark\" viewBox=\"0 0 40 40\" aria-hidden=\"true\"><circle cx=\"20\" cy=\"20\" r=\"15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\".65\"/><path d=\"M20 10L22 18L30 20L22 22L20 30L18 22L10 20L18 18Z\" fill=\"currentColor\"/></svg><span>새로운 시작</span></span><span class=\"core-v5-main\">입학식</span><span class=\"core-v5-rule\" aria-hidden=\"true\"></span><span class=\"core-v5-caption\">처음의 설렘이 시작되는 날</span>":v7OriginalTitleHTML;if(title.innerHTML!==html)title.innerHTML=html;
    canvas.style.opacity='1';layer.style.background=admission?'transparent':'#000';
    if(admission){ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);}
  }
  function v7DrawAdmission(t){
    ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    canvas.style.opacity=String(1-ease((t-.3)/5));
    const u=t-5.4,active=u>=0;
    if(layer.dataset.v7AdmissionTitle!==String(active))layer.dataset.v7AdmissionTitle=String(active);
    const alpha=active?ease(u/.9)*ease((4.4-u)/1.1):0;
    title.style.opacity=String(alpha);title.style.transform='translateY('+((1-alpha)*10)+'px)';
  }
  function v7ResetPresentation(){
    v7LeaveFullscreen();
    stage?.classList.remove('is-v7-admission');
    if(canvas)canvas.style.opacity='1';
    if(layer){layer.style.background='#000';layer.dataset.v7Admission='false';layer.dataset.v7AdmissionTitle='false';}
    if(title&&v7OriginalTitleHTML!==null)title.innerHTML=v7OriginalTitleHTML;
  }
  window.addEventListener('resize',v7ResizeFullscreen,{passive:true});
  function draw(now){
    const t=Math.max(0,(now-start)/1000);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    if(mode==='awakening'){drawCampus(BUILDING_CAMERA,ease((t-.65)/2.7));glow(W*.5,H*.5,5+Math.sin(Math.min(t,1)*Math.PI)*60,'255,235,188',clamp(1-t/2));}
    else if(mode==='campus')drawCampus(BUILDING_CAMERA);
    else if(mode==='sky'){camera=skyCamera(t);drawCampus(camera);starField(t,camera);}
    else if(mode==='gather'){camera=gatherCamera(t);drawCampus(camera);starField(gatherSkyAge+t,camera,t);ctx.fillStyle=`rgba(0,0,0,${ease((t-7)/.6)})`;ctx.fillRect(0,0,W,H);}
    else if(mode==='threshold')glow(W*CORRUPTION_FOCUS.x,H*CORRUPTION_FOCUS.y,44,'255,220,144',.24+.06*Math.sin(t));
    else if(mode==='core-approach')drawCoreApproach(t);
    else if(['core-reveal','core-title','orbits','connections','seed','growth','burst','fracture'].includes(mode)){
      ctx.save();if(mode==='fracture'){const impact=Math.pow(Math.max(0,Math.sin(t*7)),10)*(3+t*1.5);ctx.translate(Math.sin(t*79)*impact,Math.cos(t*97)*impact);}drawCore(mode==='core-reveal'?ease(t/5):1,mode==='fracture'?3+t*3.5:mode==='burst'?3:0,t);ctx.restore();
      if(mode==='core-reveal')glow(W*.5,H*.5,240+80*ease(t/1.8),'255,234,194',.62*(1-ease(t/1.6)));
      if(mode==='core-title'){const a=ease(t/.9)*ease((4.4-t)/1.1);title.style.opacity=String(a);title.style.transform=`translateY(${(1-a)*10}px)`;}
      if(mode==='orbits'||mode==='connections')orbits(t,mode==='connections');if(mode==='seed'||mode==='growth')orb(t,mode==='growth');
      if(mode==='burst'){const p=clamp(t/1.8);gas(t,ease(p*3));glow(W*CORRUPTION_FOCUS.x,H*CORRUPTION_FOCUS.y,56+ease(p)*1320,'161,58,255',.9*(1-p));}if(mode==='fracture'){gas(t+2);drawCracks(t);}
    }else if(mode==='shatter')shatter(t);
    else if(mode==='admission-v7')v7DrawAdmission(t);
    else if(realityCGImages[mode])drawRealityCGFrame(now);
    else if(mode==='reality-out'&&realityCGTransition){drawRealityCGFrame(now);ctx.fillStyle='rgba(0,0,0,'+ease(t)+')';ctx.fillRect(0,0,W,H);}
    else if(['reality-return','reality','errors','reality-out'].includes(mode)){/* V7 reality-return, narrator12 and empty exit fallback stay black. *//* V6 illustrations replace the temporary error panels. */}
  }
  function tick(now){raf=null;if(!mode||!layer?.isConnected){clear();return;}if(now-lastFrame>=30){draw(now);lastFrame=now;}raf=requestAnimationFrame(tick);}
  window.Chapter1PrologueV2={rewrite,present,clear,assets:{campus:campus.src,core:core.src}};
})();
