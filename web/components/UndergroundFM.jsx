"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {io} from "socket.io-client";
import {SERVER_URL,SOCKET_PATH} from "@/lib/site";
import "./underground.css";
import "./underground-show.css";
import "./underground-club.css";

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
const MOODS=[["energy","🔥","FIRE"],["love","✦","KEEP THE VIBE"],["chill","◌","CHILL IT DOWN"]];
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const REACTIONS=[["heart","❤️"],["fire","🔥"],["spark","✨"],["wave","🌊"]];
const defaults={theme:"acid",fx:"march",intensity:2,beatBpm:116,showMoment:null};
const clockFmt=seconds => !Number.isFinite(seconds)?"00:00":Math.floor(Math.max(0,seconds)/60)+":"+String(Math.floor(Math.max(0,seconds)%60)).padStart(2,"0");
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
const fmtListeners=(n)=>Number(n||0).toLocaleString("en-US");
function LightStage({lights,track,roomCode,reduceMotion=false,showMoment=false,momentKind=null,moodBurst=null}){
 const theme=THEMES.find(t=>t.id===lights.theme)||THEMES[0];
 const active=lights.intensity>0 && !reduceMotion;
 const vars={"--show-a":theme.a,"--show-b":theme.b,"--show-dark":theme.dark,"--show-beat":(60/(lights.beatBpm||116)).toFixed(3)+"s","--show-strength":String(lights.intensity||0)};
 return <div className={"show-scene show-fx-"+lights.fx+(active?" show-active":" show-still")+(showMoment?" show-moment show-moment-"+momentKind:"")+(moodBurst?" show-aura-"+moodBurst.kind:"")} style={vars} aria-hidden="true">
  <div className="show-backdrop"/>
  <div className="show-haze show-haze-one"/><div className="show-haze show-haze-two"/>
  <div className="show-laser show-laser-one"/><div className="show-laser show-laser-two"/><div className="show-laser show-laser-three"/><div className="show-laser show-laser-four"/>
  <div className="show-horizon"/>
  <div className="show-crowd">{[0,1,2,3,4,5,6,7,8,9,10,11,12].map(n=><span key={n} />)}</div>
  <div className="show-beat-bars">{Array.from({length:34},(_,i)=><i key={i} style={{"--i":i,"--delay":((i*7)%13)/13+"s","--height":(18+((i*31+7)%70))+"%"}}/>)}</div>
  <div className="show-spotlight"><span>CHATSPARK / LIVE FREQUENCY</span><strong>{roomCode||"UNDERGROUND"}</strong><small>{track?"SOUND IN MOTION":"FIND YOUR FREQUENCY"}</small></div>
  {showMoment&&<div key={lights.showMoment?.at} className={"show-impact show-impact-"+momentKind}><div className="show-impact-ring"/><div className="show-impact-ring second"/><span>{momentKind==="drop"?"DROP":momentKind==="flip"?"COLOR SHIFT":momentKind==="storm"?"ION STORM":"AFTERGLOW"}</span></div>}
  {moodBurst&&!reduceMotion&&<div key={moodBurst.nonce} className={"fm-mood-shock fm-mood-shock-"+moodBurst.kind}>{Array.from({length:28},(_,i)=><i key={i} style={{"--n":i,"--x":(i*73%103)+"%","--t":(i*13%11)*.12+"s"}}/>)}<strong>{moodBurst.kind==="energy"?"IGNITION":moodBurst.kind==="love"?"VIBE WAVE":"COOL DOWN"}</strong></div>}
  <div className="show-vignette"/>
 </div>;
}


