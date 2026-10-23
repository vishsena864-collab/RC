// Pixel-only artwork renderer. Paint is kept as bounded vector strokes, never uploaded photos.
export const WALL_SIZE={w:960,h:600};
export const WALL_PRESETS=[
  {id:"concrete",name:"Raw concrete",base:"#343a38"},
  {id:"brick",name:"Brick tunnel",base:"#542e30"},
  {id:"night",name:"Night black",base:"#15151c"},
  {id:"metal",name:"Factory steel",base:"#283e49"},
  {id:"paper",name:"Poster wheatpaste",base:"#d7c7a6"}
];
export const PALETTE=["#dbff73","#ff4e72","#ff7e40","#f9d22b","#00e8bc","#19b5ff","#a266ff","#f851d4","#ffffff","#14151b","#ff2525","#00ff70","#54deff","#ffadff","#bdffea","#1f2f29"];
export const TOOL_LIST=[
  {id:"spray",name:"Spray paint",icon:"✳"},{id:"splatter",name:"Paint splatter",icon:"⁂"},{id:"drip",name:"Paint drips",icon:"♨"},{id:"glow-spray",name:"Neon aerosol",icon:"☄"},{id:"neon",name:"Neon tube",icon:"ϟ"},
  {id:"marker",name:"Paint marker",icon:"▰"},{id:"brush",name:"Brush",icon:"〰"},
  {id:"pencil",name:"Pencil",icon:"✎"},{id:"calligraphy",name:"Chisel pen",icon:"◆"},
  {id:"rainbow",name:"Rainbow",icon:"◒"},{id:"highlighter",name:"Highlighter",icon:"▥"},
  {id:"eraser",name:"Eraser",icon:"⌫"},{id:"bucket",name:"Fill wall",icon:"▣"},{id:"line",name:"Line",icon:"╱"},
  {id:"rectangle",name:"Rectangle",icon:"▭"},{id:"fill-rectangle",name:"Solid block",icon:"■"},{id:"ellipse",name:"Circle",icon:"◯"},{id:"fill-ellipse",name:"Solid circle",icon:"●"},
  {id:"arrow",name:"Arrow",icon:"➜"},{id:"text",name:"Lettering",icon:"T"},
  {id:"stamp",name:"Stencil",icon:"★"},{id:"pick",name:"Pick color",icon:"◉"},
  {id:"pan",name:"Pan",icon:"✥"}
];
export const STAMPS=[{id:"star",mark:"★"},{id:"heart",mark:"♥"},{id:"lightning",mark:"ϟ"},{id:"smile",mark:"☺"},{id:"crown",mark:"♛"},{id:"flower",mark:"✿"},{id:"spark",mark:"✳"}];
const FONT={block:"Impact,Arial Black,sans-serif",hand:"Comic Sans MS,cursive",mono:"ui-monospace,monospace"};
function hash(n){const z=Math.sin(n*12.9898+78.233)*43758.5453;return z-Math.floor(z);}
function path(ctx,pts,w,h){
  if(!pts.length)return;
  ctx.beginPath();
  pts.forEach((p,i)=>{
    const x=p[0]/1000*w,y=p[1]/1000*h;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  if(pts.length===1){const p=pts[0];ctx.lineTo(p[0]/1000*w+.01,p[1]/1000*h+.01);}
}
function strokeOne(ctx,op,w,h){
  const pts=op.pts||[];
  if(!pts.length)return;
  const a=pts[0],z=pts[pts.length-1];
  const size=Math.max(1,(op.size||12)*w/960);
  const color=op.color||"#dbff73";
  const alpha=Math.max(0,Math.min(1,op.opacity??1));
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.lineJoin="round";ctx.lineCap="round";
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=size;
  if(op.tool==="eraser"){ctx.globalCompositeOperation="destination-out";ctx.lineWidth=size*2;path(ctx,pts,w,h);ctx.stroke();ctx.restore();return;}
  if(["spray","splatter","glow-spray"].includes(op.tool)){
    ctx.fillStyle=color;
    const radius=size*(op.tool==="splatter"?4.2:op.tool==="glow-spray"?2.2:2.4);
    if(op.tool==="glow-spray"){ctx.shadowColor=color;ctx.shadowBlur=size*2.8;}
    pts.forEach((p,k)=>{
      const x=p[0]/1000*w,y=p[1]/1000*h;
      for(let i=0;i<(op.tool==="splatter"?30:18);i++){
        const seed=(k+1)*51+(i+1)*37+Math.round((p[0]+p[1])*.3);
        const r=radius*Math.sqrt(hash(seed)),angle=hash(seed+11)*Math.PI*2;
        ctx.beginPath();ctx.arc(x+Math.cos(angle)*r,y+Math.sin(angle)*r,Math.max(.35,size*(.02+.065*hash(seed+20))),0,Math.PI*2);ctx.fill();
      }
    });
    ctx.restore();return;
  }
  if(op.tool==="drip"){
    path(ctx,pts,w,h);ctx.lineWidth=size*1.1;ctx.stroke();
    pts.forEach((p,i)=>{
      if(i%7!==0)return;
      const x=p[0]/1000*w,y=p[1]/1000*h,drip=size*(1.5+hash(i+24)*4);
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+drip);ctx.lineWidth=Math.max(1,size*(.15+.15*hash(i+19)));ctx.stroke();
    });ctx.restore();return;
  }
  if(op.tool==="text"||op.tool==="stamp"){
    const label=op.tool==="text"?String(op.text||"").slice(0,80):(STAMPS.find(s=>s.id===op.stamp)?.mark||"★");
    ctx.font="900 "+Math.max(12,size*3.3)+"px "+(FONT[op.font]||FONT.block);
    ctx.textBaseline="middle";
    ctx.shadowColor=op.neonText?color:"transparent";
    ctx.shadowBlur=op.neonText?20:0;
    ctx.fillText(label,a[0]/1000*w,a[1]/1000*h,Math.max(40,w*.8));ctx.restore();return;
  }
  if(["line","rectangle","fill-rectangle","ellipse","fill-ellipse","arrow"].includes(op.tool)){
    const x=a[0]/1000*w,y=a[1]/1000*h,ex=z[0]/1000*w,ey=z[1]/1000*h;
    ctx.beginPath();
    if(op.tool==="line" || op.tool==="arrow"){
      ctx.moveTo(x,y);ctx.lineTo(ex,ey);
    }else if(["rectangle","fill-rectangle"].includes(op.tool)){
      ctx.rect(x,y,ex-x,ey-y);
    }else{
      ctx.ellipse((x+ex)/2,(y+ey)/2,Math.max(.1,Math.abs(ex-x)/2),Math.max(.1,Math.abs(ey-y)/2),0,0,Math.PI*2);
    }
    if(op.tool==="fill-rectangle"||op.tool==="fill-ellipse")ctx.fill();else ctx.stroke();
    if(op.tool==="arrow"){
      const angle=Math.atan2(ey-y,ex-x),n=Math.max(12,size*2.5);
      ctx.beginPath();ctx.moveTo(ex,ey);
      ctx.lineTo(ex-Math.cos(angle-.55)*n,ey-Math.sin(angle-.55)*n);
      ctx.moveTo(ex,ey);
      ctx.lineTo(ex-Math.cos(angle+.55)*n,ey-Math.sin(angle+.55)*n);
      ctx.stroke();
    }
    ctx.restore();return;
  }
  if(op.tool==="rainbow"){
    for(let i=1;i<pts.length;i++){
      ctx.strokeStyle="hsl("+((i*12+Math.round(pts[i][0]))%360)+" 100% 62%)";
      ctx.beginPath();ctx.moveTo(pts[i-1][0]/1000*w,pts[i-1][1]/1000*h);
      ctx.lineTo(pts[i][0]/1000*w,pts[i][1]/1000*h);ctx.stroke();
    }
    ctx.restore();return;
  }
  if(op.tool==="neon"){
    ctx.shadowColor=color;ctx.shadowBlur=size*2.6;ctx.lineWidth=size*1.5;
    path(ctx,pts,w,h);ctx.stroke();
    ctx.shadowBlur=size*0.7;ctx.lineWidth=Math.max(1.5,size*.35);ctx.strokeStyle="#ffffff";
    path(ctx,pts,w,h);ctx.stroke();ctx.restore();return;
  }
  if(op.tool==="highlighter"){ctx.globalAlpha=alpha*.4;ctx.lineWidth=size*2.4;}
  if(op.tool==="pencil"){ctx.lineWidth=Math.max(1,size*.26);}
  if(op.tool==="calligraphy"){ctx.lineCap="square";ctx.lineJoin="miter";ctx.lineWidth=size*.7;}
  if(op.tool==="brush"){ctx.shadowBlur=size*.24;ctx.shadowColor=color;}
  path(ctx,pts,w,h);ctx.stroke();ctx.restore();
}
function wallSurface(ctx,art,w,h){
  const base=art.background||"#343a38";
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
  const style=art.style||"concrete";
  ctx.save();ctx.strokeStyle=style==="paper"?"rgba(50,36,24,.12)":"rgba(255,255,255,.045)";ctx.lineWidth=1;
  if(style==="brick"){
    const bh=h/13,bw=w/10;
    for(let y=0;y<14;y++){
      const off=y%2?bw/2:0;
      ctx.beginPath();ctx.moveTo(0,y*bh);ctx.lineTo(w,y*bh);ctx.stroke();
      for(let x=-1;x<13;x++){const X=x*bw+off;ctx.beginPath();ctx.moveTo(X,y*bh);ctx.lineTo(X,(y+1)*bh);ctx.stroke();}
    }
  }else if(style==="metal"){
    for(let x=0;x<w;x+=w/16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  }else{
    for(let i=0;i<220;i++){
      const x=hash(i+91)*w,y=hash(i+190)*h;
      ctx.fillStyle=i%2?"rgba(255,255,255,.045)":"rgba(0,0,0,.052)";
      ctx.fillRect(x,y,1+hash(i)*2,1+hash(i+23)*2);
    }
  }
  ctx.restore();
  const shade=ctx.createLinearGradient(0,0,w,h);shade.addColorStop(0,"rgba(255,255,255,.06)");shade.addColorStop(1,"rgba(0,0,0,.18)");
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
}
export function renderArtwork(ctx,art,w,h,{draft=null,hiddenLayers=[]}={}){
  if(!ctx||!art)return;
  ctx.save();ctx.clearRect(0,0,w,h);wallSurface(ctx,art,w,h);
  const ink=document.createElement("canvas");ink.width=w;ink.height=h;
  const pen=ink.getContext("2d");
  if(pen){
    const ops=[...(art.ops||[]),...(draft?[draft]:[])];
    for(const layer of [0,1,2]){
      if(hiddenLayers.includes(layer))continue;
      for(const op of ops.filter(o=>(o.layer||0)===layer)){
        strokeOne(pen,op,w,h);
        if(op.mirror){
          strokeOne(pen,{...op,mirror:false,pts:op.pts.map(p=>[1000-p[0],p[1],...(p.length>2?[p[2]]:[])])},w,h);
        }
      }
    }
    ctx.drawImage(ink,0,0);
  }
  ctx.restore();
}
export function saveCanvas(canvas,filename){
  if(!canvas)return;
  canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  },"image/png");
}
