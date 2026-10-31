"use client";
import {useEffect,useRef,useState} from "react";
import {io} from "socket.io-client";
import {SERVER_URL,SOCKET_PATH} from "@/lib/site";
import {renderArtwork} from "@/lib/graffiti";
import "./creative-arena.css";

const ROOMS=Array.from({length:10},(_,i)=>i+1);
const MESSAGES={
  rooms_full:"All ten rooms are full or voting. Try another room or reconnect.",
  room_closed:"That room has started voting. Choose an open room.",
  already_submitted:"Your creation is already locked for this round.",
  round_closed:"Creation time is up. The voting round is next.",
  voting_closed:"Voting has closed for this round.",
  already_voted:"You've already cast your vote this round.",
  no_self_votes:"You can't vote for your own creation.",
  title_required:"Give your creation a title of at least 3 characters.",
  poem_too_short:"Write at least 8 characters to submit your poem.",
  invalid_artwork:"The artwork is missing or too detailed. Reduce the number of strokes.",
  adult_consent_required:"Please tick the 18+ and original-work agreement in the editor.",
  not_in_room:"You're not in a challenge room. Reconnect and try again."
};
const phaseLabel={waiting:"WAITING FOR STRANGERS",creating:"CREATE",voting:"VOTE",results:"RESULTS"};
const clock=(seconds)=>String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");

function ArtworkPreview({artwork,title}){
 const ref=useRef(null);
 useEffect(()=>{
  if(!ref.current||!artwork)return;
  try{renderArtwork(ref.current.getContext("2d"),artwork,600,375);}
  catch{ref.current.getContext("2d").clearRect(0,0,600,375);}
 },[artwork]);
 return <canvas ref={ref} width={600} height={375} role="img" aria-label={"Artwork: "+title} className="arena-art-preview"/>;
}

