"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {io} from "socket.io-client";
import {SERVER_URL} from "@/lib/site";
import "./underground.css";
import "./underground-show.css";

const THEMES=[
 {id:"acid",name:"Acid Lime",a:"#ddff73",b:"#80ffb1",dark:"#1c3221"},
 {id:"infrared",name:"Infrared Red",a:"#ff625c",b:"#ffb467",dark:"#381d29"},
 {id:"ultraviolet",name:"Ultraviolet",a:"#cf7cff",b:"#ff70cf",dark:"#251738"},
 {id:"ocean",name:"Ocean Cyan",a:"#2de5ee",b:"#72aaff",dark:"#122837"},
 {id:"gold",name:"Solar Gold",a:"#ffe77a",b:"#ff9c55",dark:"#362819"},
 {id:"rose",name:"Velvet Pulse",a:"#ff84c8",b:"#ffb9a5",dark:"#36202c"},
 {id:"midnight",name:"Midnight Tunnel",a:"#83a5ff",b:"#75d0ff",dark:"#111b34"},
 {id:"toxic",name:"Neon Riot",a:"#9cff2d",b:"#fe52b8",dark:"#2c1536"}
];
const FX=[["march","Marching lasers"],["pulse","Pulse glow"],["sweep","Wave sweep"],["crossfire","Crossfire"],["tunnel","Tunnel"],["bloom","Soft bloom"],["drift","Afterhours drift"]];
const MOODS=[["energy","⚡","More energy"],["chill","〰","Chill it down"],["love","♥","Keep the vibe"],["deep","✦","Go deeper"]];
const REACTIONS=[["heart","❤️"],["fire","🔥"],["spark","✨"],["wave","🌊"]];
const defaults={theme:"acid",fx:"march",intensity:2,beatBpm:116,showMoment:null};
const clockFmt=seconds => !Number.isFinite(seconds)?"00:00":Math.floor(Math.max(0,seconds)/60)+":"+String(Math.floor(Math.max(0,seconds)%60)).padStart(2,"0");
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
const fmtListeners=(n)=>Number(n||0).toLocaleString("en-US");
function LightStage({lights,track,roomCode,reduceMotion=false,showMoment=false}){
 const theme=THEMES.find(t=>t.id===lights.theme)||THEMES[0];
 const active=lights.intensity>0 && !reduceMotion;
 const vars={"--show-a":theme.a,"--show-b":theme.b,"--show-dark":theme.dark,"--show-beat":(60/(lights.beatBpm||116)).toFixed(3)+"s","--show-strength":String(lights.intensity||0)};
 return <div className={"show-scene show-fx-"+lights.fx+(active?" show-active":" show-still")+(showMoment?" show-moment":"")} style={vars} aria-hidden="true">
  <div className="show-backdrop"/>
  <div className="show-haze show-haze-one"/><div className="show-haze show-haze-two"/>
  <div className="show-laser show-laser-one"/><div className="show-laser show-laser-two"/><div className="show-laser show-laser-three"/><div className="show-laser show-laser-four"/>
  <div className="show-horizon"/>
  <div className="show-crowd">{[0,1,2,3,4,5,6,7,8,9,10,11,12].map(n=><span key={n} />)}</div>
  <div className="show-beat-bars">{Array.from({length:34},(_,i)=><i key={i} style={{"--i":i,"--delay":((i*7)%13)/13+"s","--height":(18+((i*31+7)%70))+"%"}}/>)}</div>
  <div className="show-spotlight"><span>CHATSPARK / LIVE FREQUENCY</span><strong>{roomCode||"UNDERGROUND"}</strong><small>{track?"SOUND IN MOTION":"FIND YOUR FREQUENCY"}</small></div>
  {showMoment&&<div className="show-impact"/>}
  <div className="show-vignette"/>
 </div>;
}
export default function UndergroundFM({locale="en"}){
 const [tracks,setTracks]=useState([]),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const [preview,setPreview]=useState(null),[connected,setConnected]=useState(false),[room,setRoom]=useState(null),[isDj,setIsDj]=useState(false),[messages,setMessages]=useState([]),[draft,setDraft]=useState(""),[playing,setPlaying]=useState(false),[clock,setClock]=useState(Date.now());
 const [reactions,setReactions]=useState([]),[reduced,setReduced]=useState(false),[openChat,setOpenChat]=useState(false),[showDiscover,setShowDiscover]=useState(true);
 const [visualMode,setVisualMode]=useState("rhythm"),[selectedTrack,setSelectedTrack]=useState(null);
 const socket=useRef(null),audio=useRef(null),streamTrackId=useRef(null),joining=useRef(false);
 const fx=room?.lights||defaults;
 const theme=THEMES.find(t=>t.id===fx.theme)||THEMES[0];
 const current=room?.track||preview;
 const roomElapsed=room?.startedAt?Math.max(0,(clock-room.startedAt)/1000):0;
 const duration=Number(current?.duration)||0;
 const time=room?.track?roomElapsed:audio.current?.currentTime||0;
 const turnLeft=room?.djSince?Math.max(0,Math.ceil(((room.djTurnMs||240000)-(clock-room.djSince))/1000)):null;
 const showMoment=Boolean(room?.lights?.showMoment&&clock-room.lights.showMoment.at<3500);
 const vars={"--show-a":theme.a,"--show-b":theme.b,"--show-dark":theme.dark,"--show-beat":(60/(fx.beatBpm||116)).toFixed(3)+"s"};
 useEffect(()=>{
  if(!isDj && room && !room.track && preview)setPreview(null);
 },[room?.room,isDj,room?.track]);
 useEffect(()=>{
   // Respect OS reduced motion before the first animated room is shown.
   const mq=window.matchMedia("(prefers-reduced-motion: reduce)");
   const change=()=>setReduced(mq.matches);
   change();mq.addEventListener?.("change",change);
   return ()=>mq.removeEventListener?.("change",change);
 },[]);
 useEffect(()=>{
  if(room&&!isDj)return;
  const controller=new AbortController();setLoading(true);
  fetch("/api/underground/tracks"+(term?"?q="+encodeURIComponent(term):""),{signal:controller.signal})
   .then(r=>r.json()).then(j=>{setTracks(j.tracks||[]);if(j.error)setNotice(j.error);})
   .catch(e=>{if(e.name!=="AbortError")setNotice("Music discovery unavailable right now.");})
   .finally(()=>setLoading(false));
  return ()=>controller.abort();
 },[term,isDj,room?.room]);
 useEffect(()=>{
  if(!SERVER_URL || /^http:\/\/localhost/i.test(SERVER_URL)&&location.hostname!=="localhost"){
    setNotice("Live rooms are offline until the ChatSpark real-time server is deployed.");return;
  }
  const s=io(SERVER_URL,{transports:["websocket","polling"],autoConnect:true,reconnectionAttempts:5,timeout:8000});
  socket.current=s;
  s.on("connect",()=>{setConnected(true);setNotice("");});
  s.on("disconnect",()=>{setConnected(false);setRoom(null);setIsDj(false);setPlaying(false);});
  s.on("connect_error",()=>setNotice("Live rooms are offline. Solo Audius discovery is still available."));
  s.on("fm:state",data=>{setRoom(data);setIsDj(data.dj===s.id);});
  s.on("fm:chat",entry=>setMessages(v=>[...v.slice(-79),entry]));
  s.on("fm:reaction",entry=>{setReactions(v=>[...v.slice(-11),{...entry,id:Math.random()}]);});
  return ()=>{s.emit("fm:leave");s.disconnect();socket.current=null;};
 },[]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),500);return ()=>clearInterval(timer);},[]);
 useEffect(()=>{
  const a=audio.current;if(!a)return;
  if(!current){a.pause();streamTrackId.current=null;setPlaying(false);return;}
  if(streamTrackId.current!==current.id){
   streamTrackId.current=current.id;a.src="https://api.audius.co/v1/tracks/"+encodeURIComponent(current.id)+"/stream";
   a.load();setPlaying(false);
  }
  const sync=()=>{
   if(!room?.startedAt||!a.duration||!Number.isFinite(a.duration))return;
   const offset=Math.max(0,(Date.now()-room.startedAt)/1000);
   if(offset<a.duration&&Math.abs(a.currentTime-offset)>3)a.currentTime=offset;
  };
  a.addEventListener("loadedmetadata",sync);sync();
  return ()=>a.removeEventListener("loadedmetadata",sync);
 },[current?.id,room?.startedAt]);
 const join=()=>{
  if(!connected||joining.current)return;
  joining.current=true;setMessages([]);setReactions([]);
  socket.current?.emit("fm:join",ack=>{joining.current=false;if(!ack?.ok)setNotice("All rooms are full. Try again shortly.");});
  setTimeout(()=>{joining.current=false;},8000);
 };
 const leave=()=>{
  socket.current?.emit("fm:leave");
  audio.current?.pause();setRoom(null);setIsDj(false);setPlaying(false);setMessages([]);setNotice("");
 };
 const command=(event,payload,label)=>{
  if(!socket.current||!room)return;
  socket.current.emit(event,payload,ack=>{if(!ack?.ok)setNotice(ack?.error==="dj_only"?"The controller role changed.":ack?.error==="cooldown"?"This action needs a short cooldown.":"Couldn't "+label+".");});
 };
 const selectTrack=(track)=>{
  if(!room){setPreview(track);setSelectedTrack(track);setNotice("Selected for solo preview. Press play to listen.");return;}
  if(!isDj)return;
  setSelectedTrack(track);
 };
 const playSelected=()=>{
  if(!isDj||!selectedTrack||!room)return;
  command("fm:play",selectedTrack,"play track");
 };
 const togglePlay=async()=>{
  if(!current||!audio.current)return;
  try{
   if(audio.current.paused){await audio.current.play();setPlaying(true);}
   else{audio.current.pause();setPlaying(false);}
  }catch{setNotice("The stream could not play. Try another track or tap play again.");}
 };
 const submitChat=()=>{const text=draft.trim();if(!text||!room)return;socket.current?.emit("fm:chat",text);setDraft("");};
 const react=kind=>{
  if(!room)return;
  command("fm:reaction",kind,"send reaction");
 };
 const styleChange=payload=>{if(!isDj)return;command("fm:lights",payload,"update room lighting");};
 const fxTrigger=kind=>command("fm:moment",kind,"trigger show moment");
 return <div className="fm-shell fm-show-shell" style={vars}>
  <div className="fm-top fm-show-top"><span><strong>ChatSpark ⚡</strong> <span className="fm-brand-divider">/</span> UNDERGROUND <em>FM</em></span><span className="fm-top-right"><span className="fm-blink"/> RANDOM PEOPLE. REAL MUSIC.</span></div>
  <div className="show-room-top">
   <div className="show-room-visual"><LightStage lights={fx} track={current} roomCode={room?.room} reduceMotion={reduced||visualMode==="off"} showMoment={showMoment}/></div>
   <div className="show-room-copy">
    <div className="show-live-row"><span className={"show-live-pill "+(connected&&room?"":"show-unplugged")}>● {room?"ON AIR":"DISCOVER MODE"}</span><span className="show-count">♧ {fmtListeners(room?.listeners)} LISTENERS</span><span className="show-room-identifier">{room?room.room:"THE UNDERGROUND"}</span></div>
    <h1>{room?room.room==="MIDNIGHT"?"The Midnight Lobby":room.room+" Frequency":"The Midnight Lobby"}</h1>
    <p>Good music. Strange people. A room that moves to the rhythm.</p>
    <div className="show-hero-foot">
     <div className="show-current-controller"><span>{room?(isDj?"♛ YOU ARE THE CONTROLLER":"♛ CURRENT CONTROLLER"):"✳ FIND YOUR FREQUENCY"}</span><strong>{room?(isDj?"YOUR SET":"A STRANGER IS LIVE"):"DISCOVER THE UNKNOWN"}</strong>{room&&<small>{turnLeft!==null?"ROTATES IN "+clockFmt(turnLeft):"THE AUX CHANGES HANDS"}</small>}</div>
     <div className="show-hero-join">{room?<button onClick={leave} className="show-join show-leave">LEAVE ROOM ↗</button>:<button onClick={join} disabled={!connected} className="show-join">{connected?"TUNE INTO LIVE ROOM ↗":"ROOMS OFFLINE"}</button>}</div>
    </div>
   </div>
  </div>
  <div className="show-now-section"><div className="show-now-main">
   <div className="show-section-label"><span>● NOW PLAYING</span><span>{room?"SHARED RADIO / "+room.room:preview?"SOLO PREVIEW / AUDIUS":"WAITING FOR A SIGNAL"}</span></div>
   <div className="show-now-content">
    <div className="show-album"><div className="show-record"><div className="show-record-hole"/></div><span>CS / RADIO<br/>AFTERHOURS</span></div>
    <div className="show-song"><h2>{current?.title||"Unknown Frequencies"}</h2><p>{current?.artist||"A stranger will choose the next soundtrack."}</p><div className="show-genre-chips"><span>UNDERGROUND</span><span>{room?"LIVE BROADCAST":"DISCOVER"}</span><span>{theme.name}</span></div>
     <div className={"show-wave "+(playing?"show-wave-playing":"")}>{Array.from({length:47},(_,i)=><i key={i} style={{"--h":((i*13+Math.round(Math.sin(i*.9)*23+50))%83+15)+"%","--delay":((i*11)%19)/15+"s"}}/>)}</div>
     <div className="show-progress"><div className="show-progress-track"><span style={{width:current&&duration?clamp(time/duration*100,0,100)+"%":room?.track?clamp((time%180)/180*100,0,100)+"%":"0%"}}/></div><small>{clockFmt(time)} {duration?"/ "+clockFmt(duration):"/ LIVE"}</small></div>
     <div className="show-player-controls"><button onClick={togglePlay} disabled={!current} className="show-audio-play" aria-label={playing?"Pause audio":"Play audio"}>{playing?"Ⅱ":"▶"}</button><span>Tap to {playing?"pause":"listen"} on this device</span><button className="show-accessible" onClick={()=>{setVisualMode(v=>v==="off"?"rhythm":"off");setReduced(v=>!v)}} aria-pressed={reduced||visualMode==="off"}>{reduced||visualMode==="off"?"ENABLE FX":"REDUCE MOTION"}</button></div>
    </div>
   </div>
   <audio ref={audio} preload="none" onEnded={()=>{setPlaying(false);if(isDj&&room)command("fm:next",undefined,"skip");}} onError={()=>setNotice("Track unavailable for external Audius streaming.")}/>
  </div>
  <div className="show-live-side"><strong>ROOM AURA</strong><div className="show-aura-gauge"><span>{room?Math.min(99,55+Object.values(room.mood||{}).reduce((a,b)=>a+b,0)):0}%</span></div><small>{theme.name.toUpperCase()} / {FX.find(x=>x[0]===fx.fx)?.[1]?.toUpperCase()}</small><div className="show-aura-message">THE WHOLE ROOM SHARES THE CONTROLLER'S LIGHTS.</div></div></div>
  <div className="show-content-grid">
   <div className="show-main-column">
    {room&&isDj?<section className="show-controller-board">
     <div className="show-mode-title"><span>♛ CONTROLLER MODE</span><small>YOU SHAPE THE SOUND + LIGHTS</small></div>
     <div className="show-dj-actions"><button disabled={!selectedTrack} onClick={playSelected}>▶ PLAY SELECTED <small>{selectedTrack?.title||"PICK A TRACK BELOW"}</small></button><button onClick={()=>command("fm:next",undefined,"play next")}>⏭ NEXT TRACK</button><button onClick={()=>command("fm:pass",undefined,"pass controller")}>⟳ PASS THE AUX</button></div>
     <div className="show-light-studio"><div className="show-studio-head"><div><strong>✳ COLOR / LIGHT STUDIO</strong><small>THE LISTENERS EXPERIENCE EVERY CHANGE</small></div><button onClick={()=>styleChange({theme:"acid",fx:"march",intensity:2,beatBpm:116})}>RESET ↺</button></div>
      <div className="show-theme-grid">{THEMES.map(t=><button key={t.id} onClick={()=>styleChange({theme:t.id})} aria-pressed={fx.theme===t.id} className="show-theme-button" style={{"--theme-a":t.a,"--theme-b":t.b,"--theme-dark":t.dark}}><span className="show-theme-illustration"><i/><i/><i/></span><strong>{t.name}</strong></button>)}</div>
      <div className="show-controls-row"><div className="show-fx-field"><label htmlFor="show-fx">LIGHT MOVEMENT</label><select id="show-fx" value={fx.fx} onChange={e=>styleChange({fx:e.target.value})}>{FX.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div><div className="show-fx-field"><label htmlFor="show-intensity">INTENSITY</label><select id="show-intensity" value={fx.intensity} onChange={e=>styleChange({intensity:Number(e.target.value)})}><option value={0}>OFF</option><option value={1}>SOFT</option><option value={2}>LIVE</option><option value={3}>WILD (FLASH SAFE)</option></select></div><div className="show-fx-field"><label htmlFor="show-tempo">RHYTHM / ESTIMATED BPM</label><input id="show-tempo" type="range" min={60} max={180} step={2} value={fx.beatBpm} onChange={e=>styleChange({beatBpm:Number(e.target.value)})}/><span>{fx.beatBpm} BPM</span></div></div>
      <div className="show-moment-head">SHOW MOMENTS <small>25 SECOND COOLDOWN</small></div><div className="show-moment-actions">{[["drop","✳ DROP HIT"],["flip","↗ COLOR FLIP"],["storm","ϟ BASS STORM"],["fade","◌ SLOW FADE"]].map(([kind,label])=><button onClick={()=>fxTrigger(kind)} key={kind}>{label}</button>)}</div>
     </div>
     <div className="show-discover-card"><div className="show-section-head"><div><span>DISCOVER / CONTROLLER LIBRARY</span><small>ONLY THE CONTROLLER SEES SONG SELECTION</small></div><button onClick={()=>setShowDiscover(v=>!v)}>{showDiscover?"COLLAPSE −":"EXPAND +"}</button></div>
     {showDiscover&&<><form className="show-music-search" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH ARTISTS, TRACKS, MOODS…" aria-label="Search music"/><button>DISCOVER ↗</button></form><div className="show-tracks">{loading?<p>FINDING UNDERGROUND SOUNDS…</p>:tracks.map((track,i)=><button type="button" key={track.id} className={"show-track "+(selectedTrack?.id===track.id?"chosen":"")} onClick={()=>selectTrack(track)}><span className="show-track-icon">♫</span><span className="show-track-info"><strong>{track.title}</strong><small>{track.artist}{track.genre?" · "+track.genre:""}</small></span><span className="show-track-choose">{selectedTrack?.id===track.id?"SELECTED ✓":"SELECT +"}</span></button>)}</div></>}
     </div>
     <div className="show-queue"><span>ON DECK / {room.queue?.length||0} REQUESTS</span>{room.queue?.length?room.queue.map((entry,i)=><div key={i}>{i+1}. <strong>{entry.track.title}</strong> <small>{entry.track.artist}</small></div>):<p>Room requests appear here when listeners suggest songs.</p>}</div>
    </section>:room?<section className="show-listener-board">
     <div className="show-mode-title"><span>◉ LISTENER MODE</span><small>YOU FEEL THE SHOW · THE CONTROLLER DIRECTS IT</small></div>
     <div className="show-listener-intro"><strong>THE ROOM IS ALIVE.</strong><p>Every beat, reaction and color belongs to this moment. Tune in. Leave a mark on the vibe.</p></div>
     <div className="show-listener-tiles"><div><span>✳ DISCOVER MODE</span><strong>THE STRANGERS MAKE THE SOUNDTRACK.</strong><small>Explore a new track every time the controller changes.</small></div><div><span>♛ CONTROLLER CURRENTLY</span><strong>AN ANONYMOUS DJ</strong><small>LIGHTS: {theme.name.toUpperCase()}</small></div></div>
     <div className="show-react-section"><h3>LIVE REACTIONS</h3><p>Send a feeling into the crowd.</p><div className="show-reaction-buttons">{REACTIONS.map(([kind,emoji])=><button key={kind} onClick={()=>react(kind)} aria-label={"React "+kind}>{emoji}</button>)}</div></div>
     <div className="show-mood-section"><h3>VOTE THE VIBE</h3><p>Help influence the room atmosphere.</p><div className="show-mood-tiles">{MOODS.map(([kind,emoji,label])=><button onClick={()=>command("fm:mood",kind,"vote")} key={kind}><span>{emoji}</span><strong>{label}</strong><small>{room.mood?.[kind]||0} VOTES</small></button>)}</div></div>
     <div className="show-request-section"><span>♫ REQUEST A TRACK</span><p>Listeners can suggest tracks in room chat. The controller alone selects and plays songs.</p><button onClick={()=>setOpenChat(true)}>OPEN CHAT TO REQUEST ↗</button></div>
    </section>:<section className="show-solo-discovery">
      <div className="show-mode-title"><span>✳ UNDERGROUND DISCOVER</span><small>LISTEN TO ARTISTS WHILE ROOMS ARE OFFLINE</small></div>
      <h3>NEW SOUNDS, EVEN WITHOUT A CROWD.</h3><p>The live show needs the ChatSpark Socket.IO server. You can still explore Audius music here and preview tracks individually.</p>
      <form className="show-music-search" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH AUDIUS MUSIC…" aria-label="Search Audius tracks"/><button>SEARCH ↗</button></form>
      <div className="show-tracks">{loading?<p>FINDING UNDERGROUND SOUNDS…</p>:tracks.map(t=><button key={t.id} className={"show-track "+(selectedTrack?.id===t.id?"chosen":"")} onClick={()=>selectTrack(t)}><span className="show-track-icon">♫</span><span className="show-track-info"><strong>{t.title}</strong><small>{t.artist}</small></span><span className="show-track-choose">PREVIEW ▶</span></button>)}</div>
     </section>}
    <section className="show-room-aura"><div className="show-section-head"><div><span>THE ROOM AURA</span><small>COLORS SHAPED BY CONTROLLER · MOODS BY STRANGERS</small></div><span>LIVE / {theme.name.toUpperCase()}</span></div><div className="show-aura-strip">{MOODS.map(([kind,emoji,label])=><div key={kind}><span>{emoji}</span><small>{label}</small><strong>{room?.mood?.[kind]||0}</strong></div>)}</div></section>
   </div>
   <aside className={"show-chat-column "+(openChat?"chat-expanded":"")}><div className="show-section-head"><div><span>ROOM CHAT</span><small>CONTROLLER + LISTENERS · ALL WELCOME</small></div><span>{room?.listeners||0} HERE</span></div>
    <div className="show-message-list" role="log" aria-live="polite" aria-label="Room conversation">{messages.length?messages.map((msg,i)=><div className="show-message" key={msg.at+"-"+i}><span className={"show-chat-avatar "+(msg.from==="DJ"?"show-chat-dj":"")}>{msg.from==="DJ"?"♛":"✳"}</span><div><small>{msg.from==="DJ"?"CONTROLLER":"STRANGER"} · {new Date(msg.at).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</small><p>{msg.text}</p></div></div>):<div className="show-empty-chat"><strong>NO VOICES YET.</strong><p>{room?"Be the first to say hello. Everyone in this room can chat.":"When the rooms come online, strangers and the controller can talk together here."}</p></div>}</div>
    <div className="show-reaction-float" aria-hidden="true">{reactions.filter(r=>clock-r.at<2200).map(r=><span key={r.id}>{REACTIONS.find(x=>x[0]===r.kind)?.[1]||"✨"}</span>)}</div>
    <form onSubmit={e=>{e.preventDefault();submitChat();}} className="show-chat-compose"><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={280} disabled={!room} aria-label="Message the room" placeholder={room?"MESSAGE THE ROOM…":"JOIN A ROOM TO CHAT"}/><button disabled={!room||!draft.trim()} type="submit" aria-label="Send message">➤</button></form>
    <div className="show-chat-foot">Temporary room chat. No recordings or user profiles. Be respectful.</div>
    {room&&<button className="show-mobile-chat-close" onClick={()=>setOpenChat(false)}>↓ RETURN TO THE SHOW</button>}
   </aside>
  </div>
  <div className="show-mobile-dock"><button onClick={()=>setOpenChat(false)}>◉ <span>THE SHOW</span></button><button onClick={()=>{if(room)setOpenChat(true);else join();}}>{room?"☰":"♧"} <span>{room?"ROOM CHAT":"JOIN ROOM"}</span></button><button onClick={()=>{setVisualMode(v=>v==="off"?"rhythm":"off");setReduced(v=>!v)}}>{reduced||visualMode==="off"?"◌":"✳"} <span>VISUAL FX</span></button></div>
  {notice&&<div className="fm-toast show-notice" role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Dismiss notice">×</button></div>}
  <div className="fm-bottom"><span>CHATSPARK / RANDOM PEOPLE, REAL MUSIC</span><Link href={"/"+locale+"/start"}>BACK TO STRANGER CHAT ↗</Link></div>
 </div>;
}
