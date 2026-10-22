"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {io} from "socket.io-client";
import {SERVER_URL} from "@/lib/site";
import "./underground.css";

const fmt = seconds => !Number.isFinite(seconds) ? "--:--" : Math.floor(Math.max(0,seconds)/60)+":"+String(Math.floor(Math.max(0,seconds)%60)).padStart(2,"0");
export default function UndergroundFM({locale="en"}){
 const [tracks,setTracks]=useState([]),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[loading,setLoading]=useState(true),[notice,setNotice]=useState("");
 const [preview,setPreview]=useState(null);const [connected,setConnected]=useState(false),[room,setRoom]=useState(null),[isDj,setIsDj]=useState(false),[messages,setMessages]=useState([]),[draft,setDraft]=useState(""),[playing,setPlaying]=useState(false),[clock,setClock]=useState(0);
 const socket=useRef(null),audio=useRef(null),roomRef=useRef(null),audioTrackId=useRef(null),guestId=useRef(null);
 useEffect(()=>{const ctrl=new AbortController();setLoading(true);fetch("/api/underground/tracks"+(term?"?q="+encodeURIComponent(term):""),{signal:ctrl.signal}).then(r=>r.json()).then(j=>{setTracks(j.tracks||[]);setNotice(j.error||"");}).catch(()=>setNotice("Unable to load tracks. Please retry.")).finally(()=>setLoading(false));return ()=>ctrl.abort();},[term]);
 useEffect(()=>{
  if(!SERVER_URL){setNotice("Live rooms are not configured yet.");return;}
  const s=io(SERVER_URL,{transports:["websocket","polling"],autoConnect:true,reconnectionAttempts:5,timeout:8000});socket.current=s;
  s.on("connect",()=>{setConnected(true);guestId.current=s.id;setNotice("");});
  s.on("disconnect",()=>{setConnected(false);setRoom(null);roomRef.current=null;setIsDj(false);setPlaying(false);});
  s.on("connect_error",()=>setNotice("Live rooms are offline. You can still discover underground artists."));
  s.on("fm:state",data=>{roomRef.current=data;setRoom(data);setIsDj(data.dj===s.id);});
  s.on("fm:chat",entry=>setMessages(v=>[...v.slice(-39),entry]));
  return ()=>{s.emit("fm:leave");s.disconnect();socket.current=null;};
 },[]);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return ()=>clearInterval(id)},[]);
 useEffect(()=>{
  const a=audio.current;
  if(!a)return;
  const currentTrack=room?.track||preview;if(!currentTrack){a.pause();audioTrackId.current=null;setPlaying(false);return;}
  const id=currentTrack.id;
  if(audioTrackId.current!==id){audioTrackId.current=id;a.src="https://api.audius.co/v1/tracks/"+encodeURIComponent(id)+"/stream";a.load();setPlaying(false);}
  const sync=()=>{if(!room?.startedAt || !a.duration || !Number.isFinite(a.duration))return;const elapsed=Math.max(0,(Date.now()-room.startedAt)/1000);if(elapsed>0 && Math.abs(a.currentTime-elapsed)>3)a.currentTime=Math.min(elapsed,a.duration-0.3);};
  sync(); const handler=()=>sync();a.addEventListener("loadedmetadata",handler);
  // Autoplay is commonly blocked. A deliberate Play click unlocks each browser.
  return ()=>a.removeEventListener("loadedmetadata",handler);
 },[room?.track?.id,room?.startedAt,preview?.id]);
 const join=()=>{setMessages([]);socket.current?.emit("fm:join",(ack)=>{if(!ack?.ok)setNotice("No free room right now. Try again.");});};
 const leave=()=>{socket.current?.emit("fm:leave");audio.current?.pause();setPlaying(false);setRoom(null);roomRef.current=null;setMessages([]);};
 const choose=(track)=>{if(!room){setPreview(track);setNotice("Preview selected. Press Play to listen from Audius.");return;}const event=isDj?"fm:play":"fm:request";socket.current?.emit(event,track,(ack)=>setNotice(ack?.ok?(isDj?"Broadcasting selected track.":"Added to the room queue."):"Couldn't add that track."));};
 const togglePlay=async()=>{const a=audio.current;if(!a||!(room?.track||preview))return;try{if(a.paused){await a.play();setPlaying(true);}else{a.pause();setPlaying(false);}}catch{setNotice("Tap play again, or try a different track.");}};
 const send=()=>{const text=draft.trim();if(!text||!room)return;socket.current?.emit("fm:chat",text);setDraft("");};
 const elapsed=room?.startedAt?Math.max(0,(clock-room.startedAt)/1000):0;
 return <div className="fm-shell">
 <div className="fm-top"><span>CS / FREQUENCY DIVISION</span><span className="fm-top-right"><span className="fm-blink"/> UNDERGROUND RADIO · NO RECORDINGS</span></div>
 <section className="fm-hero"><div className="fm-num">001 — THE UNDISCOVERED</div><div className="fm-hero-row"><h1>GOOD MUSIC.<br/><i>STRANGE PEOPLE.</i></h1><div className="fm-orbit" aria-hidden="true"><span>FIND YOUR<br/>FREQUENCY</span><div className="fm-orbit-core">↗</div></div></div><p>Random listeners. Unknown artists. One shared frequency. No profiles, no playlists to build, no history to keep.</p><div className="fm-actions">{room?<button className="fm-main" onClick={leave}>LEAVE FREQUENCY ↗</button>:<button className="fm-main" disabled={!connected} onClick={join}>{connected?"TUNE INTO A RANDOM ROOM ↗":"RADIO CONNECTING…"}</button>}<Link href={`/${locale}/start`} className="fm-ghost">BACK TO STRANGER CHAT ↗</Link></div></section>
 <div className="fm-marquee" aria-hidden="true"><span>♫ NO ALGORITHMS HERE  //  STRANGERS SELECT THE SOUND  //  PASS THE AUX  //  </span><span>♫ NO ALGORITHMS HERE  //  STRANGERS SELECT THE SOUND  //  PASS THE AUX  //  </span></div>
 <div className="fm-layout"><section className="fm-stage"><div className="fm-panel-head"><span>01 / LISTENING ROOM</span><span>{room?room.room+" · "+room.listeners+"/12 PEOPLE":"NOT TUNED IN"}</span></div>
 <div className="fm-cover"><span className="fm-sun">✳</span><span className="fm-center-word">SOUND<br/>WITHOUT<br/>BORDERS</span><span className="fm-cover-tag">CHATSPARK / UNDERGROUND FM</span></div>
 <div className="fm-player"><div className="fm-player-label">{room?.track?"NOW PLAYING · "+(isDj?"YOU'RE THE DJ":"RANDOM DJ"):preview?"SOLO PREVIEW · STREAMED DIRECTLY FROM AUDIUS":"NO SIGNAL YET"}</div><h2>{(room?.track||preview)?.title||"The next unknown favorite."}</h2><p>{(room?.track||preview)?.artist||"Explore tracks while the live room server connects."}</p>
 <div className="fm-controls"><button className="fm-play" onClick={togglePlay} disabled={!(room?.track||preview)} aria-label={playing?"Pause music":"Play music"}>{playing?"Ⅱ":"▶"}</button><div className="fm-time">{room?.track?fmt(elapsed):preview?fmt(audio.current?.currentTime||0):"00:00"} <span>· LIVE POSITION</span></div><div className="fm-spacer"/>{isDj&&room?<button className="fm-small-action" onClick={()=>socket.current?.emit("fm:next")}>NEXT TRACK ↗</button>:null}{isDj&&room?<button className="fm-small-action" onClick={()=>socket.current?.emit("fm:pass")}>PASS THE AUX ↗</button>:null}</div>
 <audio ref={audio} preload="none" onEnded={()=>{setPlaying(false);if(isDj)socket.current?.emit("fm:next");}} onError={()=>setNotice("Track unavailable for external streaming. Choose another.")}/></div>
 <div className="fm-rule">Each visitor streams from Audius directly. No song uploads. Browser playback may require pressing Play.</div>
 </section>
 <section className="fm-discover"><div className="fm-panel-head"><span>02 / UNDERGROUND FINDS</span><span>POWERED BY AUDIUS</span></div><form className="fm-search" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}><input aria-label="Search underground music" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ARTISTS, TRACKS, MOODS…"/><button type="submit">SEARCH ↗</button></form><div className="fm-tracklist">{loading?<p>SCANNING FREQUENCIES…</p>:tracks.length?tracks.map((t,i)=><div className="fm-track" key={t.id}><span className="fm-track-number">{String(i+1).padStart(2,"0")}</span><div className="fm-track-details"><strong>{t.title}</strong><small>{t.artist}{t.genre?" / "+t.genre:""}</small></div>{t.permalink&&<a href={t.permalink} target="_blank" rel="noopener noreferrer" aria-label={"Listen on Audius: "+t.title}>↗</a>}<button onClick={()=>choose(t)} title={!room?"Preview track":isDj?"Play for room":"Request from DJ"}>{!room?"PREVIEW ▶":isDj?"PLAY +":"QUEUE +"}</button></div>):<p>NO TRACKS FOUND. TRY A DIFFERENT SEARCH.</p>}</div>
 <div className="fm-queue"><strong>ROOM QUEUE / {room?.queue?.length||0}</strong>{room?.queue?.length?room.queue.map((entry,i)=><p key={entry.track.id+"-"+i}>{i+1}. {entry.track.title} <small>— {entry.track.artist}</small></p>):<p>Nothing requested yet. Surprise the room.</p>}</div>
 </section>
 <section className="fm-chat"><div className="fm-panel-head"><span>03 / IN THE CROWD</span><span>{room?.listeners||0} CONNECTED</span></div><div className="fm-feed" role="log" aria-label="Room chat">{messages.length?messages.map((m,i)=><p key={m.at+"-"+i}><b>{m.from}</b><span>{m.text}</span></p>):<p className="fm-muted">Room conversations disappear when you leave. Say hello after tuning in.</p>}</div><form onSubmit={e=>{e.preventDefault();send()}} className="fm-send"><input aria-label="Your message" maxLength={280} value={draft} onChange={e=>setDraft(e.target.value)} disabled={!room} placeholder="SAY SOMETHING…"/><button disabled={!room||!draft.trim()}>SEND ↗</button></form><div className="fm-chat-tip">No recordings or public profiles · Leave anytime · Be respectful</div></section></div>
 {notice&&<div className="fm-toast" role="status" onClick={()=>setNotice("")}>{notice} ×</div>}
 <div className="fm-bottom"><span>STRANGE MUSIC / REAL PEOPLE</span><span>© CHATSPARK AFTERHOURS</span></div></div>;
}