// Uses the existing poem editor / full graffiti studio: this competition never replaces the
// weekly gallery or its signed-card feature. Final entries are only shared with this room.
export default function CreativeArena({kind,draft,allowed=true,canSubmit=true}){
 const [connected,setConnected]=useState(false),[match,setMatch]=useState(null),[lobby,setLobby]=useState(null);
 const [message,setMessage]=useState(""),[pending,setPending]=useState(false),[now,setNow]=useState(Date.now()),[consent,setConsent]=useState(false),[contestTitle,setContestTitle]=useState(""),[contestTag,setContestTag]=useState("");
 const socketRef=useRef(null),desiredRoom=useRef(null),serverOffset=useRef(0),lastRound=useRef(0);
 const entries=match?.entries||[];
 const seconds=match?.endsAt?Math.max(0,Math.ceil((match.endsAt-(now+serverOffset.current))/1000)):0;
 const members=match?.participants||[];
 const me=match?.you;
 const mySubmission=Boolean(match?.yourSubmission);
 const myVote=match?.yourVote;
 const inRound=match?.phase==="creating";
 const prepared=kind==="poem"?(draft?.body||"").trim().length>=8 : (draft?.artwork?.ops?.length||0)>0;
 const resolvedTitle=(contestTitle.trim()||draft?.title||"").trim();
 const resolvedTag=(contestTag.trim()||draft?.author_tag||"").trim();
 const ready=Boolean(connected&&inRound&&!mySubmission&&(allowed||consent)&&canSubmit&&prepared&&resolvedTitle.length>=3);

 useEffect(()=>{
  const t=setInterval(()=>setNow(Date.now()),350);
  return ()=>clearInterval(t);
 },[]);
 useEffect(()=>{
  if(!SERVER_URL || (SERVER_URL.startsWith("http://localhost")&&typeof location!=="undefined"&&location.hostname!=="localhost")){
   setMessage("Live competitions are offline. The regular weekly gallery is still available.");return;
  }
  let gone=false;
  const s=io(SERVER_URL,{path:SOCKET_PATH,transports:["websocket","polling"],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelayMax:5000,timeout:9000});
  socketRef.current=s;
  s.on("connect",()=>{
   if(gone)return;
   setConnected(true);setMessage("");
   s.emit("arena:join",{kind,...(desiredRoom.current?{number:desiredRoom.current}:{})},ack=>{
    if(!ack?.ok)setMessage(MESSAGES[ack?.error]||"Could not enter a creative room.");
   });
  });
  s.on("arena:state",data=>{
   if(data.kind!==kind||gone)return;
   serverOffset.current=data.serverNow-Date.now();
   desiredRoom.current=data.number;
   if(data.phase==="creating" && data.round!==lastRound.current && lastRound.current!==0)
    setMessage("New round, new prompt. Clear or rewrite your draft for this theme.");
   lastRound.current=data.round;
   setMatch(data);
  });
  s.on("arena:lobby",data=>{if(data.kind===kind&&!gone)setLobby(data);});
  s.on("arena:votes",data=>{if(!gone)setMatch(old=>old?{...old,votes:data.count,yourVote:data.yourVote}:old);});
  s.on("disconnect",()=>{setConnected(false);setMatch(null);setMessage("Reconnecting to your creative room…");});
  s.on("connect_error",()=>setMessage("Live creative rooms are temporarily unavailable. The weekly wall is still open."));
  return ()=>{gone=true;s.disconnect();socketRef.current=null;};
 },[kind]);
 const switchRoom=(number)=>{
  if(!socketRef.current?.connected||pending||number===match?.number)return;
  setPending(true);
  socketRef.current.emit("arena:join",{kind,number},ack=>{
   setPending(false);
   if(ack?.ok){desiredRoom.current=number;setMessage("");}
   else setMessage(MESSAGES[ack?.error]||"Couldn't switch rooms.");
  });
 };
 const submit=()=>{
  if(!ready||pending||!socketRef.current)return;
  setPending(true);setMessage("");
  socketRef.current.emit("arena:submit",{
   title:resolvedTitle,author_tag:resolvedTag,ageConfirmed:true,
   ...(kind==="poem"?{body:draft.body}:{artwork:draft.artwork})
  },ack=>{
   setPending(false);
   setMessage(ack?.ok?"ENTRY LOCKED. When the seven-minute clock ends, strangers will vote.":
     (MESSAGES[ack?.error]||"Couldn't submit. Please retry."));
  });
 };
 const vote=(id)=>{
  if(pending||match?.phase!=="voting"||myVote)return;
  setPending(true);
  socketRef.current?.emit("arena:vote",{id},ack=>{
   setPending(false);
   setMessage(ack?.ok?"VOTE CAST. Your pick is locked until results.":
     (MESSAGES[ack?.error]||"Unable to vote."));
  });
 };
 const winners=new Set(match?.winnerIds||[]);
 return <section className={"arena-shell arena-"+kind} id="creative-arena" aria-labelledby="arena-title">
  <div className="arena-head">
   <div><div className="arena-kicker"><span className="arena-live-dot"/> LIVE / HUMAN-MADE / NO AI JUDGES</div>
    <h2 id="arena-title">THE <em>7-MINUTE</em><br/>CHALLENGE.</h2>
    <p>Ten rooms. Ten strangers per room. One surprise topic. Seven minutes to create, 60 seconds to vote. Most hearts wins. Next round starts automatically.</p>
   </div>
   <div className="arena-clock" aria-live="off"><span>{phaseLabel[match?.phase]||"CONNECTING"}</span>
    <strong>{match?.endsAt?clock(seconds):"--:--"}</strong>
    <small>{match?"ROOM "+String(match.number).padStart(2,"0")+" / 10":"REAL-TIME ARENA"}</small>
   </div>
  </div>
  <div className="arena-layout">
   <aside className="arena-sidebar">
    <div className="arena-sidebar-title">CHOOSE A ROOM <span>{lobby?.rooms.reduce((n,r)=>n+r.count,0)||0} ONLINE</span></div>
    <div className="arena-room-grid" aria-label="Available rooms">
      {ROOMS.map(n=>{
       const r=lobby?.rooms.find(x=>x.number===n),current=n===match?.number;
       return <button key={n} type="button" aria-pressed={current} title={"Room "+n+": "+(r?.count||0)+"/10 people, "+(r?.phase||"waiting")}
          disabled={!connected||pending||(!current&&!r?.open)} onClick={()=>switchRoom(n)}
          className={"arena-room-btn"+(current?" is-current":"")}>
         <span>{String(n).padStart(2,"0")}</span><small>{r?.count||0}/10</small><i aria-hidden="true"/>
       </button>;
      })}
    </div>
    <p className="arena-side-note">Rooms fill automatically. Switch to another open room any time. No profiles, no fake online counts.</p>
    {match&&<div className="arena-roster"><div>IN THIS ROOM <span>{members.length}/10</span></div>
      {members.map(m=><span key={m.id} className={m.id===me?"is-me":""}><b>{m.name}{m.id===me?" (YOU)":""}</b><small>{m.submitted?"✓ IN":"◦ HERE"}</small></span>)}
     </div>}
   </aside>
   <div className="arena-main">
    {!connected?<div className="arena-status">CONNECTING TO LIVE CHALLENGES… <span>●</span></div>:
     !match?<div className="arena-status">FINDING AN OPEN ROOM…</div>:
     <>
      <div className="arena-topic"><span>ROUND {String(match.round||0).padStart(2,"0")} / {match.phase==="waiting"?"AWAITING A CHALLENGER":"AUTO-GENERATED PROMPT"}</span>
       <strong>{match.topic||"The next theme is a surprise."}</strong>
       <small>{match.phase==="waiting"?"Two strangers start the seven-minute clock. Invite someone to join this wall.":
        match.phase==="creating"?"Make something original for this topic. Only one entry per player.":
        match.phase==="voting"?"The canvases are closed. Everyone gets one vote. You cannot vote for yourself.":
        "The room decides. A new topic launches after the results."}</small>
      </div>
      {match.phase==="creating"&&<div className="arena-create">
       <div className="arena-progress"><span style={{width:Math.min(100,Math.max(0,(1-seconds/(7*60))*100))+"%"}}/></div>
       <div className="arena-create-info"><strong>{match.submissions} / {members.length} ENTRIES LOCKED</strong><span>7 MIN CREATE · 1 MIN VOTE</span></div>
       <p>Use the {kind==="poem"?"poem editor":"paint studio"} on this page. Make your entry match the surprise topic, tick the original-work agreement, then lock it here before the timer ends.</p>
       <div className="arena-entry-fields"><label>CHALLENGE ENTRY TITLE<input maxLength={80} minLength={3} value={contestTitle} placeholder={draft?.title||"Give your entry a name"} onChange={e=>setContestTitle(e.target.value)}/></label><label>YOUR STAGE NAME <small>OPTIONAL</small><input maxLength={24} value={contestTag} placeholder="Anonymous artist" onChange={e=>setContestTag(e.target.value)}/></label></div>
       <label className="arena-consent"><input type="checkbox" checked={allowed||consent} onChange={e=>setConsent(e.target.checked)} disabled={allowed}/><span>I am 18+ and this is my original creation. I agree to show it to room members for voting.</span></label>
       <div className="arena-create-buttons">
        <a href={kind==="poem"?"#write":"#graffiti-studio"} className="arena-outline">{kind==="poem"?"↗ OPEN POEM EDITOR":"↗ OPEN PAINT STUDIO"}</a>
        <button type="button" onClick={submit} disabled={!ready||pending} className="arena-submit">{mySubmission?"✓ ENTRY LOCKED":pending?"SUBMITTING…":"SUBMIT TO THIS ROUND ↗"}</button>
       </div>
       {mySubmission&&<strong className="arena-locked">✓ Your entry is in. Watch the countdown — voting opens automatically.</strong>}
      </div>}
      {match.phase==="waiting"&&<div className="arena-wait"><span aria-hidden="true">✳</span><strong>YOUR ROOM IS OPEN.</strong><p>Waiting for a second person. You can work on your {kind==="poem"?"poem":"art"} while someone joins. The clock starts only when two people arrive.</p><a href={kind==="poem"?"#write":"#graffiti-studio"}>START CREATING ↗</a></div>}
      {match.phase==="voting"&&<div className="arena-vote-intro"><strong>THE GALLERY IS OPEN.</strong><p>Look through the submissions. Choose one favorite by tapping its heart. Your own entry cannot receive your vote.</p><span>{match.votes} VOTES CAST</span></div>}
      {match.phase==="results"&&<div className="arena-results"><strong>{winners.size?"THE PEOPLE HAVE SPOKEN.":"NO VOTES THIS ROUND."}</strong><p>{winners.size?(winners.size>1?"It's a tie. These creations share the crown.":"The highest-liked creation takes the crown."):"No winner was selected. The next round starts soon."}</p></div>}
      {(match.phase==="voting"||match.phase==="results")&&<div className="arena-entry-grid">
       {entries.length?entries.map(entry=><article key={entry.id} className={"arena-entry"+(winners.has(entry.id)?" is-winner":"")}>
        <div className="arena-entry-meta"><span>{winners.has(entry.id)?"★ ROUND WINNER":"ROOM "+String(match.number).padStart(2,"0")}</span><span>{entry.owner===me?"YOUR ENTRY":entry.author_tag}</span></div>
        {kind==="poem"?<div className="arena-poem"><h3>{entry.title}</h3><p>{entry.body}</p></div>:
          <ArtworkPreview artwork={entry.artwork} title={entry.title}/>}
        <div className="arena-entry-foot"><div><strong>{entry.title}</strong><small>BY {entry.author_tag}</small></div>
         {match.phase==="voting"?<button type="button" onClick={()=>vote(entry.id)} disabled={entry.owner===me||Boolean(myVote)||pending} className="arena-vote-button" aria-label={"Vote for "+entry.title}>♥ {myVote===entry.id?"VOTED":"VOTE"}</button>:
          <span className="arena-score">♥ {entry.likes||0}</span>}
        </div>
       </article>):<div className="arena-empty-votes">Nobody submitted this round. The next theme will appear shortly.</div>}
      </div>}
     </>}
    {message&&<div className="arena-feedback" role="status">{message}</div>}
    <p className="arena-footnote">Battles are temporary and anonymous. Winners are decided by participant likes, not AI. Weekly wall publishing and signed graffiti cards remain separate below. Reconnecting or a server restart may interrupt an unfinished round.</p>
   </div>
  </div>
 </section>;
}
