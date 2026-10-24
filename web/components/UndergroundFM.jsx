"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Oswald} from "next/font/google";
import {io} from "socket.io-client";
import {SERVER_URL,SOCKET_PATH} from "@/lib/site";
import {createOrb,createOverlay,createStage,qualityFor} from "./underground-fx";
import "./underground-stage.css";

const oswald=Oswald({subsets:["latin"],weight:["500","600","700"],variable:"--fx-oswald",display:"swap"});
// Backlit crowd silhouette (heads, shoulders, raised hands), generated once and shared by every panel.
const CROWD=(()=>{
 let seed=11;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const W=1400,H=200;let out="";
 for(const [base,scale,fill,step] of [[H-20,.78,"#0b0712",34],[H+6,1,"#020104",42]]){
  for(let x=-20;x<W+40;x+=step*(.7+r()*.6)){
   const s=scale*(.85+r()*.3),hy=base-62*s;
   out+=`<ellipse cx="${x|0}" cy="${(base-14*s)|0}" rx="${(22*s)|0}" ry="${(34*s)|0}" fill="${fill}"/><circle cx="${x|0}" cy="${hy|0}" r="${(12*s)|0}" fill="${fill}"/>`;
   const arms=r();
   if(arms<.55){const side=arms<.25?[-1,1]:[r()<.5?-1:1];for(const d of side){const tx=x+d*(14+r()*16)*s,ty=hy-(38+r()*34)*s;out+=`<path d="M${x+d*12*s|0} ${hy+20*s|0}L${tx|0} ${ty|0}" stroke="${fill}" stroke-width="${(7*s).toFixed(1)}" stroke-linecap="round"/><circle cx="${tx|0}" cy="${ty|0}" r="${(5*s).toFixed(1)}" fill="${fill}"/>`;}}
  }
 }
 return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${out}</svg>`)}")`;
})();

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
const FX=[["march","Marching lasers"],["pulse","Pulse"],["sweep","Wave sweep"],["crossfire","Crossfire"],["tunnel","Tunnel"],["bloom","Soft bloom"],["drift","Drift"]];
const MOODS=["energy","love","chill"];
const MOOD_SCENES=[
 {id:"energy",title:"FIRE",core:"Ignition Core",blurb:"Add energy and intensity to the room.",cta:"Fire It Up",short:"Push the room further"},
 {id:"love",title:"VIBE",core:"Vibe Pulse",blurb:"Keep the current energy going strong.",cta:"Keep the Vibe",short:"Keep this energy alive"},
 {id:"chill",title:"CHILL",core:"Cool Drift",blurb:"Bring the energy down and mellow it out.",cta:"Chill It Down",short:"Ease into the afterhours"}
];
const REACTIONS=[["heart","❤️"],["fire","🔥"],["spark","✨"],["wave","🌊"]];
const ROOMS={
 STATIC:["Static Lounge","Signals from nowhere, tuned in."],
 MIDNIGHT:["The Midnight Lobby","Late night music for random souls."],
 BASEMENT:["The Basement","Low ceilings. Loud ideas."],
 ECHO:["Echo Chamber","Say it once. Hear it everywhere."],
 FREQUENCY:["Frequency Hall","One signal. Everyone tuned in."],
 AFTERHOURS:["Afterhours Club","The night doesn't end here."]
};
const SCENES=[
 {id:"supernova",name:"Supernova",subtitle:"High Energy",theme:"infrared",fx:"crossfire",intensity:3,moment:"drop"},
 {id:"spectral",name:"Spectral Shift",subtitle:"Euphoric",theme:"ultraviolet",fx:"sweep",intensity:2,moment:"flip"},
 {id:"ion",name:"Ion Storm",subtitle:"Raw Energy",theme:"ocean",fx:"march",intensity:3,moment:"storm"},
 {id:"blackout",name:"Blackout / Reveal",subtitle:"Dramatic",theme:"midnight",fx:"tunnel",intensity:1,moment:"fade"},
 {id:"dreamscape",name:"Dreamscape",subtitle:"Deep & Hypnotic",theme:"rose",fx:"drift",intensity:2,moment:"fade"}
];
const MOMENTS=[["drop","Drop"],["flip","Color shift"],["storm","Ion storm"],["fade","Blackout"]];
const DISCOVER_TABS=["For You","Underground Picks","New This Week","Global Sounds","Chill","High Energy"];
const DISCOVER_TERMS={"For You":"","Underground Picks":"underground","New This Week":"new music","Global Sounds":"world","Chill":"ambient","High Energy":"electronic"};
const GENRES=["Electronic","Indie","Alt","House","Techno","Beats"];
const WAVE=Array.from({length:60},(_,i)=>({h:18+((i*37+Math.round(Math.sin(i*.8)*30+30))%78),d:((i*11)%19)/19}));
const defaults={theme:"acid",fx:"march",intensity:2,beatBpm:116,showMoment:null};
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
const clockFmt=seconds=>!Number.isFinite(seconds)?"0:00":Math.floor(Math.max(0,seconds)/60)+":"+String(Math.floor(Math.max(0,seconds)%60)).padStart(2,"0");
const fmtListeners=n=>Number(n||0).toLocaleString("en-US");
const hideBroken=e=>{e.currentTarget.style.display="none";};