function PlasmaOrb({kind="energy",large=false,percent=null,children}){
 return <span className={"fm-plasma-orb fm-plasma-"+kind+(large?" fm-plasma-large":"")} aria-hidden="true">
  <i className="fm-plasma-corona"/><i className="fm-plasma-trail one"/><i className="fm-plasma-trail two"/><i className="fm-plasma-trail three"/><i className="fm-plasma-inner"/>
  {percent!==null?<strong className="fm-plasma-percent">{percent}%</strong>:<span className="fm-plasma-glyph">{children}</span>}
 </span>;
}
function RoomReactor({room,heatScore,moodScore,moodTotal,hottest,moodBurst}){
 const groups=[["energy","FIRE","IGNITION"],["love","VIBE","PULSE"],["chill","CHILL","DRIFT"]];
 return <div className={"show-live-side fm-club-reactor fm-club-reactor-"+hottest}>
  <div className="fm-club-reactor-head"><strong>ROOM REACTOR</strong><span title="This score is calculated from live votes and cools gradually">ⓘ</span><small>Collective energy from everyone in the room.</small></div>
  <div className="fm-club-reactor-center">
   <PlasmaOrb kind={hottest} large percent={heatScore}/>
   <strong>ROOM HEAT</strong><small>{heatScore>=78?"ELECTRIC TONIGHT":heatScore>=56?"THE CROWD IS RISING":heatScore>=38?"IN THE GROOVE":"AFTERHOURS"}</small>
  </div>
  <div className="fm-club-reactor-levels">
   {groups.map(([kind,label,sub])=><div key={kind}><PlasmaOrb kind={kind}/><strong>{moodScore(kind)}%</strong><span>{label}</span><small>{sub}</small></div>)}
  </div>
  <div className="fm-club-reactor-footer"><i className={room?"on":""}/>{room?moodTotal+" LIVE ROOM VOTES":"JOIN TO ACTIVATE"}</div>
  {moodBurst&&<span key={moodBurst.nonce} className={"fm-reactor-ripple fm-reactor-ripple-"+moodBurst.kind}/>}
 </div>;
}
function VibeConsole({room,heatScore,moodScore,moodTotal,moodBurst,castMood,voteBusy,reduceMotion=false}){
 const [showInfo,setShowInfo]=useState(false);
 const modes=[
  {id:"energy",name:"IGNITION CORE",button:"FIRE IT UP",description:"Add energy and intensity to the room.",type:"fire"},
  {id:"love",name:"VIBE PULSE",button:"KEEP THE VIBE",description:"Keep the current energy going strong.",type:"wave"},
  {id:"chill",name:"COOL DRIFT",button:"CHILL IT DOWN",description:"Bring the energy down and mellow it out.",type:"snow"}
 ];
 const glyph=kind=>kind==="energy"?<svg viewBox="0 0 64 64" fill="none"><path d="M34 7C38 20 26 22 28 33c-8-3-9-9-8-14C6 33 12 52 29 57c18 5 31-11 23-28-1 10-7 11-8 12 3-14-1-24-10-34Z" fill="currentColor"/></svg>:kind==="love"?<svg viewBox="0 0 64 64" fill="none"><path d="M4 32h11l6-15 8 30 8-33 8 24 5-6h10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>:<svg viewBox="0 0 64 64" fill="none"><path d="M32 5v54M5 32h54M13 13l38 38M51 13 13 51M25 12l7 8 7-8M25 52l7-8 7 8M12 25l8 7-8 7M52 25l-8 7 8 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
 return <div className={"fm-shape-vibe"+(moodBurst?" fm-shape-burst-"+moodBurst.kind:"")}>
  <div className="fm-shape-head"><div><strong>SHAPE THE VIBE</strong><p>Your reactions directly influence the room's energy.</p></div><button type="button" aria-expanded={showInfo} onClick={()=>setShowInfo(v=>!v)}>{showInfo?"CLOSE GUIDE −":"HOW IT WORKS ↗"}</button></div>
  {showInfo&&<div className="fm-shape-guide">Every vote changes the shared heat score. Fire increases room heat, Keep the Vibe sustains it, and Chill It Down cools it. Your choice triggers the same visual burst for connected listeners. One vote is allowed every three seconds; the heat gradually returns toward 50% between votes. Votes are temporary and never represent a permanent user profile.</div>}
  <div className="fm-shape-actions">{modes.map(m=><button type="button" key={m.id} className={"fm-shape-control fm-shape-control-"+m.id} disabled={!room||voteBusy} onClick={()=>castMood(m.id)} aria-label={m.button+"; "+m.description}>
   <PlasmaOrb kind={m.id}>{glyph(m.id)}</PlasmaOrb>
   <strong>{m.name}</strong><small>{m.description}</small><span className="fm-shape-pill">{room?m.button:"JOIN A ROOM"}</span><span className="fm-shape-votes">{moodScore(m.id)}% OF VOTES</span>
  </button>)}</div>
  <div className="fm-shape-bottom"><span><i className={room?"on":""}/> {room?"LIVE · YOUR VOTE REACHES THE ROOM":"TUNE IN TO ACTIVATE"}</span><span>{moodTotal} TOTAL VOTES</span></div>
  {moodBurst&&!reduceMotion&&<div key={moodBurst.nonce} className={"fm-shape-flash fm-shape-flash-"+moodBurst.kind}><i/><i/><i/></div>}
 </div>;
}

