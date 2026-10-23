"use client";
import {useEffect,useRef,useState} from "react";
import {flagWall,likeWall,loadWall} from "@/lib/walls";
import {renderArtwork} from "@/lib/graffiti";

function GraffitiThumb({artwork,title}){
 const ref=useRef(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas||!artwork)return;
  canvas.width=600;canvas.height=375;
  renderArtwork(canvas.getContext("2d"),artwork,600,375);
 },[artwork]);
 return <canvas ref={ref} width={600} height={375} className="walls-art-thumb" role="img" aria-label={"Graffiti artwork: "+title}/>;
}
export default function WallGallery({kind,refreshKey=0}){
 const [view,setView]=useState("active"),[entries,setEntries]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(""),[action,setAction]=useState(null),[zoom,setZoom]=useState(null);
 const reload=()=>{
   setBusy(true);setError("");
   loadWall(kind,view).then(r=>setEntries(r.items||[])).catch(e=>setError(e.message)).finally(()=>setBusy(false));
 };
 useEffect(()=>{let cancelled=false;setBusy(true);setError("");
   loadWall(kind,view).then(r=>{if(!cancelled)setEntries(r.items||[]);})
      .catch(e=>{if(!cancelled)setError(e.message);})
      .finally(()=>{if(!cancelled)setBusy(false);});
   return ()=>{cancelled=true};
 },[kind,view,refreshKey]);
 const like=async(entry)=>{
  setAction(entry.id);
  try{const r=await likeWall(entry.id);setEntries(s=>s.map(e=>e.id===entry.id?{...e,likes:r.likes}:e));}
  catch(e){setError(e.message);}
  finally{setAction(null);}
 };
 const report=async(entry)=>{
  if(!confirm("Report this submission for harmful or abusive content?"))return;
  setAction(entry.id);
  try{const r=await flagWall(entry.id);if(r.hidden)setEntries(s=>s.filter(e=>e.id!==entry.id));else setError("Report received. Thank you.");}
  catch(e){setError(e.message);}
  finally{setAction(null);}
 };
 return <section className="walls-gallery" aria-label={kind==="poem"?"Poem leaderboard":"Graffiti leaderboard"}>
  <div className="walls-gallery-header"><div><span className="walls-eyebrow">COMMUNITY CURATED / {kind==="poem"?"THE WRITTEN WORD":"THE PAINTED WALL"}</span><h2>{view==="active"?"This week's contenders":"Hall of fame"}</h2></div>
   <button className="walls-refresh" onClick={reload} disabled={busy} title="Reload leaderboard">↻ REFRESH</button>
  </div>
  <div className="walls-toggle" role="group" aria-label="Leaderboard period"><button onClick={()=>setView("active")} aria-pressed={view==="active"}>LIVE VOTE / THIS WEEK</button><button onClick={()=>setView("hall")} aria-pressed={view==="hall"}>PERMANENT TOP 5</button></div>
  <p className="walls-rule">{view==="active"?"Each week only five winning "+(kind==="poem"?"poems":"artworks")+" survive. All other submissions are deleted at the next round.":"These creations won their weekly round and earned a permanent place."}</p>
  {error?<div className="walls-feedback" role="status">{error} <button onClick={()=>setError("")} aria-label="Dismiss">×</button></div>:null}
  {busy?<div className="walls-empty">SEARCHING THE WALL…</div>:entries.length===0?<div className="walls-empty"><span>✳</span><strong>THE WALL IS STILL BLANK.</strong><p>Be the first stranger to leave something worth remembering.</p></div>:
  <div className={"walls-entry-grid "+(kind==="poem"?"walls-poem-grid":"walls-art-grid")}>
   {entries.map((e,i)=><article className="walls-entry" key={e.id}>
    <div className="walls-entry-meta"><span>{view==="active"?"RANK "+String(i+1).padStart(2,"0"):"ARCHIVED / "+e.season_start}</span><span>{e.status==="winner"?"★ FOREVER":"ON THE WALL"}</span></div>
    {kind==="graffiti"?<button className="walls-art-open" onClick={()=>setZoom(e)} title="Enlarge artwork"><GraffitiThumb artwork={e.artwork} title={e.title}/></button>:
    <div className="walls-poem-sheet"><div className="walls-poem-quote">“</div><p>{e.body}</p><div className="walls-poem-sheet-foot">THE POEM WALL • CS</div></div>}
    <div className="walls-entry-foot"><div><h3>{e.title}</h3><span>BY {e.author_tag||"UNKNOWN"}</span></div><div className="walls-like"><button onClick={()=>like(e)} disabled={Boolean(action)||view==="hall"} title={view==="hall"?"Voting closed":"Like this creation"}>♥ <strong>{e.likes}</strong></button>{view==="active"&&<button className="walls-report" onClick={()=>report(e)} disabled={Boolean(action)} aria-label={"Report "+e.title}>⚑</button>}</div></div>
   </article>)}
  </div>}
  {zoom&&<div className="walls-art-modal" role="dialog" aria-modal="true" aria-label={"Artwork "+zoom.title} onClick={()=>setZoom(null)}><div className="walls-art-modal-inner" onClick={e=>e.stopPropagation()}><button onClick={()=>setZoom(null)} className="walls-modal-close">CLOSE ✕</button><GraffitiThumb artwork={zoom.artwork} title={zoom.title}/><strong>{zoom.title}</strong><small>BY {zoom.author_tag}</small></div></div>}
 </section>;
}