function Icon({name}){
 const p={fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"};
 const paths={
  home:<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" {...p}/>,
  chat:<path d="M4 5h16v11H9l-5 4z" {...p}/>,
  wave:<path d="M3 12h3l2-6 4 12 3-9 2 3h4" {...p}/>,
  poem:<path d="M5 20l1-4L16 6l3 3L9 19zM14 8l3 3" {...p}/>,
  wall:<path d="M12 4v6M12 14v6M4 12h6M14 12h6M6.5 6.5l4 4M13.5 13.5l4 4M17.5 6.5l-4 4M10.5 13.5l-4 4" {...p}/>,
  crown:<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" {...p}/>,
  play:<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>,
  pause:<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" stroke="none"/>,
  next:<path d="M6 5v14l9-7zM17 5v14" {...p}/>,
  pass:<path d="M5 12a7 7 0 0112-5l2 2M19 12a7 7 0 01-12 5l-2-2M19 4v5h-5M5 20v-5h5" {...p}/>,
  plus:<path d="M12 5v14M5 12h14" {...p}/>,
  heart:<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.6A4.5 4.5 0 0120 9c0 6-8 11-8 11z" {...p}/>,
  fire:<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z" {...p}/>,
  snow:<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4l3 2 3-2M9 20l3-2 3 2" {...p}/>,
  headphones:<path d="M4 15v-3a8 8 0 0116 0v3M4 15h3v5H5a1 1 0 01-1-1zM20 15h-3v5h2a1 1 0 001-1z" {...p}/>,
  search:<path d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" {...p}/>,
  send:<path d="M4 12l16-8-6 16-3-7z" {...p}/>,
  globe:<path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" {...p}/>,
  left:<path d="M15 5l-7 7 7 7" {...p}/>,
  right:<path d="M9 5l7 7-7 7" {...p}/>,
  up:<path d="M6 15l6-6 6 6" {...p}/>,
  down:<path d="M6 9l6 6 6-6" {...p}/>,
  close:<path d="M6 6l12 12M18 6L6 18" {...p}/>,
  bulb:<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z" {...p}/>,
  note:<path d="M9 18V6l10-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM19 16a3 3 0 11-6 0 3 3 0 016 0z" {...p}/>,
  eq:<path d="M2 12h3M19 12h3M8 8v8M11 4v16M14 7v10M17 10v4M5 10v4" {...p}/>,
  volume:<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6" {...p}/>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

function Avatar({hue=200,label="?",crown=false,size=""}){
 return <span className={"fx-avatar "+size} style={{"--h":hue}} aria-hidden="true">{crown?<Icon name="crown"/>:String(label).charAt(0).toUpperCase()}</span>;
}

function Art({track,className=""}){
 return <span className={"fx-art "+className}>{track?.artwork?<img src={track.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={hideBroken}/>:<Icon name="note"/>}</span>;
}

function OrbCanvas({kind,motionOff,level=.8,pulseKey=0}){
 const ref=useRef(null),orb=useRef(null);
 useEffect(()=>{orb.current=createOrb(ref.current,kind,{reduced:motionOff,quality:qualityFor()});return ()=>{orb.current?.destroy();orb.current=null;};},[kind]);
 useEffect(()=>{orb.current?.setReduced(motionOff);},[motionOff]);
 useEffect(()=>{orb.current?.level(level);},[level]);
 useEffect(()=>{if(pulseKey)orb.current?.pulse(1);},[pulseKey]);
 return <canvas ref={ref} className="fx-orb-canvas" aria-hidden="true"/>;
}

export default function UndergroundFM({locale="en"}){
 const [tracks,setTracks]=useState([]),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const [preview,setPreview]=useState(null),[connected,setConnected]=useState(false),[room,setRoom]=useState(null),[isDj,setIsDj]=useState(false),[me,setMe]=useState(null),[messages,setMessages]=useState([]),[draft,setDraft]=useState(""),[playing,setPlaying]=useState(false),[clock,setClock]=useState(Date.now());
 const [volume,setVolume]=useState(80),[liked,setLiked]=useState(false),[reactions,setReactions]=useState([]),[reduced,setReduced]=useState(false),[motionPref,setMotionPref]=useState(null);
 const [selectedTrack,setSelectedTrack]=useState(null),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(true),[loadingMore,setLoadingMore]=useState(false),[requestText,setRequestText]=useState(""),[discoverTab,setDiscoverTab]=useState("For You"),[moodBurst,setMoodBurst]=useState(null),[pulses,setPulses]=useState({energy:0,love:0,chill:0}),[voteBusy,setVoteBusy]=useState(false),[heroGenre,setHeroGenre]=useState("Electronic"),[requestMatches,setRequestMatches]=useState([]),[requestSearching,setRequestSearching]=useState(false),[requestSent,setRequestSent]=useState(null),[tab,setTab]=useState("show"),[showGuide,setShowGuide]=useState(false),[showTune,setShowTune]=useState(false),[cooldownKey,setCooldownKey]=useState(0);
 const socket=useRef(null),audio=useRef(null),streamTrackId=useRef(null),joining=useRef(false),wantsRoom=useRef(false),lastVoteAt=useRef(0),stageCv=useRef(null),overlayCv=useRef(null),stage=useRef(null),overlay=useRef(null),rail=useRef(null),chatList=useRef(null);
 const motionOff=motionPref===null?reduced:motionPref;
 const fx=room?.lights||defaults;
 const theme=THEMES.find(t=>t.id===fx.theme)||THEMES[0];
 const current=room?room.track:preview;
 const roomElapsed=room?.startedAt?Math.max(0,(clock-room.startedAt)/1000):0;
 const duration=Number(current?.duration)||0;
 const time=room?.track?roomElapsed:audio.current?.currentTime||0;
 const turnLeft=room?.djSince?Math.max(0,Math.ceil(((room.djTurnMs||240000)-(clock-room.djSince))/1000)):null;
 const moodTotal=room?MOODS.reduce((n,id)=>n+Number(room.mood?.[id]||0),0):0;
 const moodScore=id=>moodTotal?Math.round(Number(room?.mood?.[id]||0)/moodTotal*100):0;
 const heatScore=room?clamp(Math.round(50+(Number(room.heat??50)-50)*Math.exp(-Math.max(0,clock-(room.heatUpdatedAt||clock))/18000)),0,100):0;
 const hottest=heatScore>=72?"energy":heatScore<=34?"chill":"love";
 const status=heatScore>=80?"Peak Hours":heatScore>=60?"Electric Tonight":heatScore>=40?"In the Flow":"Afterhours";
 const [roomName,roomTagline]=ROOMS[room?.room]||["Underground FM","Different strangers. Same frequency."];
 const view=room?(isDj?"controller":"listener"):"discover";
 const queue=room?.queue||[];
 const queueMinutes=Math.round(queue.reduce((n,e)=>n+(Number(e.track.duration)||0),0)/60);
 const deck=selectedTrack||(room?room.track:null);
 const vars={"--crowd":CROWD,"--show-a":theme.a,"--show-b":theme.b,"--show-dark":theme.dark,"--show-beat":(60/(fx.beatBpm||116)).toFixed(3)+"s","--heat":heatScore/100};
 const mAt=room?.lights?.showMoment?.at,mKind=room?.lights?.showMoment?.kind;

 /* ── visual engines ── */
 useEffect(()=>{
  const quality=qualityFor();
  stage.current=createStage(stageCv.current,{quality});
  overlay.current=createOverlay(overlayCv.current,{quality});
  return ()=>{stage.current?.destroy();overlay.current?.destroy();stage.current=overlay.current=null;};
 },[]);
 useEffect(()=>{stage.current?.setReduced(motionOff);overlay.current?.setReduced(motionOff);},[motionOff]);
 useEffect(()=>{stage.current?.set({theme,fx:fx.fx,power:fx.intensity,bpm:fx.beatBpm,heat:room?heatScore:50,playing});},[theme.id,fx.fx,fx.intensity,fx.beatBpm,heatScore,playing,room?.room]);
 useEffect(()=>{if(mAt)stage.current?.moment(mKind,mAt);},[mAt,mKind]);
 useEffect(()=>{
  const h=room?heatScore:50;
  overlay.current?.ambient({energy:clamp((h-70)/30,0,1)*.5,chill:clamp((32-h)/32,0,1)*.65});
 },[heatScore,room?.room,motionOff]);
 useEffect(()=>{if(moodBurst){const t=setTimeout(()=>setMoodBurst(null),2600);return ()=>clearTimeout(t);}},[moodBurst]);
 useEffect(()=>{
  const mq=window.matchMedia("(prefers-reduced-motion: reduce)");
  const change=()=>setReduced(mq.matches);
  change();mq.addEventListener?.("change",change);
  return ()=>mq.removeEventListener?.("change",change);
 },[]);
 useEffect(()=>{if(chatList.current)chatList.current.scrollTop=chatList.current.scrollHeight;},[messages.length,tab]);
 useEffect(()=>{if(!isDj&&room&&!room.track&&preview)setPreview(null);},[room?.room,isDj,room?.track]);
 useEffect(()=>{if(!room)setTab(t=>t==="chat"?"show":t);},[room?.room]);

 /* ── discovery feed ── */
 useEffect(()=>{
  if(room&&!isDj)return;
  const controller=new AbortController();setLoading(true);
  fetch("/api/underground/tracks?page=0"+(term?"&q="+encodeURIComponent(term):""),{signal:controller.signal})
   .then(r=>r.json()).then(j=>{setTracks(shuffle(j.tracks||[]));setPage(0);setHasMore(Boolean(j.hasMore));if(j.error)setNotice(j.error);})
   .catch(e=>{if(e.name!=="AbortError")setNotice("Music discovery unavailable right now.");})
   .finally(()=>setLoading(false));
  return ()=>controller.abort();
 },[term,isDj,room?.room]);

 /* ── realtime room ── */
 useEffect(()=>{
  if(!SERVER_URL || /^http:\/\/localhost/i.test(SERVER_URL)&&location.hostname!=="localhost"){
    setNotice("Live rooms are offline until the ChatSpark real-time server is deployed.");return;
  }
  const s=io(SERVER_URL,{path:SOCKET_PATH,transports:["websocket","polling"],autoConnect:true,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelayMax:6000,timeout:9000});
  socket.current=s;
  s.on("connect",()=>{setConnected(true);setNotice("");if(wantsRoom.current)s.emit("fm:join",ack=>{if(ack?.ok)setMe({handle:ack.handle,hue:ack.hue});else setNotice("Room unavailable after reconnection. Tap Enter the room again.");});});
  s.on("disconnect",()=>{setConnected(false);setRoom(null);setIsDj(false);setPlaying(false);});
  s.on("connect_error",()=>setNotice("Live rooms are offline. Solo Audius discovery is still available."));
  s.on("fm:state",data=>{setRoom(data);setIsDj(data.dj===s.id);});
  s.on("fm:chat",entry=>setMessages(v=>[...v.slice(-79),entry]));
  s.on("fm:reaction",entry=>{setReactions(v=>[...v.slice(-11),{...entry,id:Math.random()}]);});
  s.on("fm:mood:burst",entry=>{
   setMoodBurst({...entry,nonce:Math.random()});
   setPulses(v=>({...v,[entry.kind]:v[entry.kind]+1}));
   const power=entry.kind==="energy"?.75+(entry.heat||50)/200:entry.kind==="chill"?.95:.9;
   overlay.current?.burst(entry.kind,power);
   if(entry.by===s.id)navigator.vibrate?.(18);
  });
  return ()=>{s.emit("fm:leave");s.disconnect();socket.current=null;};
 },[]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),500);return ()=>clearInterval(timer);},[]);

 /* ── audio ── */
 useEffect(()=>{
  const a=audio.current;if(!a)return;
  a.volume=volume/100;
  if(!current){a.pause();streamTrackId.current=null;setPlaying(false);return;}
  if(streamTrackId.current!==current.id){
   streamTrackId.current=current.id;a.src="https://api.audius.co/v1/tracks/"+encodeURIComponent(current.id)+"/stream";
   a.load();setPlaying(false);setLiked(false);
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

 /* ── actions ── */
 const join=()=>{
  if(!connected||joining.current)return;
  joining.current=true;wantsRoom.current=true;setMessages([]);setReactions([]);
  socket.current?.emit("fm:join",ack=>{joining.current=false;if(ack?.ok)setMe({handle:ack.handle,hue:ack.hue});else{wantsRoom.current=false;setNotice("All rooms are full. Try again shortly.");}});
  setTimeout(()=>{joining.current=false;},8000);
 };
 const leave=()=>{
  wantsRoom.current=false;
  socket.current?.emit("fm:leave");
  audio.current?.pause();setRoom(null);setIsDj(false);setPlaying(false);setMessages([]);setNotice("");setSelectedTrack(null);setTab("show");
 };
 const command=(event,payload,label)=>{
  if(!socket.current||!room)return;
  const acknowledge=ack=>{if(!ack?.ok)setNotice(ack?.error==="dj_only"?"The controller role changed.":ack?.error==="cooldown"?"This action needs a short cooldown.":"Couldn't "+label+".");};
  if(payload===undefined)socket.current.emit(event,acknowledge);
  else socket.current.emit(event,payload,acknowledge);
 };
 const selectTrack=track=>{
  if(!room){setPreview(track);setSelectedTrack(track);setNotice("Selected for solo preview. Press play to listen.");return;}
  if(!isDj)return;
  setSelectedTrack(track);
 };
 const broadcast=chosen=>{
  if(!isDj||!chosen||!room)return;
  socket.current?.emit("fm:play",chosen,ack=>{
   if(!ack?.ok){setNotice("Could not play this song for the room.");return;}
   setTracks(old=>[...old.filter(t=>t.id!==chosen.id),chosen]);
   setSelectedTrack(null);
   setNotice("Now on air: "+chosen.title+". Tap play to listen on this device.");
  });
 };
 const queueTrack=track=>{if(room&&isDj&&track)command("fm:queue:add",track,"queue song");};
 const nextTrack=()=>{
  if(!isDj||!room)return;
  if(queue.length){command("fm:next",undefined,"play next");return;}
  const next=tracks.find(t=>t.id!==room.track?.id);
  if(!next){setNotice("Discover more tracks to continue the set.");return;}
  broadcast(next);
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
 const chooseDiscoverTab=selected=>{setDiscoverTab(selected);setQuery("");setTerm(DISCOVER_TERMS[selected]||"");};
 const scrollRail=dir=>{const el=rail.current;if(el)el.scrollBy({left:dir*el.clientWidth*.8,behavior:motionOff?"auto":"smooth"});};
 const onRailScroll=e=>{const el=e.currentTarget;if(el.scrollLeft+el.clientWidth>el.scrollWidth-240)loadMore();};
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
 const react=kind=>{if(room)command("fm:reaction",kind,"send reaction");};
 const styleChange=payload=>{if(isDj)command("fm:lights",payload,"update room lighting");};
 const activateScene=scene=>{
  if(!isDj||!room)return;
  socket.current?.emit("fm:lights",{theme:scene.theme,fx:scene.fx,intensity:scene.intensity},ack=>{
   if(!ack?.ok){setNotice("Couldn't change the shared lighting scene.");return;}
   socket.current?.emit("fm:moment",scene.moment,response=>{if(!response?.ok&&response?.error!=="cooldown")setNotice("Lighting changed, but the show moment could not be triggered.");});
  });
 };
 const fxTrigger=kind=>{
  if(!isDj||!room)return;
  socket.current?.emit("fm:moment",kind,ack=>{if(!ack?.ok)setNotice(ack?.error==="cooldown"?"Let the previous show moment settle first.":"Show effect unavailable.");});
 };
 const castMood=kind=>{
  if(!room||voteBusy||Date.now()-lastVoteAt.current<3000)return;
  lastVoteAt.current=Date.now();setVoteBusy(true);setCooldownKey(k=>k+1);
  socket.current?.emit("fm:mood",kind,ack=>{
   if(!ack?.ok){lastVoteAt.current=0;setNotice(ack?.error==="cooldown"?"One vote every 3 seconds.":"Couldn't register your vote.");setVoteBusy(false);}
  });
  setTimeout(()=>setVoteBusy(false),3050);
 };
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
 const selectGenre=genre=>{
  setHeroGenre(genre);
  if(room&&!isDj){setRequestText(genre);setRequestSent(null);setTab("music");return;}
  setQuery(genre);setTerm(genre);
 };
 const chooseDiscovery=type=>{setRequestSent(null);setRequestText(({"Underground Picks":"underground","This Week":"new music","Global Sounds":"world music","Deep & Dreamy":"ambient chill"})[type]||type);};
 const toggleMotion=()=>setMotionPref(!motionOff);

 /* ── shared pieces ── */
 const controllerActions=<div className="fx-ctrl-actions">
  <button type="button" className="fx-big-action fx-next" onClick={nextTrack} disabled={!room||(!queue.length&&!tracks.some(t=>t.id!==room?.track?.id))}><Icon name="next"/><strong>NEXT TRACK</strong><small>Plays the next track in queue</small></button>
  <button type="button" className="fx-big-action fx-pass" onClick={()=>command("fm:pass",undefined,"pass controller")} disabled={!room||room.listeners<2}><Icon name="pass"/><strong>PASS CONTROLLER</strong><small>Gives the controller to another listener</small></button>
 </div>;
 const trackCard=t=><div key={t.id} className={"fx-card"+(selectedTrack?.id===t.id?" is-chosen":"")}>
  <div className="fx-card-media">
   <button type="button" className="fx-card-cover" onClick={()=>selectTrack(t)} aria-label={"Select "+t.title+" by "+t.artist}>
    <Art track={t}/>{selectedTrack?.id===t.id&&<b className="fx-card-check">✓</b>}
   </button>
   <div className="fx-card-actions">
    {view==="controller"?<><button type="button" onClick={()=>broadcast(t)} aria-label={"Play "+t.title+" now for the room"}><Icon name="play"/></button><button type="button" onClick={()=>queueTrack(t)} disabled={queue.length>=17} aria-label={"Add "+t.title+" to the queue"}><Icon name="plus"/></button></>
    :<button type="button" onClick={()=>selectTrack(t)} aria-label={"Preview "+t.title}><Icon name="play"/></button>}
   </div>
  </div>
  <strong>{t.title}</strong><small>{t.artist}</small>
 </div>;
 const library=<section className="fx-panel fx-library" data-pane={view==="discover"?"show":"music"} aria-label="Music library">
  <header className="fx-panel-head">
   <h2>{view==="controller"?"Discover Underground Music":"The Crates"}</h2>
   <form className="fx-search" role="search" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}>
    <Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search artists, tracks, moods…" aria-label="Search music"/>
   </form>
  </header>
  <div className="fx-chips" role="group" aria-label="Explore music by mood">{DISCOVER_TABS.map(item=><button type="button" key={item} onClick={()=>chooseDiscoverTab(item)} aria-pressed={item===discoverTab}>{item}</button>)}</div>
  <div className="fx-rail-wrap">
   <button type="button" className="fx-rail-arrow" onClick={()=>scrollRail(-1)} aria-label="Scroll tracks left"><Icon name="left"/></button>
   <div className="fx-rail" ref={rail} onScroll={onRailScroll} role="list">
    {loading?Array.from({length:8},(_,i)=><div key={i} className="fx-card fx-skeleton" aria-hidden="true"/>):tracks.map(trackCard)}
    {!loading&&!tracks.length&&<p className="fx-empty">No tracks found. Try another search.</p>}
    {hasMore&&!loading&&tracks.length>0&&<button type="button" className="fx-more" onClick={loadMore} disabled={loadingMore}>{loadingMore?"…":"More"}</button>}
   </div>
   <button type="button" className="fx-rail-arrow" onClick={()=>scrollRail(1)} aria-label="Scroll tracks right"><Icon name="right"/></button>
  </div>
 </section>;
 const vibeOrb=m=><button type="button" key={m.id} className={"fx-orb fx-orb-"+m.id} disabled={!room||voteBusy} onClick={()=>castMood(m.id)} aria-label={m.cta+": "+m.short}>
  <span className="fx-orb-body"><OrbCanvas kind={m.id} motionOff={motionOff} level={clamp(.55+moodScore(m.id)/100,.55,1)} pulseKey={pulses[m.id]}/><span className="fx-orb-icon"><Icon name={m.id==="energy"?"fire":m.id==="love"?"eq":"snow"}/></span>{voteBusy&&<i key={cooldownKey} className="fx-orb-cooldown"/>}</span>
  <span className="fx-orb-name">{m.core}</span><span className="fx-orb-blurb">{m.blurb}</span>
  <span className="fx-orb-cta">{room?(voteBusy?"Recharging…":m.cta):"Join to react"}</span>
 </button>;
 const reactionBar=<div className="fx-react-bar" role="group" aria-label="Send a reaction">{REACTIONS.map(([kind,emoji])=><button key={kind} type="button" onClick={()=>react(kind)} disabled={!room} aria-label={"React "+kind}><span>{emoji}</span><b>{room?.reactionCounts?.[kind]||0}</b></button>)}</div>;

 return <div className={"fx-shell fx-"+view+" "+oswald.variable} style={vars} data-view={view} data-tab={tab} data-motion={motionOff?"reduced":"full"} data-playing={playing} data-heat={hottest} data-fab={view==="controller"&&Boolean(selectedTrack)}>
  <canvas ref={stageCv} className="fx-stage" aria-hidden="true"/>
  <div className="fx-scrim" aria-hidden="true"/>
  <canvas ref={overlayCv} className="fx-overlay" aria-hidden="true"/>
  {moodBurst&&<div key={moodBurst.nonce} className={"fx-callout fx-callout-"+moodBurst.kind} role="status"><strong>{moodBurst.kind==="energy"?"IGNITION":moodBurst.kind==="love"?"VIBE WAVE":"COOL DOWN"}</strong><small>{moodBurst.handle?moodBurst.handle+" ":""}{moodBurst.kind==="energy"?"lit it up":moodBurst.kind==="love"?"kept the vibe":"chilled the room"}</small></div>}

  <aside className="fx-side" aria-label="Underground navigation">
   <Link href={"/"+locale} className="fx-brand">ChatSpark<span aria-hidden="true">⚡</span><small>UNDERGROUND FM</small></Link>
   <nav>
    <Link href={"/"+locale}><Icon name="home"/><span>Home</span></Link>
    <Link href={"/"+locale+"/start"}><Icon name="chat"/><span>Random Chat</span></Link>
    <Link href={"/"+locale+"/underground"} className="current" aria-current="page"><Icon name="wave"/><span>Underground FM</span></Link>
    <Link href={"/"+locale+"/poem-wall"}><Icon name="poem"/><span>Poem Wall</span></Link>
    <Link href={"/"+locale+"/graffiti-wall"}><Icon name="wall"/><span>Graffiti Wall</span></Link>
   </nav>
   <p className="fx-manifest" aria-hidden="true">Music<br/>People<br/>Strangers<br/><b>Always<br/>a good<br/>mix.</b></p>
   <small className="fx-side-foot">RANDOM PEOPLE.<br/>REAL MUSIC.<br/>BIGGER NIGHTS.</small>
  </aside>

  <div className="fx-main">
   <header className="fx-topbar">
    <Link href={"/"+locale} className="fx-brand fx-brand-mobile">ChatSpark<span aria-hidden="true">⚡</span></Link>
    <nav className="fx-pills" aria-label="Site sections"><Link href={"/"+locale}>EXPLORE</Link><Link className="is-active" href={"/"+locale+"/underground"} aria-current="page">UNDERGROUND FM</Link><Link href={"/"+locale+"/poem-wall"}>COMMUNITY</Link></nav>
    <button type="button" className="fx-fx-toggle" onClick={toggleMotion} aria-pressed={motionOff}>{motionOff?"ENABLE FX":"REDUCE MOTION"}</button>
   </header>

   <section className="fx-hero" data-pane="show">
    <div className="fx-hero-copy">
     <div className="fx-live-row"><span className={"fx-live "+(room?"on":"")}><i/>{room?"LIVE":"OFFLINE"}</span><span>{fmtListeners(room?.listeners)} LISTENERS</span><span className="fx-dim">{room?"ROOM · "+room.room:"OPEN FREQUENCY"} · {heroGenre} · Global</span></div>
     <h1>{roomName}</h1>
     <p>{roomTagline}</p>
     <div className="fx-genres" role="group" aria-label="Discover by genre">{GENRES.map(genre=><button type="button" key={genre} aria-pressed={heroGenre===genre} onClick={()=>selectGenre(genre)}>{genre}</button>)}</div>
    </div>
    <div className={"fx-ctrl-card fx-ctrl-card-"+view}>
     {view==="controller"&&<><span className="fx-ctrl-kicker"><Icon name="crown"/>YOU ARE THE CONTROLLER</span><p>Pick the music, set the energy and shape the night for everyone in the room.</p><small>{turnLeft!==null?"AUX ROTATES IN "+clockFmt(turnLeft):"THE AUX CHANGES HANDS"}</small><button type="button" className="fx-leave" onClick={leave}>LEAVE ROOM</button></>}
     {view==="listener"&&<><span className="fx-ctrl-kicker"><Icon name="crown"/>CURRENT CONTROLLER</span><div className="fx-ctrl-who"><Avatar hue={room.djHue} label={room.djHandle} size="lg"/><strong>{room.djHandle||"a stranger"}</strong></div><p>Controlling the vibe right now.</p><small>{turnLeft!==null?"ROTATES IN "+clockFmt(turnLeft):"THE AUX CHANGES HANDS"}</small><button type="button" className="fx-leave" onClick={leave}>LEAVE ROOM</button></>}
     {view==="discover"&&<><span className="fx-ctrl-kicker"><Icon name="headphones"/>PICK A TRACK. FIND YOUR PEOPLE.</span><p>Enter a live room to meet strangers, take the aux and light up the night.</p><button type="button" className="fx-join" onClick={join} disabled={!connected}>{connected?"ENTER THE ROOM ↗":"ROOMS OFFLINE"}</button></>}
    </div>
   </section>

   <div className="fx-grid">
    <section className="fx-panel fx-now" data-pane="show" aria-label="Now playing">
     <header className="fx-panel-head"><h2>Now Playing</h2><span className="fx-dim">{room?"SHARED RADIO":preview?"SOLO PREVIEW":"WAITING FOR A SIGNAL"}</span></header>
     <div className="fx-now-body">
      <div className="fx-cover" data-playing={playing}>{current?.artwork?<img src={current.artwork} alt={current.title+" cover art"} referrerPolicy="no-referrer" onError={hideBroken}/>:<span className="fx-record"><i/></span>}<em/></div>
      <div className="fx-song">
       <div className="fx-song-head"><div><h3>{current?.title||"Your next discovery."}</h3><p>{current?.artist||"Select a track. Let the night unfold."}</p></div>
        <div className="fx-song-tools"><button type="button" className={"fx-icon-btn"+(liked?" is-on":"")} onClick={()=>setLiked(v=>!v)} aria-pressed={liked} aria-label={liked?"Remove like":"Like this track"} disabled={!current}><Icon name="heart"/></button></div></div>
       <div className="fx-tags"><span>{current?.genre||"Underground"}</span><span>{room?"Live broadcast":"Discover"}</span><span>{theme.name}</span></div>
       <div className={"fx-wave"+(playing?" is-playing":"")} aria-hidden="true">{WAVE.map((b,i)=><i key={i} style={{"--h":b.h+"%","--d":b.d+"s"}}/>)}</div>
       <div className="fx-progress"><div className="fx-progress-track"><span style={{width:current&&duration?clamp(time/duration*100,0,100)+"%":room?.track?clamp((time%180)/180*100,0,100)+"%":"0%"}}/></div><small>{clockFmt(time)} {duration?"/ "+clockFmt(duration):current?"/ LIVE":"/ 0:00"}</small></div>
       <div className="fx-player"><button type="button" onClick={togglePlay} disabled={!current} className="fx-play" aria-label={playing?"Pause audio":"Play audio"}><Icon name={playing?"pause":"play"}/></button><span className="fx-player-hint">Tap to {playing?"pause":"listen"} on this device</span>
        <label className="fx-volume"><Icon name="volume"/><input type="range" min="0" max="100" value={volume} onChange={e=>{const value=Number(e.target.value);setVolume(value);if(audio.current)audio.current.volume=value/100;}} aria-label="Volume"/><output>{volume}%</output></label></div>
      </div>
     </div>
     <audio ref={audio} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);if(isDj&&room)nextTrack();}} onError={()=>setNotice("Track unavailable for external Audius streaming.")}/>
    </section>

    <section className={"fx-panel fx-reactor fx-reactor-"+hottest} data-pane="show" aria-label={room?"Room heat, "+heatScore+" percent":"Room heat, waiting for listeners"}>
     <header className="fx-panel-head"><h2>Room Reactor</h2><span className="fx-dim">Collective energy from everyone in the room</span></header>
     <div className="fx-reactor-body">
      <div className="fx-heat" role="img" aria-label={"Room vibe "+(room?heatScore+"%":"waiting")}><OrbCanvas kind="room" motionOff={motionOff} level={room?.45+heatScore/110:.45} pulseKey={pulses.energy+pulses.love+pulses.chill}/><div className="fx-heat-core"><strong>{room?heatScore:"—"}<small>{room?"%":""}</small></strong><span>ROOM VIBE</span><em>{room?status:"WAITING FOR THE CROWD"}</em></div></div>
      <div className="fx-mini-orbs">{MOOD_SCENES.map(m=><button type="button" key={m.id} className={"fx-mini-orb fx-mini-"+m.id} disabled={!room||voteBusy} onClick={()=>castMood(m.id)} aria-label={"Vote "+m.title+": "+m.short}>
       <span className="fx-mini-body"><OrbCanvas kind={m.id} motionOff={motionOff} level={clamp(.5+moodScore(m.id)/100,.5,1)} pulseKey={pulses[m.id]}/></span>
       <b>{moodScore(m.id)}%</b><strong>{m.title}</strong><small>{m.core}</small></button>)}</div>
      <p className="fx-reactor-foot"><i className={room?"on":""}/>{room?moodTotal+" room votes · heat settles back to 50%":"Join a room to light it up"}</p>
     </div>
    </section>

    {view==="controller"&&<div className="fx-mobile-only" data-pane="show">{controllerActions}</div>}

    <aside className="fx-panel fx-chat" data-pane="chat" aria-label="Room chat"><div className="fx-chat-inner">
     <header className="fx-panel-head"><h2>Room Chat</h2><span className="fx-dim">{room?.listeners||0} here</span></header>
     <div className="fx-messages" ref={chatList} role="log" aria-live="polite" aria-label="Room conversation">{messages.length?messages.map((msg,i)=><div className={"fx-msg"+(msg.from==="REQUEST"?" is-request":"")+(msg.from==="DJ"?" is-dj":"")} key={msg.at+"-"+i}>
      <Avatar hue={msg.hue??200} label={msg.handle||"?"} crown={msg.from==="DJ"}/>
      <div><header><b>{msg.handle||"stranger"}{me&&msg.handle===me.handle?" (you)":""}</b>{msg.from==="DJ"&&<em>CONTROLLER</em>}<time>{new Date(msg.at).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</time></header><p>{msg.text}</p></div>
     </div>):<div className="fx-empty-chat"><strong>Every good night starts with a hello.</strong><p>{room?"Be the first to say hello. Everyone in this room can chat.":"Enter a room to meet the people behind the music."}</p></div>}</div>
     <div className="fx-float" aria-hidden="true">{reactions.filter(r=>clock-r.at<2400).map(r=><span key={r.id} style={{"--x":(r.id*997%70)+"%"}}>{REACTIONS.find(x=>x[0]===r.kind)?.[1]||"✨"}</span>)}</div>
     {reactionBar}
     <form onSubmit={e=>{e.preventDefault();submitChat();}} className="fx-compose"><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={280} disabled={!room} aria-label="Message the room" placeholder={room?"Message the room…":"Join a room to chat"}/><button disabled={!room||!draft.trim()} type="submit" aria-label="Send message"><Icon name="send"/></button></form>
     <p className="fx-chat-foot">Temporary room chat. No recordings or profiles. Be kind.</p>
    </div></aside>

    {view!=="listener"&&library}

    {view==="controller"&&<div className="fx-row fx-row-controller">
     <section className="fx-panel fx-lights" data-pane="vibe" aria-label="Light mode">
      <header className="fx-panel-head"><h2>Light Mode</h2><span className="fx-dim">Transform the room's atmosphere</span><button type="button" className="fx-link" onClick={()=>styleChange({theme:"acid",fx:"march",intensity:2})}>Reset</button></header>
      <div className="fx-scenes">{SCENES.map(scene=><button type="button" key={scene.id} onClick={()=>activateScene(scene)} aria-pressed={fx.theme===scene.theme&&fx.fx===scene.fx} className={"fx-scene fx-scene-"+scene.id}><span className="fx-scene-art"><i/><i/><i/></span><strong>{scene.name}</strong><small>{scene.subtitle}</small></button>)}</div>
      <div className="fx-moments" role="group" aria-label="Show moments"><span>MOMENTS</span>{MOMENTS.map(([kind,label])=><button type="button" key={kind} onClick={()=>fxTrigger(kind)}>{label}</button>)}</div>
      <button type="button" className="fx-link fx-tune-toggle" onClick={()=>setShowTune(v=>!v)} aria-expanded={showTune}>{showTune?"Hide fine-tune":"Fine-tune colors, pattern & power"}</button>
      {showTune&&<div className="fx-tune">
       <div className="fx-swatches" role="group" aria-label="Light color">{THEMES.map(t=><button type="button" key={t.id} aria-label={t.name} aria-pressed={fx.theme===t.id} title={t.name} onClick={()=>styleChange({theme:t.id})} style={{"--a":t.a,"--b":t.b}}/>)}</div>
       <div className="fx-chips" role="group" aria-label="Light pattern">{FX.map(([id,label])=><button type="button" key={id} aria-pressed={fx.fx===id} onClick={()=>styleChange({fx:id})}>{label}</button>)}</div>
       <div className="fx-chips" role="group" aria-label="Scene power">{[[1,"Low"],[2,"Live"],[3,"Max"]].map(([power,label])=><button type="button" key={power} aria-pressed={fx.intensity===power} onClick={()=>styleChange({intensity:power})}>{label}</button>)}</div>
      </div>}
     </section>

     <section className="fx-panel fx-ctrl" data-pane="music" aria-label="Controller panel">
      <header className="fx-panel-head"><h2>Controller Panel</h2><span className="fx-dim">{selectedTrack?"Tap the cover to play for the room":"Choose a track from the library"}</span></header>
      <div className="fx-deck">
       <button type="button" className="fx-deck-cover" onClick={()=>broadcast(selectedTrack)} disabled={!selectedTrack} aria-label={selectedTrack?"Play "+selectedTrack.title+" for the whole room":"Select a track to broadcast"}>
        <Art track={deck}/>{selectedTrack&&<i><Icon name="play"/></i>}
       </button>
       <div className="fx-deck-meta">
        <span className="fx-kicker">{selectedTrack?"READY TO BROADCAST":room.track?"ON AIR NOW":"NOTHING ON AIR"}</span>
        <strong>{deck?.title||"Select a frequency"}</strong><small>{deck?.artist||"Pick a cover in the library — it lands here."}</small>
        {selectedTrack&&<div className="fx-deck-buttons"><button type="button" className="fx-solid" onClick={()=>broadcast(selectedTrack)}><Icon name="play"/>Play now</button><button type="button" className="fx-ghost" disabled={queue.length>=17} onClick={()=>queueTrack(selectedTrack)}><Icon name="plus"/>Add to queue</button></div>}
       </div>
      </div>
     </section>

     <section className="fx-panel fx-queue" data-pane="music" aria-label="Live queue">
      <header className="fx-panel-head"><h2>Live Queue</h2><span className="fx-dim">{queue.length} {queue.length===1?"track":"tracks"}{queue.length?" · "+queueMinutes+" min":""}</span></header>
      <div className="fx-queue-list">
       {queue.length?queue.map((entry,i)=><div key={entry.track.id+"-"+i} className="fx-queue-item">
        <Art track={entry.track}/><span className="fx-queue-meta"><strong>{entry.track.title}</strong><small>{entry.track.artist}{entry.by?" · req. "+entry.by:""}</small></span><span className="fx-queue-time">{clockFmt(entry.track.duration)}</span>
        <span className="fx-queue-edit"><button type="button" onClick={()=>broadcast(entry.track)} aria-label={"Play "+entry.track.title+" now"}><Icon name="play"/></button><button type="button" disabled={i===0} onClick={()=>command("fm:queue:move",{from:i,to:i-1},"reorder queue")} aria-label={"Move "+entry.track.title+" up"}><Icon name="up"/></button><button type="button" disabled={i===queue.length-1} onClick={()=>command("fm:queue:move",{from:i,to:i+1},"reorder queue")} aria-label={"Move "+entry.track.title+" down"}><Icon name="down"/></button><button type="button" onClick={()=>command("fm:queue:remove",i,"remove queued song")} aria-label={"Remove "+entry.track.title+" from queue"}><Icon name="close"/></button></span>
       </div>):<p className="fx-empty">Room requests and tracks you add appear here.</p>}
      </div>
      <div className="fx-desktop-only">{controllerActions}</div>
     </section>
    </div>}

    {view==="listener"&&<section className="fx-panel fx-shape" data-pane="vibe" aria-label="Shape the vibe">
     <header className="fx-panel-head"><div><h2>Shape the Vibe</h2><span className="fx-dim">Your reactions directly influence the room's energy.</span></div><button type="button" className="fx-link" onClick={()=>setShowGuide(v=>!v)} aria-expanded={showGuide}>{showGuide?"Close guide":"How it works"}</button></header>
     {showGuide&&<p className="fx-guide">Fire raises room heat, Keep the Vibe sustains it and Chill It Down lowers it. Every accepted vote updates the shared room heat and lights up the room for everyone connected. One vote every three seconds; heat gradually settles back toward 50%.</p>}
     <div className="fx-orbs">{MOOD_SCENES.map(vibeOrb)}</div>
    </section>}

    {view==="listener"&&<div className="fx-row fx-row-listener">
     <section className="fx-panel fx-card-mode" data-pane="show"><span className="fx-mode-icon"><Icon name="headphones"/></span><h2>Listener Mode</h2><p>You're tuned in. React, request tracks and help shape the vibe with everyone in the room.</p></section>
     <section className="fx-panel fx-live-react" data-pane="vibe"><header className="fx-panel-head"><h2>Live Reactions</h2></header><p className="fx-dim">Real-time reactions from the room</p>
      <div className="fx-react-cloud" aria-hidden="true">{reactions.filter(r=>clock-r.at<2900).map(r=><span key={r.id} style={{"--x":(r.id*997%80)+"%","--s":(.9+(r.id*31%7)/10)}}>{REACTIONS.find(x=>x[0]===r.kind)?.[1]||"✨"}</span>)}</div>
      {reactionBar}</section>
     <section className="fx-panel fx-request" data-pane="music"><header className="fx-panel-head"><h2>Request a Track</h2></header><p className="fx-dim">Got a song that fits the vibe?</p>
      <form onSubmit={e=>{e.preventDefault();sendRequest();}}><label className="fx-sr-only" htmlFor="fx-request">Song or artist</label><span className="fx-search"><Icon name="search"/><input id="fx-request" value={requestText} onChange={e=>{setRequestText(e.target.value);setRequestSent(null);}} placeholder="Search for a song or artist…" maxLength={80}/></span><button type="submit" className="fx-solid" disabled={!requestMatches.length||requestSearching}>Request Track ›</button></form>
      {requestSearching&&<small className="fx-dim">Searching music…</small>}{requestSent&&<small className="fx-ok">✓ Sent: {requestSent}</small>}
      {requestMatches.length>0&&<div className="fx-request-results">{requestMatches.map(t=><button key={t.id} type="button" onClick={()=>requestTrack(t)}><Art track={t}/><span><b>{t.title}</b><small>{t.artist}</small></span><Icon name="plus"/></button>)}</div>}
      <small className="fx-dim fx-foot">Requests go to the current controller for consideration.</small></section>
     <section className="fx-panel fx-discover-mode" data-pane="music"><header className="fx-panel-head"><h2>Discover Mode</h2></header><p className="fx-dim">Let the music take you somewhere new.</p>
      <div className="fx-discover-tiles">{[["Underground Picks","Hidden gems"],["This Week","Fresh sounds"],["Global Sounds","Worldwide"],["Deep & Dreamy","Late night vibes"]].map(([name,sub],i)=><button type="button" key={name} onClick={()=>{chooseDiscovery(name);}}><span className={"fx-dtile fx-dtile-"+i}/><strong>{name}</strong><small>{sub}</small></button>)}</div></section>
    </div>}

    {view==="discover"&&<div className="fx-row fx-row-howto" data-pane="show">{[["01","Enter a room","Strangers, one shared playlist, no profiles."],["02","Take the aux","Everyone gets a turn as controller — pick tracks and set the lights."],["03","Shape the vibe","Fire, Vibe or Chill. The whole room feels it, live."]].map(([n,t,d])=><div className="fx-panel fx-howto" key={n}><b>{n}</b><h2>{t}</h2><p>{d}</p></div>)}</div>}
   </div>
  </div>

  {view==="controller"&&selectedTrack&&<div className={"fx-fab"+(current&&tab!=="show"?" has-mini":"")} role="region" aria-label="Selected track">
   <button type="button" className="fx-fab-play" onClick={()=>broadcast(selectedTrack)} aria-label={"Broadcast "+selectedTrack.title+" to the room now"}>
    <span className="fx-fab-cover"><Art track={selectedTrack}/><i><Icon name="play"/></i></span>
    <span className="fx-fab-text"><small>TAP TO PLAY FOR THE ROOM</small><strong>{selectedTrack.title}</strong><em>{selectedTrack.artist}</em></span>
   </button>
   <button type="button" className="fx-fab-mini" onClick={()=>{queueTrack(selectedTrack);setSelectedTrack(null);}} disabled={queue.length>=17} aria-label={"Queue "+selectedTrack.title+" instead"} title="Add to queue"><Icon name="plus"/></button>
   <button type="button" className="fx-fab-mini" onClick={()=>setSelectedTrack(null)} aria-label="Clear selected track" title="Clear"><Icon name="close"/></button>
  </div>}
  {current&&tab!=="show"&&<div className="fx-miniplayer"><Art track={current}/><span><strong>{current.title}</strong><small>{current.artist}</small></span><button type="button" onClick={togglePlay} aria-label={playing?"Pause audio from mini player":"Play audio from mini player"}><Icon name={playing?"pause":"play"}/></button></div>}
  <nav className="fx-dock" aria-label="Sections">
   <button type="button" aria-pressed={tab==="show"} onClick={()=>setTab("show")}><Icon name="wave"/><span>The Show</span></button>
   <button type="button" aria-pressed={tab==="music"} onClick={()=>setTab("music")}><Icon name="note"/><span>{view==="controller"?"Library":view==="listener"?"Request":"Crates"}</span></button>
   <button type="button" aria-pressed={tab==="vibe"} onClick={()=>setTab("vibe")} disabled={view==="discover"}><Icon name={view==="controller"?"bulb":"fire"}/><span>{view==="controller"?"Lights":"Vibe"}</span></button>
   <button type="button" aria-pressed={tab==="chat"} onClick={()=>{if(room)setTab("chat");else join();}} disabled={!room&&!connected}><Icon name="chat"/><span>{room?"Chat":"Join"}</span></button>
  </nav>
  {notice&&<div className="fx-toast" role="status"><span>{notice}</span><button type="button" onClick={()=>setNotice("")} aria-label="Dismiss notice"><Icon name="close"/></button></div>}
 </div>;
}