export default function UndergroundFM({locale="en"}){
 const [tracks,setTracks]=useState([]),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const [preview,setPreview]=useState(null),[connected,setConnected]=useState(false),[room,setRoom]=useState(null),[isDj,setIsDj]=useState(false),[messages,setMessages]=useState([]),[draft,setDraft]=useState(""),[playing,setPlaying]=useState(false),[clock,setClock]=useState(Date.now());
 const [reactions,setReactions]=useState([]),[reduced,setReduced]=useState(false),[openChat,setOpenChat]=useState(false),[showDiscover,setShowDiscover]=useState(true);
 const [visualMode,setVisualMode]=useState("rhythm"),[selectedTrack,setSelectedTrack]=useState(null),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(true),[loadingMore,setLoadingMore]=useState(false),[requestText,setRequestText]=useState(""),[tab,setTab]=useState("discover"),[discoverTab,setDiscoverTab]=useState("For You"),[moodBurst,setMoodBurst]=useState(null),[momentBurst,setMomentBurst]=useState(null),[voteBusy,setVoteBusy]=useState(false),[requestMatches,setRequestMatches]=useState([]),[requestSearching,setRequestSearching]=useState(false),[requestSent,setRequestSent]=useState(null);
 const socket=useRef(null),audio=useRef(null),streamTrackId=useRef(null),joining=useRef(false),wantsRoom=useRef(false),lastVoteAt=useRef(0);
 const fx=room?.lights||defaults;
 const theme=THEMES.find(t=>t.id===fx.theme)||THEMES[0];
 const current=room?room.track:preview;
 const roomElapsed=room?.startedAt?Math.max(0,(clock-room.startedAt)/1000):0;
 const duration=Number(current?.duration)||0;
 const time=room?.track?roomElapsed:audio.current?.currentTime||0;
 const turnLeft=room?.djSince?Math.max(0,Math.ceil(((room.djTurnMs||240000)-(clock-room.djSince))/1000)):null;
 const showMoment=Boolean(room?.lights?.showMoment&&clock-room.lights.showMoment.at<4800);
 const moodTotal=room?MOODS.reduce((n,[id])=>n+Number(room.mood?.[id]||0),0):0;
 const moodScore=id=>moodTotal?Math.round(Number(room?.mood?.[id]||0)/moodTotal*100):0;
 const heatScore=room?clamp(Math.round(50+(Number(room.heat??50)-50)*Math.exp(-Math.max(0,clock-(room.heatUpdatedAt||clock))/18000)),0,100):0;
 const hottest=heatScore>=72?"energy":heatScore<=34?"chill":"love";
 const momentKind=showMoment?room.lights.showMoment.kind:null;
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
  fetch("/api/underground/tracks?page=0"+(term?"&q="+encodeURIComponent(term):""),{signal:controller.signal})
   .then(r=>r.json()).then(j=>{setTracks(shuffle(j.tracks||[]));setPage(0);setHasMore(Boolean(j.hasMore));if(j.error)setNotice(j.error);})
   .catch(e=>{if(e.name!=="AbortError")setNotice("Music discovery unavailable right now.");})
   .finally(()=>setLoading(false));
  return ()=>controller.abort();
 },[term,isDj,room?.room]);
 useEffect(()=>{
  if(!SERVER_URL || /^http:\/\/localhost/i.test(SERVER_URL)&&location.hostname!=="localhost"){
    setNotice("Live rooms are offline until the ChatSpark real-time server is deployed.");return;
  }
  const s=io(SERVER_URL,{path:SOCKET_PATH,transports:["websocket","polling"],autoConnect:true,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelayMax:6000,timeout:9000});
  socket.current=s;
  s.on("connect",()=>{setConnected(true);setNotice("");if(wantsRoom.current)s.emit("fm:join",ack=>{if(!ack?.ok)setNotice("Room unavailable after reconnection. Tap Tune In again.");});});
  s.on("disconnect",()=>{setConnected(false);setRoom(null);setIsDj(false);setPlaying(false);});
  s.on("connect_error",()=>setNotice("Live rooms are offline. Solo Audius discovery is still available."));
  s.on("fm:state",data=>{setRoom(data);setIsDj(data.dj===s.id);});
  s.on("fm:chat",entry=>setMessages(v=>[...v.slice(-79),entry]));
  s.on("fm:reaction",entry=>{setReactions(v=>[...v.slice(-11),{...entry,id:Math.random()}]);});
  s.on("fm:mood:burst",entry=>setMoodBurst({...entry,nonce:Math.random()}));
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
 useEffect(()=>{
  if(!room||isDj||requestText.trim().length<2){setRequestMatches([]);setRequestSearching(false);return;}
  const signal=new AbortController();
  const timer=setTimeout(async()=>{
    setRequestSearching(true);
    try{
      const res=await fetch("/api/underground/tracks?q="+encodeURIComponent(requestText.trim())+"&page=0",{signal:signal.signal});
      if(!res.ok)throw new Error("Music search is unavailable");
      const result=await res.json();
      if(!signal.signal.aborted)setRequestMatches((result.tracks||[]).slice(0,6));
    }catch(err){if(err.name!=="AbortError")setNotice("Couldn't search Audius. Try again.");}
    finally{if(!signal.signal.aborted)setRequestSearching(false);}
  },400);
  return ()=>{clearTimeout(timer);signal.abort();};
 },[requestText,room?.room,isDj]);
 const join=()=>{
  if(!connected||joining.current)return;
  joining.current=true;wantsRoom.current=true;setMessages([]);setReactions([]);
  socket.current?.emit("fm:join",ack=>{joining.current=false;if(!ack?.ok){wantsRoom.current=false;setNotice("All rooms are full. Try again shortly.");}});
  setTimeout(()=>{joining.current=false;},8000);
 };
 const leave=()=>{
  wantsRoom.current=false;
  socket.current?.emit("fm:leave");
  audio.current?.pause();setRoom(null);setIsDj(false);setPlaying(false);setMessages([]);setNotice("");
 };
 const command=(event,payload,label)=>{
  if(!socket.current||!room)return;
  const acknowledge=ack=>{if(!ack?.ok)setNotice(ack?.error==="dj_only"?"The controller role changed.":ack?.error==="cooldown"?"This action needs a short cooldown.":"Couldn't "+label+".");};
  if(payload===undefined)socket.current.emit(event,acknowledge);
  else socket.current.emit(event,payload,acknowledge);
 };
 const selectTrack=(track)=>{
  if(!room){setPreview(track);setSelectedTrack(track);setNotice("Selected for solo preview. Press play to listen.");return;}
  if(!isDj)return;
  setSelectedTrack(track);
 };
 const loadMore=async()=>{
  if(loadingMore||!hasMore)return;
  setLoadingMore(true);
  try{
   const res=await fetch("/api/underground/tracks?page="+(page+1)+(term?"&q="+encodeURIComponent(term):""),{cache:"no-store"});
   if(!res.ok)throw new Error("Could not load more tracks.");
   const payload=await res.json();
   setTracks(old=>{const ids=new Set(old.map(t=>t.id));return [...old,...shuffle(payload.tracks||[]).filter(t=>!ids.has(t.id))];});
   setPage(page+1);setHasMore(Boolean(payload.hasMore));
  }catch(e){setNotice(e.message);}finally{setLoadingMore(false);}
 };
 const discoverTabs=["For You","Underground Picks","New This Week","Global Sounds","Chill","High Energy"];
 const chooseDiscoverTab=selected=>{
  setDiscoverTab(selected);setQuery("");
  setTerm(({"For You":"","Underground Picks":"underground","New This Week":"new music","Global Sounds":"world","Chill":"ambient","High Energy":"electronic"})[selected]||"");
 };
 const playSelected=()=>{
  if(!isDj||!selectedTrack||!room)return;
  const chosen=selectedTrack;
  socket.current?.emit("fm:play",chosen,ack=>{
   if(!ack?.ok){setNotice("Could not play this song for the room.");return;}
   setTracks(old=>[...old.filter(t=>t.id!==chosen.id),chosen]);
   setSelectedTrack(null);
   setNotice("Now on air: "+chosen.title+". Tap audio play to listen on this device.");
  });
 };
 const nextTrack=()=>{
  if(!isDj||!room)return;
  if(room.queue?.length){command("fm:next",undefined,"play next");return;}
  const next=tracks.find(t=>t.id!==room.track?.id);
  if(!next){setNotice("Discover more tracks to continue the set.");return;}
  socket.current?.emit("fm:play",next,ack=>{
   if(!ack?.ok){setNotice("Unable to advance to the next song.");return;}
   setTracks(old=>[...old.filter(t=>t.id!==next.id),next]);
   setSelectedTrack(null);
  });
 };
 const togglePlay=async()=>{
  if(!current||!audio.current)return;
  try{
   if(audio.current.paused){await audio.current.play();setPlaying(true);}
   else{audio.current.pause();setPlaying(false);}
  }catch{setNotice("The stream could not play. Try another track or tap play again.");}
 };
 const submitChat=()=>{
  const text=draft.trim();if(!text||!room)return;
  socket.current?.emit("fm:chat",text,ack=>{
   if(ack?.ok)setDraft("");
   else setNotice(ack?.error==="cooldown"?"You're sending messages too quickly.":"Message couldn't be delivered.");
  });
 };
 const react=kind=>{
  if(!room)return;
  command("fm:reaction",kind,"send reaction");
 };
 const styleChange=payload=>{if(!isDj)return;command("fm:lights",payload,"update room lighting");};
 const fxTrigger=kind=>{
  if(!isDj||!room)return;
  socket.current?.emit("fm:moment",kind,ack=>{
   if(!ack?.ok){setNotice(ack?.error==="cooldown"?"Let the previous show moment settle first.":"Show effect unavailable.");return;}
   setMomentBurst({kind,nonce:Math.random(),at:Date.now()});
  });
 };
 const castMood=kind=>{
  if(!room||voteBusy||Date.now()-lastVoteAt.current<3000)return;
  lastVoteAt.current=Date.now();setVoteBusy(true);
  socket.current?.emit("fm:mood",kind,ack=>{
   if(!ack?.ok){lastVoteAt.current=0;setNotice(ack?.error==="cooldown"?"One vote every 3 seconds.":"Couldn't register your vote.");setVoteBusy(false);}
  });
  setTimeout(()=>setVoteBusy(false),3050);
 };
 const addSelected=()=>{if(room&&isDj&&selectedTrack)command("fm:queue:add",selectedTrack,"queue song");};
 const removeQueue=i=>{if(room&&isDj)command("fm:queue:remove",i,"remove queued song");};
 const moveQueue=(from,to)=>{if(room&&isDj)command("fm:queue:move",{from,to},"reorder queue");};
 const requestTrack=track=>{
  if(!room||!track)return;
  socket.current?.emit("fm:request",track,ack=>{
   if(ack?.ok){setRequestSent(track.title);setRequestText("");setRequestMatches([]);setNotice("Track requested: "+track.title+" — added to the controller's queue.");}
   else setNotice(ack?.error==="duplicate"?"Already in the room queue.":ack?.error==="invalid_request"?"Queue is full or the track is unavailable.":"Couldn't send the request.");
  });
 };
 const sendRequest=()=>{
  if(!room||!requestText.trim())return;
  if(!requestMatches.length){setNotice("Choose a matching Audius track from the suggestions.");return;}
  requestTrack(requestMatches[0]);
 };
 const chooseDiscovery=type=>{
  setRequestSent(null);
  setRequestText(({"Underground Picks":"underground","This Week":"new music","Global Sounds":"world music","Deep & Dreamy":"ambient chill"})[type]||type);
 };

 return <div className={"fm-shell fm-show-shell "+(room?(isDj?"fm-controller-view":"fm-listener-view"):"fm-discover-view")} style={vars}>
  <nav className="show-desktop-nav" aria-label="Underground navigation">
    <div className="show-nav-brand">ChatSpark <span>⚡</span><small>UNDERGROUND FM</small></div>
    <Link href={"/"+locale}>⌂ <span>Home</span></Link>
    <Link href={"/"+locale+"/start"}>☏ <span>Random Chat</span></Link>
    <Link href={"/"+locale+"/underground"} className="current">◉ <span>Underground FM</span></Link>
    <Link href={"/"+locale+"/poem-wall"}>✎ <span>Poem Wall</span></Link>
    <Link href={"/"+locale+"/graffiti-wall"}>✳ <span>Graffiti Wall</span></Link>
    <div className="show-nav-manifest">MUSIC<br/>PEOPLE<br/>STRANGERS<br/><strong>ALWAYS<br/>A GOOD MIX.</strong></div>
   </nav>
  <div className="show-display">
  <div className="fm-top fm-show-top"><span><strong>ChatSpark ⚡</strong> <span className="fm-brand-divider">/</span> UNDERGROUND <em>FM</em></span><span className="fm-top-right"><span className="fm-blink"/> RANDOM PEOPLE. REAL MUSIC.</span></div>
  <div className="show-room-top">
   <div className="show-room-visual"><LightStage lights={fx} track={current} roomCode={room?.room} reduceMotion={reduced||visualMode==="off"} showMoment={showMoment} momentKind={momentKind} moodBurst={moodBurst}/></div><div className="show-hero-slogan" aria-hidden="true">MUSIC<br/>BRINGS<br/>BETTER<br/>STRANGERS</div>
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
  <div className="fm-dashboard">
  <div className="show-now-section"><div className="show-now-main">
   <div className="show-section-label"><span>● NOW PLAYING</span><span>{room?"SHARED RADIO / "+room.room:preview?"SOLO PREVIEW / AUDIUS":"WAITING FOR A SIGNAL"}</span></div>
   <div className="show-now-content">
    <div className="show-album">{current?.artwork?<img className="show-cover-photo" src={current.artwork} alt={current.title+" cover art"} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>:<div className="show-record"><div className="show-record-hole"/></div>}<span>CS / RADIO<br/>AFTERHOURS</span></div>
    <div className="show-song"><h2>{current?.title||"Unknown Frequencies"}</h2><p>{current?.artist||"A stranger will choose the next soundtrack."}</p><div className="show-genre-chips"><span>{current?.genre||"UNDERGROUND"}</span><span>{room?"LIVE BROADCAST":"DISCOVER"}</span><span>{theme.name}</span></div>
     <div className={"show-wave "+(playing?"show-wave-playing":"")}>{Array.from({length:47},(_,i)=><i key={i} style={{"--h":((i*13+Math.round(Math.sin(i*.9)*23+50))%83+15)+"%","--delay":((i*11)%19)/15+"s"}}/>)}</div>
     <div className="show-progress"><div className="show-progress-track"><span style={{width:current&&duration?clamp(time/duration*100,0,100)+"%":room?.track?clamp((time%180)/180*100,0,100)+"%":"0%"}}/></div><small>{clockFmt(time)} {duration?"/ "+clockFmt(duration):"/ LIVE"}</small></div>
     <div className="show-player-controls"><button onClick={togglePlay} disabled={!current} className="show-audio-play" aria-label={playing?"Pause audio":"Play audio"}>{playing?"Ⅱ":"▶"}</button><span>Tap to {playing?"pause":"listen"} on this device</span><button className="show-accessible" onClick={()=>{setVisualMode(v=>v==="off"?"rhythm":"off");setReduced(v=>!v)}} aria-pressed={reduced||visualMode==="off"}>{reduced||visualMode==="off"?"ENABLE FX":"REDUCE MOTION"}</button></div>
    </div>
   </div>
   <audio ref={audio} preload="none" onEnded={()=>{setPlaying(false);if(isDj&&room)command("fm:next",undefined,"skip");}} onError={()=>setNotice("Track unavailable for external Audius streaming.")}/>
  </div>
  <RoomReactor room={room} heatScore={heatScore} moodScore={moodScore} moodTotal={moodTotal} hottest={hottest} moodBurst={moodBurst}/>
</div>
  <div className="show-content-grid">
   <div className="show-main-column">
    {room&&!isDj&&<section className="show-room-aura fm-vibe-section fm-listener-vibes"><VibeConsole room={room} heatScore={heatScore} moodScore={moodScore} moodTotal={moodTotal} moodBurst={moodBurst} castMood={castMood} voteBusy={voteBusy} reduceMotion={reduced||visualMode==="off"}/></section>}
    {room&&isDj?<section className="show-controller-board">
     <div className="show-mode-title"><span>♛ CONTROLLER MODE</span><small>YOU SHAPE THE SOUND + LIGHTS</small></div>
     <div className="show-dj-actions"><button onClick={nextTrack} disabled={!room.queue?.length&&!tracks.some(t=>t.id!==room.track?.id)}>⏭ NEXT TRACK</button><button onClick={()=>command("fm:pass",undefined,"pass controller")} disabled={room.listeners<2}>⟳ PASS CONTROLLER</button></div>
     <div className="show-light-studio"><div className="show-studio-head"><div><strong>✳ COLOR / LIGHT STUDIO</strong><small>THE LISTENERS EXPERIENCE EVERY CHANGE</small></div><button onClick={()=>styleChange({theme:"acid",fx:"march",intensity:2,beatBpm:116})}>RESET ↺</button></div>
      <div className="show-theme-grid">{THEMES.map(t=><button key={t.id} onClick={()=>styleChange({theme:t.id})} aria-pressed={fx.theme===t.id} className="show-theme-button" style={{"--theme-a":t.a,"--theme-b":t.b,"--theme-dark":t.dark}}><span className="show-theme-illustration"><i/><i/><i/></span><strong>{t.name}</strong></button>)}</div>
      <div className="fm-future-show"><div className="fm-future-intro"><strong>PHOTON ENGINE / VISUAL PRESETS</strong><small>THE CONTROLLER BROADCASTS EACH SCENE LIVE TO EVERY LISTENER</small></div><div className="fm-future-presets">{FX.map(([id,label],i)=><button className={"fm-future-preset fm-preset-"+id} key={id} aria-pressed={fx.fx===id} onClick={()=>styleChange({fx:id})}><span className="fm-future-preview"><i/><i/><i/><i/></span><strong>{["LASER MATRIX","QUANTUM PULSE","LIGHT TIDES","NEON COLLIDER","INFINITE TUNNEL","AURORA CORE","ZERO-G DRIFT"][i]}</strong><small>{fx.fx===id?"● LIVE SCENE":"TAP TO ACTIVATE"}</small></button>)}</div><div className="fm-future-intensity"><strong>SCENE POWER</strong>{[[0,"DARK"],[1,"AMBIENT"],[2,"IMMERSIVE"],[3,"MAXIMUM"]].map(([v,label])=><button onClick={()=>styleChange({intensity:v})} aria-pressed={fx.intensity===v} key={v}>{label}</button>)}</div></div>
      <div className="show-moment-head">QUANTUM EVENTS <small>5 SECOND COOLDOWN / SHARED ROOM EVENT</small></div><div className="show-moment-actions">{[["drop","✺ SUPERNOVA"],["flip","⌁ SPECTRAL SHIFT"],["storm","ϟ ION STORM"],["fade","◌ BLACKOUT / REVEAL"]].map(([kind,label])=><button onClick={()=>fxTrigger(kind)} key={kind}>{label}</button>)}</div>
     </div>
     <div className="show-discover-card"><div className="show-section-head"><div><span>DISCOVER / CONTROLLER LIBRARY</span><small>ONLY THE CONTROLLER SEES SONG SELECTION</small></div><button onClick={()=>setShowDiscover(v=>!v)}>{showDiscover?"COLLAPSE −":"EXPAND +"}</button></div>
     {showDiscover&&<><div className="fm-selected-play">{selectedTrack?<><button type="button" className="fm-play-cover" onClick={playSelected} aria-label={"Play "+selectedTrack.title+" for the whole room"}>{selectedTrack.artwork?<img src={selectedTrack.artwork} alt={selectedTrack.title+" artwork"} referrerPolicy="no-referrer"/>:<span>♫</span>}<i>▶</i></button><div><span className="fm-selected-label">READY TO BROADCAST</span><strong>{selectedTrack.title}</strong><small>{selectedTrack.artist}</small><p>Tap the album cover to play for the whole room.</p><button disabled={room.queue?.length>=17} onClick={addSelected}>+ ADD TO QUEUE</button></div></>:<div className="fm-select-placeholder"><strong>SELECT A FREQUENCY</strong><p>Choose a song below. Its album artwork appears here—tap the artwork to play it for everyone.</p></div>}</div><div className="show-discover-feature"><div className="show-feature-head"><span>✳ DISCOVER</span><small>UNDERGROUND PICKS / FRESH FREQUENCIES</small></div><div className="show-discover-tabs" role="group" aria-label="Explore music by mood">{discoverTabs.map(item=><button key={item} onClick={()=>chooseDiscoverTab(item)} aria-pressed={item===discoverTab}>{item}</button>)}</div><div className="show-discovery-carousel">{tracks.slice(0,6).map((track,i)=><button key={track.id} type="button" className={"show-discovery-album "+(selectedTrack?.id===track.id?"chosen":"")} onClick={()=>selectTrack(track)}><span className="show-discovery-image">{track.artwork?<img src={track.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>:<span>♫</span>}<i>+</i></span><strong>{track.title}</strong><small>{track.artist}</small></button>)}</div></div><form className="show-music-search" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH ARTISTS, TRACKS, MOODS…" aria-label="Search music"/><button>DISCOVER ↗</button></form><div className="show-tracks">{loading?<p>FINDING UNDERGROUND SOUNDS…</p>:tracks.map((track,i)=><button type="button" key={track.id} className={"show-track "+(selectedTrack?.id===track.id?"chosen":"")} onClick={()=>selectTrack(track)}><span className="show-track-icon">{track.artwork?<img src={track.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>:"♫"}</span><span className="show-track-info"><strong>{track.title}</strong><small>{track.artist}{track.genre?" · "+track.genre:""}</small></span><span className="show-track-choose">{selectedTrack?.id===track.id?"SELECTED ✓":"SELECT +"}</span></button>)}</div>{hasMore&&<button className="show-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore?"FINDING MORE MUSIC…":"LOAD MORE AUDIUS TRACKS + "}</button>}</>}
     </div>
     <div className="show-queue"><span>LIVE QUEUE / {room.queue?.length||0} OF 17 SONGS</span><div className="show-queue-current">{room.track?.artwork?<img src={room.track.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>:<span className="show-queue-current-fallback">♫</span>}<span><strong>{room.track?.title||"Nothing on air"}</strong><small>{room.track?.artist||"Select a song to start the set"}</small></span><b>{room.track?"NOW PLAYING":"OFF AIR"}</b></div>{room.queue?.length?room.queue.map((entry,i)=><div key={i} className="show-queue-item"><span className="show-queue-number">{i+1}</span><span className="show-queue-art">{entry.track.artwork?<img src={entry.track.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>:"♫"}</span><span><strong>{entry.track.title}</strong><small>{entry.track.artist}</small></span><span className="show-queue-duration">{clockFmt(entry.track.duration)}</span><span className="show-queue-edit"><button disabled={i===0} onClick={()=>moveQueue(i,i-1)} aria-label={"Move "+entry.track.title+" up"}>↑</button><button disabled={i===room.queue.length-1} onClick={()=>moveQueue(i,i+1)} aria-label={"Move "+entry.track.title+" down"}>↓</button><button onClick={()=>removeQueue(i)} aria-label={"Remove "+entry.track.title+" from queue"}>×</button></span></div>):<p>Room requests appear here when listeners suggest songs.</p>}</div>
    </section>:room?<section className="show-listener-board fm-listener-tiles">
     <div className="fm-listener-card fm-listener-mode"><span className="fm-card-icon">◉</span><strong>LISTENER MODE</strong><p>You're tuned in. React, talk, request tracks and shape the room's atmosphere with everyone else.</p></div>
     <div className="fm-listener-card fm-listener-reactions"><strong>LIVE REACTIONS</strong><p>Instant signals from the crowd.</p><div className="fm-live-reaction-cloud" aria-hidden="true"><span>♡</span><span>✦</span><span>🔥</span><span>✺</span><span>♡</span></div><div className="fm-listener-reaction-buttons">{REACTIONS.map(([kind,emoji])=><button key={kind} type="button" title={"React "+kind} onClick={()=>react(kind)}><span>{emoji}</span><small>{room.reactionCounts?.[kind]||0}</small></button>)}</div></div>
     <div className="fm-listener-card fm-listener-request"><strong>REQUEST A TRACK</strong><p>Find a song the controller could play next.</p><form onSubmit={e=>{e.preventDefault();sendRequest();}}><label className="fm-sr-only" htmlFor="fm-request">Song or artist</label><input id="fm-request" value={requestText} onChange={e=>{setRequestText(e.target.value);setRequestSent(null);}} placeholder="Search Audius tracks…" maxLength={80}/><button type="submit" disabled={!requestMatches.length||requestSearching}>REQUEST TRACK ↗</button></form>{requestSearching&&<small>SEARCHING MUSIC…</small>}{requestSent&&<small className="fm-request-confirm">✓ SENT: {requestSent}</small>}{requestMatches.length>0&&<div className="fm-request-results">{requestMatches.map(track=><button key={track.id} type="button" onClick={()=>requestTrack(track)}>{track.artwork?<img src={track.artwork} alt="" loading="lazy"/>:<span>♫</span>}<span><b>{track.title}</b><small>{track.artist}</small></span><i>+</i></button>)}</div>}</div>
     <div className="fm-listener-card fm-listener-discover"><strong>DISCOVER MODE</strong><p>Find sounds to suggest for the next set.</p><div className="fm-discover-tiles">{["Underground Picks","This Week","Global Sounds","Deep & Dreamy"].map((item,i)=><button key={item} type="button" onClick={()=>chooseDiscovery(item)}><span className={"fm-discover-tile-scene fm-dscene-"+i}/><small>{item}</small></button>)}</div></div>
    </section>:<section className="show-solo-discovery">
      <div className="show-mode-title"><span>✳ UNDERGROUND DISCOVER</span><small>LISTEN TO ARTISTS WHILE ROOMS ARE OFFLINE</small></div>
      <h3>NEW SOUNDS, EVEN WITHOUT A CROWD.</h3><p>The live show needs the ChatSpark Socket.IO server. You can still explore Audius music here and preview tracks individually.</p>
      <form className="show-music-search" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH AUDIUS MUSIC…" aria-label="Search Audius tracks"/><button>SEARCH ↗</button></form>
      <div className="show-tracks">{loading?<p>FINDING UNDERGROUND SOUNDS…</p>:tracks.map(t=><button key={t.id} className={"show-track "+(selectedTrack?.id===t.id?"chosen":"")} onClick={()=>selectTrack(t)}><span className="show-track-icon">{t.artwork?<img src={t.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>:"♫"}</span><span className="show-track-info"><strong>{t.title}</strong><small>{t.artist}</small></span><span className="show-track-choose">PREVIEW ▶</span></button>)}</div>{hasMore&&<button className="show-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore?"FINDING MORE MUSIC…":"LOAD MORE TRACKS +"}</button>}
     </section>}
    {(!room||isDj)&&<section className="show-room-aura fm-vibe-section"><VibeConsole room={room} heatScore={heatScore} moodScore={moodScore} moodTotal={moodTotal} moodBurst={moodBurst} castMood={castMood} voteBusy={voteBusy} reduceMotion={reduced||visualMode==="off"}/></section>}
   </div>
   <aside className={"show-chat-column "+(openChat?"chat-expanded":"")}><div className="show-section-head"><div><span>ROOM CHAT</span><small>CONTROLLER + LISTENERS · ALL WELCOME</small></div><span>{room?.listeners||0} HERE</span></div>
    <div className="show-message-list" role="log" aria-live="polite" aria-label="Room conversation">{messages.length?messages.map((msg,i)=><div className="show-message" key={msg.at+"-"+i}><span className={"show-chat-avatar "+(msg.from==="DJ"?"show-chat-dj":"")}>{msg.from==="DJ"?"♛":"✳"}</span><div><small>{msg.from==="DJ"?"CONTROLLER":"STRANGER"} · {new Date(msg.at).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</small><p>{msg.text}</p></div></div>):<div className="show-empty-chat"><strong>NO VOICES YET.</strong><p>{room?"Be the first to say hello. Everyone in this room can chat.":"When the rooms come online, strangers and the controller can talk together here."}</p></div>}</div>
    <div className="show-reaction-float" aria-hidden="true">{reactions.filter(r=>clock-r.at<2200).map(r=><span key={r.id}>{REACTIONS.find(x=>x[0]===r.kind)?.[1]||"✨"}</span>)}</div>
    <form onSubmit={e=>{e.preventDefault();submitChat();}} className="show-chat-compose"><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={280} disabled={!room} aria-label="Message the room" placeholder={room?"MESSAGE THE ROOM…":"JOIN A ROOM TO CHAT"}/><button disabled={!room||!draft.trim()} type="submit" aria-label="Send message">➤</button></form>
    <div className="show-chat-foot">Temporary room chat. No recordings or user profiles. Be respectful.</div>
    {room&&<button className="show-mobile-chat-close" onClick={()=>setOpenChat(false)}>↓ RETURN TO THE SHOW</button>}
   </aside>
  </div>
  </div>
  <div className="show-mobile-dock"><button onClick={()=>setOpenChat(false)}>◉ <span>THE SHOW</span></button><button onClick={()=>{if(room)setOpenChat(true);else join();}}>{room?"☰":"♧"} <span>{room?"ROOM CHAT":"JOIN ROOM"}</span></button><button onClick={()=>{setVisualMode(v=>v==="off"?"rhythm":"off");setReduced(v=>!v)}}>{reduced||visualMode==="off"?"◌":"✳"} <span>VISUAL FX</span></button></div>
  {notice&&<div className="fm-toast show-notice" role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Dismiss notice">×</button></div>}
  <div className="fm-bottom"><span>CHATSPARK / RANDOM PEOPLE, REAL MUSIC</span><Link href={"/"+locale+"/start"}>BACK TO STRANGER CHAT ↗</Link></div>
 </div>
 </div>;
}
