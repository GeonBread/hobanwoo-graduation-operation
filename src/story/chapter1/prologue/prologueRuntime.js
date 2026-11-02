(() => {
  'use strict';
  const W=922,H=960,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  let seed=240601;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const stars=Array.from({length:100},(_,i)=>({x:35+rnd()*850,y:25+rnd()*510,r:1+rnd()*2,delay:i*.08,phase:rnd()*6.28}));
  const cracks=Array.from({length:17},(_,i)=>{const a=i*Math.PI*2/17+(rnd()-.5)*.16;return {delay:i%4*.12,points:Array.from({length:12},(_,j)=>({x:W*.51+Math.cos(a)*j*67+(j?(rnd()-.5)*40:0),y:H*.42+Math.sin(a)*j*67+(j?(rnd()-.5)*40:0)}))};});
  const campus=new Image(),core=new Image();campus.src='/assets/chapter1/story/prologue/campus_night.png';core.src='/assets/chapter1/story/prologue/core_interior.png';campus.decode?.().catch(()=>{});core.decode?.().catch(()=>{});
  let layer,canvas,ctx,title,stage,style,mode='',start=0,skyStart=0,raf=null,lastFrame=0,snapshot=null,fragments=[];
  function rewrite(segments){
    if(segments.prologue?.[0]?.prologueV2)return;
    const old=segments.prologue||[],i=old.findIndex(x=>x.effect==='scene-preview'&&x.scene?.id==='prologue-entrance-day');
    if(i<0)throw Error('Original admission-day scene missing; revised opening was not inserted.');
    const fx=(beat,ms)=>({effectOnly:true,effect:'prologue-v2',effectDuration:ms,prologueV2:beat});
    const line=(beat,text)=>({left:null,right:null,speaker:'narrator',text,illustration:null,prologueV2:beat});
    segments.prologue=[fx('awakening',3600),
      line('campus','경북대학교에는 오래전부터 눈에 보이지 않는 특별한 별빛이 흐르고 있었다.'),
      line('campus','수많은 학생의 꿈과 노력, 그리고 그들이 학교에서 보내온 시간들.'),
      line('sky','그 모든 것은 보이지 않는 별빛이 되어 학교 곳곳에 쌓여갔다.'),fx('gather',5200),
      line('threshold','그리고 그 모든 별빛이 모이는 곳에는,'),line('threshold','현실의 누구도 볼 수 없는 거대한 공간이 존재했다.'),
      fx('core-reveal',5000),fx('core-title',2800),
      line('orbits','그 안에는 학생들의 대학생활과 이어진 수많은 코어 영역이 존재했다.'),
      line('connections','각각의 영역은 서로 연결되어, 보이지 않는 곳에서 별빛의 흐름을 이어가고 있었다.'),
      line('seed','하지만 어느 날.'),line('growth','정체를 알 수 없는 오염이 그 빛에 스며들기 시작했다.'),
      fx('burst',1800),fx('fracture',4000),fx('shatter',2600),
      line('void','그것은 학생들의 혼란과 불안, 그리고 압박을 뒤틀며 점차 영역들을 잠식해 갔다.'),fx('reality-return',2200),
      line('reality','그리고 그 영향은, 마침내 현실의 학교에도 나타나기 시작했다.'),
      line('errors','그러나 대부분의 학생들은 그것을 단순한 시스템 오류로 여길 뿐이었다.'),fx('reality-out',1000),...old.slice(i)];
  }
  function mount(target){
    stage=target;
    if(!style?.isConnected){style=document.createElement('style');style.textContent='.prologue-v2-layer{position:absolute;inset:0;z-index:200;pointer-events:none;background:#000;overflow:hidden}.prologue-v2-layer canvas{display:block;width:100%;height:100%}.has-prologue-v2 #dialogueLayer{z-index:250!important}.has-prologue-v2 #sceneLocation,.has-prologue-v2 #sceneChapter,.has-prologue-v2 #sceneTitle,.has-prologue-v2 #sceneSubtitle{visibility:hidden!important}.prologue-v2-title{position:absolute;left:0;right:0;top:43%;text-align:center;color:#fff5ca;font-size:clamp(30px,5vw,66px);font-weight:900;letter-spacing:.2em;text-shadow:0 0 18px #ffd269,0 3px 16px #000;opacity:0}';stage.appendChild(style);}
    if(!layer?.isConnected){layer=document.createElement('div');layer.className='prologue-v2-layer';layer.setAttribute('aria-hidden','true');canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d',{alpha:false});title=document.createElement('div');title.className='prologue-v2-title';title.textContent='첨성대 코어';layer.append(canvas,title);stage.appendChild(layer);}
    layer.hidden=false;stage.classList.add('has-prologue-v2');
  }
  function present(item,target){
    if(!item?.prologueV2){clear();return;}mount(target);const now=performance.now(),next=item.prologueV2;
    if(mode!==next){
      if(next==='shatter'){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);drawCore(1,10,4);gas(6,1);drawCracks(4);makeFragments();}
      if(!['campus','sky','gather'].includes(mode)||next==='awakening')skyStart=now;
      mode=next;start=now;layer.dataset.beat=mode;
    }
    title.style.opacity='0';if(raf===null){lastFrame=now;raf=requestAnimationFrame(tick);}
  }
  function clear(){if(raf!==null)cancelAnimationFrame(raf);raf=null;if(layer)layer.hidden=true;stage?.classList.remove('has-prologue-v2');mode='';snapshot=null;fragments=[];}
  function cover(image,zoom=1,pan=0,alpha=1){if(!image.complete||!image.naturalWidth)return;const s=Math.max(W/image.naturalWidth,H/image.naturalHeight)*zoom,w=image.naturalWidth*s,h=image.naturalHeight*s;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(image,(W-w)/2,(H-h)/2+pan,w,h);ctx.restore();}
  function drawCore(alpha=1,wobble=0,t=0){
    if(!core.complete||!core.naturalWidth)return;
    const s=Math.min(W/core.naturalWidth,H*.82/core.naturalHeight),w=core.naturalWidth*s,h=core.naturalHeight*s,x=(W-w)/2,y=H*.43-h/2;
    ctx.save();ctx.globalAlpha=alpha*.2;ctx.filter='blur(20px) brightness(.55)';cover(core);ctx.restore();ctx.save();ctx.globalAlpha=alpha;
    if(wobble){for(let sy=0;sy<core.naturalHeight;sy+=12){const sh=Math.min(12,core.naturalHeight-sy);ctx.drawImage(core,0,sy,core.naturalWidth,sh,x+Math.sin(sy*.035+t*11)*wobble,y+sy*s,w,sh*s+.5);}}else ctx.drawImage(core,x,y,w,h);ctx.restore();
  }
  const glowCache=new Map();
  function glow(x,y,r,color='255,222,154',alpha=1){
    let image=glowCache.get(color);if(!image){image=document.createElement('canvas');image.width=image.height=256;const c=image.getContext('2d'),g=c.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,`rgba(${color},1)`);g.addColorStop(.18,`rgba(${color},.7)`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(0,0,256,256);glowCache.set(color,image);}
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=clamp(alpha);ctx.drawImage(image,x-r,y-r,r*2,r*2);ctx.restore();
  }
  function starField(t,p=0){
    const cx=W*.51,cy=H*.25,q=ease(p);
    for(const s of stars){const alpha=clamp((t-s.delay)*1.4)*(.68+.32*Math.sin(t*1.7+s.phase));if(alpha<=0)continue;const swirl=(1-q)*p*2.4,dx=s.x-cx,dy=s.y-cy,x=cx+(dx*Math.cos(swirl)-dy*Math.sin(swirl))*(1-q),y=cy+(dx*Math.sin(swirl)+dy*Math.cos(swirl))*(1-q);
      if(p>.12){ctx.strokeStyle=`rgba(255,218,132,${alpha*.3})`;ctx.lineWidth=s.r*.6;ctx.beginPath();ctx.moveTo(x+(s.x-x)*.08,y+(s.y-y)*.08);ctx.lineTo(x,y);ctx.stroke();}
      glow(x,y,s.r*5,'255,222,154',alpha*.55);ctx.fillStyle=`rgba(255,246,211,${alpha})`;ctx.fillRect(x-s.r*.4,y-s.r,s.r*.8,s.r*2);ctx.fillRect(x-s.r,y-s.r*.4,s.r*2,s.r*.8);
    }if(p>0)glow(cx,cy,18+p*140,'255,235,180',p*.85);
  }
  const nodes=[[.18,.35],[.82,.35],[.17,.64],[.82,.64],[.5,.18],[.5,.7]];
  function orbits(t,connect){for(let i=0;i<nodes.length;i++){const [nx,ny]=nodes[i],a=ease((t-i*.5)/.7),x=nx*W,y=ny*H;if(a<=0)continue;ctx.save();ctx.globalAlpha=a*.8;ctx.strokeStyle=i%2?'#9dd9ff':'#ffe5a3';ctx.lineWidth=1.5;ctx.setLineDash([8,8]);ctx.lineDashOffset=-t*18;ctx.beginPath();ctx.ellipse(x,y,55,20,(i%2?1:-1)*.25,0,Math.PI*2);ctx.stroke();ctx.restore();glow(x,y,38,i%2?'127,199,255':'255,214,124',a*.45);if(connect){ctx.strokeStyle=`rgba(255,225,158,${a*.35})`;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(W*.5,y-80,W*.5,H*.4);ctx.stroke();const p=(t*.25+i*.17)%1;glow(x+(W*.5-x)*p,y+(H*.4-y)*p,10,'255,236,172',.9);}}}
  function orb(t,grow){const r=grow?28+ease(t/3.2)*80:6+ease(t/1.4)*20,x=W*.54,y=H*.4;glow(x,y,r*2.2,'131,38,249',.8);ctx.save();ctx.fillStyle='#160623';ctx.strokeStyle='#b970ff';ctx.lineWidth=2+Math.sin(t*7);ctx.beginPath();ctx.arc(x,y,r*(1+.04*Math.sin(t*8)),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#e8afff';for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(x,y,r*(1.1+j*.1),r*.3,t*(j%2?1:-1)+j,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  function gas(t,strength=1){for(let i=0;i<10;i++)glow(W*.5+Math.sin(i*2.3+t*.8)*W*.48,H*.43+Math.cos(i*1.7+t*.55)*H*.42,230+i%3*65,i%2?'97,24,185':'162,44,216',(.14+.04*Math.sin(t+i))*strength);ctx.fillStyle=`rgba(64,9,107,${.36*strength})`;ctx.fillRect(0,0,W,H);}
  function drawCracks(t){const p=Math.floor(clamp(t/4)*10)/10;ctx.save();ctx.lineCap='round';for(const c of cracks){const count=Math.floor(clamp((p-c.delay)*1.2)*(c.points.length-1));if(count<1)continue;for(const [color,width] of [['rgba(0,0,0,.92)',7],['rgba(220,177,255,.8)',1.5]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(c.points[0].x,c.points[0].y);for(let j=1;j<=count;j++)ctx.lineTo(c.points[j].x,c.points[j].y);ctx.stroke();}if(count<c.points.length-1)glow(c.points[count].x,c.points[count].y,11,'210,151,255',.7);}ctx.restore();}
  function makeFragments(){
    snapshot=document.createElement('canvas');snapshot.width=W;snapshot.height=H;snapshot.getContext('2d').drawImage(canvas,0,0);fragments=[];const grid=[];
    for(let y=0;y<=9;y++){grid[y]=[];for(let x=0;x<=8;x++)grid[y][x]={x:x*W/8+(x>0&&x<8?(rnd()-.5)*45:0),y:y*H/9+(y>0&&y<9?(rnd()-.5)*45:0)};}
    for(let y=0;y<9;y++)for(let x=0;x<8;x++)for(const pts of [[grid[y][x],grid[y][x+1],grid[y+1][x+1]],[grid[y][x],grid[y+1][x+1],grid[y+1][x]]]){const cx=pts.reduce((s,p)=>s+p.x,0)/3,cy=pts.reduce((s,p)=>s+p.y,0)/3;fragments.push({pts,cx,cy,vx:(cx-W*.5)*.7+(rnd()-.5)*140,vy:-100-rnd()*210,spin:(rnd()-.5)*2.8,delay:rnd()*.12});}
  }
  function shatter(t){if(!snapshot)return;for(const f of fragments){const a=Math.max(0,t-f.delay),dx=f.vx*a,dy=f.vy*a+600*a*a;if(f.cy+dy>H+190)continue;ctx.save();ctx.translate(f.cx+dx,f.cy+dy);ctx.rotate(f.spin*a);ctx.scale(1-.08*clamp(a),1-.18*clamp(a));ctx.translate(-f.cx,-f.cy);ctx.beginPath();f.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();const x=Math.max(0,Math.min(...f.pts.map(p=>p.x))-1),y=Math.max(0,Math.min(...f.pts.map(p=>p.y))-1),right=Math.min(W,Math.max(...f.pts.map(p=>p.x))+1),bottom=Math.min(H,Math.max(...f.pts.map(p=>p.y))+1);ctx.drawImage(snapshot,x,y,right-x,bottom-y,x,y,right-x,bottom-y);ctx.restore();}}
  function errors(t){const panels=[[80,360,235,128,'학생증 인증 오류','인증 정보를 확인할 수 없습니다'],[590,450,240,130,'강의실 안내 오류','목적지 좌표가 일치하지 않습니다'],[210,145,285,138,'공지 알림 폭주','읽지 않은 공지가 계속 도착합니다']];for(let i=0;i<3;i++){const [x,y,w,h,label,sub]=panels[i],a=ease((t-i*.9)/.8)*.88;if(a<=0)continue;ctx.save();ctx.globalAlpha=a;ctx.translate(x+Math.sin(t*15+i)*1.5,y+Math.sin(t+i)*4);ctx.fillStyle='#10162be8';ctx.strokeStyle='#ac76ea';ctx.lineWidth=2;ctx.fillRect(0,0,w,h);ctx.strokeRect(0,0,w,h);ctx.fillStyle='#d9caff';ctx.font='bold 19px sans-serif';ctx.fillText(label,15,30);ctx.fillStyle='#afabc6';ctx.font='12px sans-serif';ctx.fillText(sub,15,54);ctx.strokeStyle='#ff847e';ctx.lineWidth=3;if(i===0){ctx.strokeRect(18,73,62,36);ctx.beginPath();ctx.moveTo(100,78);ctx.lineTo(126,104);ctx.moveTo(126,78);ctx.lineTo(100,104);ctx.stroke();}else if(i===1){ctx.font='bold 38px sans-serif';ctx.fillStyle='#ffb3c8';ctx.fillText('←   →',30,105);}else for(let j=0;j<4;j++){ctx.fillStyle=j%2?'#a77bda':'#5a427c';ctx.fillRect(18+j*15,76+j*9,150,8);}ctx.restore();}}
  function draw(now){
    const t=Math.max(0,(now-start)/1000),elapsed=Math.max(0,(now-skyStart)/1000);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    if(mode==='awakening'){cover(campus,1.03,0,ease((t-.65)/2.7));glow(W*.51,H*.25,5+Math.sin(Math.min(t,1)*Math.PI)*60,'255,235,188',clamp(1-t/2));starField(Math.max(0,t-1)*.65);}
    else if(['campus','sky','gather'].includes(mode)){const p=mode==='gather'?clamp(t/5.2):0;cover(campus,mode==='gather'?1+p*p*2.8:1.03,mode==='sky'?ease(t/3)*140:mode==='gather'?140+ease(p)*H*.3:0);starField(elapsed+3,mode==='gather'?clamp((t-.4)/4.5):0);if(mode==='gather'){ctx.fillStyle=`rgba(0,0,0,${ease((p-.76)/.24)})`;ctx.fillRect(0,0,W,H);}}
    else if(mode==='threshold')glow(W*.5,H*.42,38,'255,220,144',.22+.05*Math.sin(t));
    else if(['core-reveal','core-title','orbits','connections','seed','growth','burst','fracture'].includes(mode)){
      ctx.save();if(mode==='fracture'){const impact=Math.pow(Math.max(0,Math.sin(t*7)),10)*(3+t*1.5);ctx.translate(Math.sin(t*79)*impact,Math.cos(t*97)*impact);}drawCore(mode==='core-reveal'?ease(t/5):1,mode==='fracture'?3+t*3.5:mode==='burst'?3:0,t);
      if(mode==='core-title'){const a=ease(t/.7)*ease((2.8-t)/.65);title.style.opacity=String(a);title.style.transform=`translateY(${(1-a)*10}px)`;}
      if(mode==='orbits'||mode==='connections')orbits(t,mode==='connections');if(mode==='seed'||mode==='growth')orb(t,mode==='growth');
      if(mode==='burst'){const p=clamp(t/1.8);gas(t,ease(p*3));glow(W*.54,H*.4,50+ease(p)*1300,'161,58,255',.9*(1-p));}if(mode==='fracture'){gas(t+2);drawCracks(t);}ctx.restore();
    }else if(mode==='shatter')shatter(t);
    else if(['reality-return','reality','errors','reality-out'].includes(mode)){cover(campus,1.03,0,mode==='reality-return'?ease(t/2.2):mode==='reality-out'?1-ease(t):1);if(mode==='reality'||mode==='errors')errors(mode==='errors'?t+3:t);}
  }
  function tick(now){raf=null;if(!mode||!layer?.isConnected){clear();return;}if(now-lastFrame>=30){draw(now);lastFrame=now;}raf=requestAnimationFrame(tick);}
  window.Chapter1PrologueV2={rewrite,present,clear,assets:{campus:campus.src,core:core.src}};
})();
