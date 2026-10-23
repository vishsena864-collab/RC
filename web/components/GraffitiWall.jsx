"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import WallGallery from "./WallGallery";
import {postWall,verifyCard} from "@/lib/walls";
import {PALETTE,STAMPS,TOOL_LIST,WALL_PRESETS,WALL_SIZE,renderArtwork,saveCanvas} from "@/lib/graffiti";
import "./walls.css";

const NEW_ART={background:"#343a38",style:"concrete",ops:[]};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hexColor=(data)=>"#"+[data[0],data[1],data[2]].map(x=>x.toString(16).padStart(2,"0")).join("");
function signedCard(ctx,art,entry,certificate){
 const w=1600,h=1100;const scale=2;
 ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#111b18");bg.addColorStop(.55,"#121619");bg.addColorStop(1,"#1c2d22");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 for(let i=0;i<1600;i++){
  const x=((i*97)%1613),y=((i*73)%1117);
  ctx.fillStyle=i%3?"rgba(222,255,121,.04)":"rgba(255,126,75,.06)";
  ctx.fillRect(x,y,2,2);
 }
 ctx.strokeStyle="#6e8556";ctx.lineWidth=2;ctx.strokeRect(35,35,w-70,h-70);
 ctx.fillStyle="#dffb70";ctx.fillRect(64,68,15,15);
 ctx.textBaseline="alphabetic";
 ctx.font="900 34px Arial,sans-serif";ctx.fillText("CHATSPARK",95,96);
 ctx.textAlign="right";ctx.font="700 19px monospace";ctx.fillText("CREATIVE DIVISION / 002",1534,90);ctx.textAlign="left";
 ctx.fillStyle="#f6f3e6";ctx.font="900 95px Impact,Arial Black,sans-serif";ctx.fillText("LEAVE YOUR MARK.",62,198);
 ctx.fillStyle="#99af98";ctx.font="600 23px monospace";ctx.fillText("THE GRAFFITI WALL  //  VERIFIED ANONYMOUS SUBMISSION",66,238);
 // The artwork itself is rendered from the exact stroke data that was published.
 ctx.save();ctx.shadowColor="#b3ee71";ctx.shadowBlur=32;
 ctx.fillStyle="#304034";ctx.fillRect(64,267,1472,574);
 ctx.shadowBlur=0;ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(77,280,1446,548);ctx.clip();
 ctx.translate(77,280);renderArtwork(ctx,art,1446,548);
 ctx.restore();
 ctx.strokeStyle="#dffb70";ctx.lineWidth=3;ctx.strokeRect(77,280,1446,548);
 ctx.fillStyle="#dffb70";ctx.fillRect(64,855,1472,2);
 ctx.fillStyle="#f7f6eb";ctx.font="900 47px Impact,Arial,sans-serif";ctx.fillText(String(entry.title||"UNTITLED").slice(0,42).toUpperCase(),69,921);
 ctx.textAlign="right";ctx.fillStyle="#dffb70";ctx.font="900 29px monospace";ctx.fillText(certificate.serial,1526,912);ctx.textAlign="left";
 ctx.fillStyle="#a7bd99";ctx.font="700 19px monospace";ctx.fillText("SIGNED BY: "+String(entry.author_tag||"UNKNOWN").toUpperCase(),70,958);
 ctx.textAlign="right";ctx.fillText("ISSUED "+certificate.issued.slice(0,10),1526,958);ctx.textAlign="left";
 ctx.fillStyle="#9daea1";ctx.font="700 17px monospace";ctx.fillText("SHA-256 ARTWORK DIGEST",70,993);
 ctx.font="17px monospace";ctx.fillText(certificate.digest,70,1019);
 ctx.fillStyle="#dffb70";ctx.font="700 17px monospace";ctx.fillText("HMAC-SHA-256 / SERVER-SIGNED PROOF",70,1053);
 ctx.fillStyle="#d4dfc9";ctx.font="14px monospace";ctx.fillText(certificate.signature,540,1053);
}
export default function GraffitiWall({locale="en"}){
 const [art,setArt]=useState(NEW_ART),[draft,setDraft]=useState(null);
 const [tool,setTool]=useState("spray"),[color,setColor]=useState("#dbff73"),[size,setSize]=useState(18),
 [opacity,setOpacity]=useState(1),[mirror,setMirror]=useState(false),[layer,setLayer]=useState(1),
 [hiddenLayers,setHiddenLayers]=useState([]),[text,setText]=useState("STAY WEIRD"),[stamp,setStamp]=useState("star"),[font,setFont]=useState("block"),
 [zoom,setZoom]=useState(100),[pan,setPan]=useState({x:0,y:0});
 const [title,setTitle]=useState(""),[tag,setTag]=useState(""),[allowed,setAllowed]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[certificate,setCertificate]=useState(null),[published,setPublished]=useState(null),[refresh,setRefresh]=useState(0);
 const canvas=useRef(null),cardCanvas=useRef(null),draftRef=useRef(null),tracking=useRef(null),panFrom=useRef(null),undoStack=useRef([]),redoStack=useRef([]);
 const record=(old)=>{undoStack.current.push(old);if(undoStack.current.length>35)undoStack.current.shift();redoStack.current=[];};
 const edit=(updater)=>{setArt(prev=>{record(prev);return typeof updater==="function"?updater(prev):updater;});setCertificate(null);setPublished(null);};
 const undo=useCallback(()=>{setArt(cur=>{if(!undoStack.current.length)return cur;const prev=undoStack.current.pop();redoStack.current.push(cur);return prev;});setCertificate(null);setPublished(null);},[]);
 const redo=useCallback(()=>{setArt(cur=>{if(!redoStack.current.length)return cur;const next=redoStack.current.pop();undoStack.current.push(cur);return next;});setCertificate(null);setPublished(null);},[]);
 useEffect(()=>{
  const fn=e=>{
    const tag=e.target?.tagName;
    if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
  };
  window.addEventListener("keydown",fn);return ()=>window.removeEventListener("keydown",fn);
 },[undo,redo]);
 useEffect(()=>{const c=canvas.current;if(c)renderArtwork(c.getContext("2d"),art,WALL_SIZE.w,WALL_SIZE.h,{draft,hiddenLayers});},[art,draft,hiddenLayers]);
 useEffect(()=>{if(published&&certificate&&cardCanvas.current) signedCard(cardCanvas.current.getContext("2d"),published.art,published.entry,certificate);},[published,certificate]);
 const pos=(e)=>{
   const r=e.currentTarget.getBoundingClientRect();
   return [clamp(Math.round((e.clientX-r.left)/r.width*1000),0,1000),clamp(Math.round((e.clientY-r.top)/r.height*1000),0,1000),Math.round(clamp(e.pressure||.5,.1,1)*100)/100];
 };
 const start=e=>{
   if(!e.isPrimary || (e.pointerType==="mouse"&&e.button!==0))return;
   e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
   if(tool==="pan"){panFrom.current={startX:e.clientX,startY:e.clientY,x:pan.x,y:pan.y};return;}
   const pt=pos(e);
   if(tool==="bucket"){edit(a=>({...a,background:color}));return;}
   if(tool==="pick"){
     const rgba=canvas.current.getContext("2d").getImageData(Math.floor(pt[0]/1000*960),Math.floor(pt[1]/1000*600),1,1).data;
     setColor(hexColor(rgba));setTool("marker");return;
   }
   const op={tool,color,size,opacity,pts:[pt],layer,mirror,
     ...(tool==="text"?{text:text.slice(0,80),font}:{}),
     ...(tool==="stamp"?{stamp}:{})};
   if(tool==="text"||tool==="stamp"){
     edit(prev=>({...prev,ops:[...prev.ops.slice(-279),op]}));return;
   }
   if(["line","rectangle","fill-rectangle","ellipse","fill-ellipse","arrow"].includes(tool))op.pts.push(pt);
   tracking.current=e.pointerId;draftRef.current=op;setDraft(op);
 };
 const move=e=>{
   if(tool==="pan" && panFrom.current){
     setPan({x:panFrom.current.x+(e.clientX-panFrom.current.startX),y:panFrom.current.y+(e.clientY-panFrom.current.startY)});
     return;
   }
   if(tracking.current!==e.pointerId || !draftRef.current)return;
   const pt=pos(e),prev=draftRef.current;
   let pts=prev.pts;
   if(["line","rectangle","fill-rectangle","ellipse","fill-ellipse","arrow"].includes(tool)){pts=[pts[0],pt];}
   else if(pts.length<190){
     const last=pts[pts.length-1];
     if(Math.abs(last[0]-pt[0])+Math.abs(last[1]-pt[1])<3)return;
     pts=[...pts,pt];
   }
   const next={...prev,pts};draftRef.current=next;setDraft(next);
 };
 const stop=e=>{
   if(panFrom.current){panFrom.current=null;return;}
   if(tracking.current!==e.pointerId||!draftRef.current)return;
   const op=draftRef.current;tracking.current=null;draftRef.current=null;setDraft(null);
   edit(prev=>({...prev,ops:[...prev.ops.slice(-279),op]}));
 };
 const replaceBackground=(nextStyle)=>{
   const preset=WALL_PRESETS.find(x=>x.id===nextStyle);
   if(!preset)return;
   edit(a=>({...a,style:preset.id,background:preset.base}));
 };
 const makeColorBackground=()=>edit(a=>({...a,background:color}));
 const clear=()=>{if(!confirm("Clear all paint from this wall?"))return;edit(a=>({...a,ops:[]}));};
 const reset=()=>{if(!confirm("Start a completely new graffiti?"))return;edit(NEW_ART);setTitle("");setTag("");};
 const submit=async(e)=>{
   e.preventDefault();if(!allowed||busy||!art.ops.length)return;
   if(hiddenLayers.length){setMessage("Reveal all layers before submitting so you can see exactly what will be published.");return;}
   setBusy(true);setMessage("");
   try{
     const res=await postWall({kind:"graffiti",title,author_tag:tag||"UNKNOWN",artwork:art,ageConfirmed:true});
     setPublished({art:JSON.parse(JSON.stringify(art)),entry:{...res.entry,title,author_tag:tag||"UNKNOWN"}});
     setCertificate(res.certificate);setRefresh(n=>n+1);
     setMessage("Your art is on the wall. Download its cryptographically signed ChatSpark card below.");
   }catch(e){setMessage(e.message);}finally{setBusy(false);}
 };
 const saveCard=()=>saveCanvas(cardCanvas.current,"ChatSpark-"+certificate?.serial+"-signature-card.png");
 return <div className="walls-shell graffiti-shell">
  <div className="walls-topline"><span>CHATSPARK / SIDE FEATURE 003</span><Link href={"/"+locale}>↖ BACK TO RANDOM CHAT</Link></div>
  <section className="walls-hero graffiti-hero">
    <span className="walls-hero-overline">THE INTERNET IS YOUR CANVAS / NO ACCOUNTS / NO UPLOADS</span>
    <div className="graffiti-hero-grid"><div><h1>DON'T JUST<br/>EXIST. <em>MARK IT.</em></h1><p>Take a digital spray can to the wall. Anyone can paint. Strangers decide what deserves to stay.</p><a className="walls-action-link" href="#graffiti-studio">ENTER THE PAINT STUDIO ↘</a></div><div className="graffiti-hero-art" aria-hidden="true"><span className="graffiti-poster-word">TAG<br/>THE<br/>WEB.</span><span>NO RULES FOR COLORS.<br/>RULES FOR RESPECT.</span></div></div>
  </section>
  <div className="walls-ribbon graffiti-ribbon">✳ ALL COLORS · ♥ VOTE FOR ART · ✳ SPRAY / NEON / BRUSH / STENCIL · ★ ONLY TOP FIVE ARCHIVED · NO ART FILE UPLOADS</div>
  <section id="graffiti-studio" className="graffiti-studio" aria-labelledby="graffiti-studio-heading">
   <header className="studio-title"><div><span className="walls-eyebrow">01 / YOUR STUDIO / INFINITE COLORS</span><h2 id="graffiti-studio-heading">Pick a tool. Make a mess.</h2></div><div className="studio-shortcuts">CTRL+Z UNDO · CTRL+Y REDO<br/>TOUCH & PEN SUPPORTED</div></header>
   <div className="studio-grid">
    <aside className="graffiti-toolbox">
     <div className="graffiti-box-label">YOUR PAINT TOOLS <span>{TOOL_LIST.length} TOOLS</span></div>
     <div className="graffiti-tools">{TOOL_LIST.map(t=><button type="button" key={t.id} className={"graffiti-tool "+(tool===t.id?"active":"")} aria-pressed={tool===t.id} title={t.name} onClick={()=>setTool(t.id)}><span>{t.icon}</span><small>{t.name}</small></button>)}</div>
     <div className="graffiti-box-label">ALL-COLOR PALETTE <span>TRUE RGB</span></div>
     <div className="graffiti-palettes">{PALETTE.map(c=><button key={c} type="button" className={"graffiti-swatch "+(c===color?"selected":"")} style={{background:c}} aria-label={"Color "+c} aria-pressed={c===color} onClick={()=>setColor(c)}/>)}</div>
     <label className="graffiti-custom-color">ANY COLOR <input type="color" value={color} onChange={e=>setColor(e.target.value)}/><output>{color.toUpperCase()}</output></label>
     <label className="graffiti-range">PAINT SIZE <output>{size}px</output><input type="range" min="1" max="80" value={size} onChange={e=>setSize(Number(e.target.value))}/></label>
     <label className="graffiti-range">OPACITY <output>{Math.round(opacity*100)}%</output><input type="range" min="10" max="100" value={Math.round(opacity*100)} onChange={e=>setOpacity(Number(e.target.value)/100)}/></label>
     <label className="graffiti-check"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> MIRROR DRAWING</label>
     <div className="graffiti-box-label">WALL SURFACE</div>
     <div className="graffiti-presets">{WALL_PRESETS.map(p=><button key={p.id} type="button" aria-pressed={art.style===p.id} className={art.style===p.id?"active":""} onClick={()=>replaceBackground(p.id)}><span style={{background:p.base}}/> {p.name}</button>)}</div>
     <button type="button" className="graffiti-tint" onClick={makeColorBackground}>FILL WALL WITH SELECTED COLOR ↗</button>
     {tool==="stamp"&&<><div className="graffiti-box-label">SELECT STENCIL</div><div className="graffiti-stamps">{STAMPS.map(s=><button type="button" key={s.id} aria-pressed={stamp===s.id} onClick={()=>setStamp(s.id)}>{s.mark}</button>)}</div></>}
     {tool==="text"&&<><div className="graffiti-box-label">YOUR LETTERING</div><input className="graffiti-text-input" value={text} maxLength={80} onChange={e=>setText(e.target.value)} placeholder="Your tag"/><select className="graffiti-font" value={font} onChange={e=>setFont(e.target.value)}><option value="block">BLOCK / WILDSTYLE</option><option value="hand">HANDLETTERED</option><option value="mono">STENCIL MONO</option></select></>}
    </aside>
    <div className="graffiti-canvas-column">
     <div className="graffiti-canvas-head"><div><span className="graffiti-live-dot"/> LIVE CANVAS <span className="graffiti-layer-text">{art.ops.length} MARKS</span></div><div className="graffiti-canvas-actions"><button type="button" onClick={undo} disabled={!undoStack.current.length}>↶ UNDO</button><button type="button" onClick={redo} disabled={!redoStack.current.length}>↷ REDO</button><button type="button" onClick={clear}>CLEAR</button></div></div>
     <div className="graffiti-canvas-viewport"><canvas ref={canvas} width={WALL_SIZE.w} height={WALL_SIZE.h} className={"graffiti-canvas "+(tool==="pan"?"is-pan":"")} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} style={{transform:"translate("+pan.x+"px,"+pan.y+"px) scale("+(zoom/100)+")"}} aria-label="Interactive graffiti wall drawing canvas">Your browser needs HTML5 Canvas to draw.</canvas></div>
     <div className="graffiti-canvas-bottom"><div className="graffiti-status">◉ {tool.toUpperCase()} ACTIVE · {color} · LAYER {layer+1}</div><div className="graffiti-zoom"><button type="button" onClick={()=>setZoom(100)}>FIT</button><button type="button" onClick={()=>setZoom(z=>clamp(z-20,100,250))}>−</button><span>{zoom}%</span><button type="button" onClick={()=>setZoom(z=>clamp(z+20,100,250))}>+</button></div></div>
     <div className="graffiti-layer-bar"><span>LAYERS</span>{["BACKGROUND TAGS","LETTERING","HIGHLIGHTS"].map((name,i)=><button type="button" key={i} onClick={()=>setLayer(i)} aria-pressed={layer===i}>0{i+1} {name}</button>)}<button type="button" onClick={()=>setHiddenLayers([])}>SHOW ALL</button></div>
     <div className="graffiti-save-row"><button type="button" onClick={()=>saveCanvas(canvas.current,"chatspark-graffiti-draft.png")}>↓ DOWNLOAD RAW ART</button><button type="button" onClick={reset}>↺ NEW CANVAS</button><span>All tools work locally. Only your final strokes are submitted.</span></div>
    </div>
   </div>
  </section>
  <section className="graffiti-publish"><div className="graffiti-publish-copy"><span className="walls-eyebrow">02 / SIGN THE WALL</span><h2>Your art deserves an identity.</h2><p>Publish your work, then collect a premium branded ChatSpark Signature Card. Its SHA-256 content digest is authenticated by a server-side HMAC, so the submission details can be checked for tampering.</p><p className="graffiti-note">It does not prove legal copyright ownership or real-world identity. Only the top five liked artworks per weekly round remain on the wall.</p></div>
  <form onSubmit={submit} className="graffiti-publish-form"><label>ARTWORK TITLE<input required minLength={3} maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="The name of your piece"/></label><label>ARTIST TAG <span>(OPTIONAL)</span><input maxLength={24} value={tag} onChange={e=>setTag(e.target.value)} placeholder="UNKNOWN"/></label><label className="walls-consent"><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)}/><span>I'm 18+ and I created or have the rights to this artwork. I agree to public voting and weekly deletion of non-winners.</span></label><button type="submit" className="walls-submit" disabled={busy||!allowed||!art.ops.length||title.trim().length<3}>{busy?"MINTING YOUR SIGNATURE…":"PUBLISH ART + MINT SIGNATURE CARD ↗"}</button>{message&&<div role="status" className="walls-feedback">{message}</div>}</form></section>
  {certificate&&published&&<section className="graffiti-certified" aria-labelledby="card-heading"><div className="graffiti-card-intro"><span className="walls-eyebrow">03 / YOUR SIGNED ARTWORK</span><h2 id="card-heading">Not just a drawing. A trace you existed.</h2><p>This high-resolution premium card includes your artwork, title, artist tag, full SHA-256 digest, and an HMAC-SHA-256 signature from the server.</p><button className="walls-submit" onClick={saveCard}>↓ DOWNLOAD SIGNATURE CARD / PNG</button><button className="walls-outline" onClick={async()=>{try{const result=await verifyCard({id:published.entry.id,kind:"graffiti",digest:certificate.digest,issued:certificate.issued,signature:certificate.signature});setMessage(result.valid?"Signature validated by ChatSpark.":"Signature verification failed.");}catch(e){setMessage(e.message);}}}>✓ VERIFY DIGITAL SIGNATURE</button><div className="graffiti-card-code">{certificate.serial}<br/>{certificate.digest.slice(0,28)}…</div></div><div className="graffiti-card-canvas-wrap"><canvas ref={cardCanvas} width={1600} height={1100} aria-label="Preview of your downloadable ChatSpark signature card"/></div></section>}
  <WallGallery kind="graffiti" refreshKey={refresh}/>
  <div className="walls-endline"><span>PAINT WITHOUT A PROFILE / STAY FOR THE STRANGERS</span><Link href={"/"+locale+"/poem-wall"}>READ THE POEM WALL ↗</Link></div>
 </div>;
}
