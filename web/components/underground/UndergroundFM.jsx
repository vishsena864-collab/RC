"use client";
// Underground FM: the live room page. Lights live in fx.js, the chat in RoomChat.jsx, shared bits in parts.jsx/constants.js.
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Oswald} from "next/font/google";
import {io} from "socket.io-client";
import {SERVER_URL,SOCKET_PATH} from "@/lib/site";
import {REACTION_EMOJI} from "@/lib/emoji";
import {canMapSongs,mapSong} from "@/lib/cue-runner";
import {createOverlay,createSpectrum,createStage,photoFit,qualityFor} from "./fx";
import {CROWD,THEMES,FX,MOODS,MOOD_SCENES,REACTIONS,ROOMS,SCENES,MOMENTS,CROSSFADE_MS,DISCOVER_TABS,DISCOVER_TERMS,GENRES,LIGHT_DEFAULTS,clamp,clockFmt,fmtListeners,SS,tabKey} from "./constants";
import {Icon,Avatar,Emo,Art,OrbVideo,hideBroken,floatStyle} from "./parts";
import RoomChat from "./RoomChat";
import "./stage.css";

const oswald=Oswald({subsets:["latin"],weight:["500","600","700"],variable:"--fx-oswald",display:"swap"});

export default function UndergroundFM({locale="en"}){
 const [tracks,setTracks]=useState([]),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const [preview,setPreview]=useState(null),[connected,setConnected]=useState(false),[room,setRoom]=useState(null),[isDj,setIsDj]=useState(false),[me,setMe]=useState(null),[messages,setMessages]=useState([]),[playing,setPlaying]=useState(false),[clock,setClock]=useState(Date.now());
 const [volume,setVolume]=useState(80),[liked,setLiked]=useState(false),[reactions,setReactions]=useState([]),[reduced,setReduced]=useState(false),[motionPref,setMotionPref]=useState(null);
 const [selectedTrack,setSelectedTrack]=useState(null),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(true),[loadingMore,setLoadingMore]=useState(false),[requestText,setRequestText]=useState(""),[discoverTab,setDiscoverTab]=useState("For You"),[moodBurst,setMoodBurst]=useState(null),[pulses,setPulses]=useState({energy:0,love:0,chill:0}),[voteBusy,setVoteBusy]=useState(false),[heroGenre,setHeroGenre]=useState("Electronic"),[requestMatches,setRequestMatches]=useState([]),[requestSearching,setRequestSearching]=useState(false),[requestSent,setRequestSent]=useState(null),[tab,setTab]=useState("show"),[showGuide,setShowGuide]=useState(false),[showTune,setShowTune]=useState(false),[cooldownKey,setCooldownKey]=useState(0),[reconnecting,setReconnecting]=useState(false),[cueSheet,setCueSheet]=useState(null),[mapping,setMapping]=useState(false),[inviteRoom,setInviteRoom]=useState(null);
 const socket=useRef(null),audio=useRef(null),streamTrackId=useRef(null),joining=useRef(false),wantsRoom=useRef(false),lastVoteAt=useRef(0),stageCv=useRef(null),overlayCv=useRef(null),stage=useRef(null),overlay=useRef(null),rail=useRef(null),lastRoom=useRef(null),autoPlay=useRef(false),listening=useRef(false),deckA=useRef(null),deckB=useRef(null),sources=useRef(new Map()),fadeJob=useRef(null),volRef=useRef(.8),earlyNext=useRef(null),roomRef=useRef(null),shellRef=useRef(null),photoRef=useRef(null),specCv=useRef(null),spectrum=useRef(null),actx=useRef(null),analyser=useRef(null);
 const motionOff=motionPref===null?reduced:motionPref;
 const fx=room?.lights||LIGHT_DEFAULTS;
 roomRef.current=room;
 const autoShow=fx.auto!==false;
 // Lights off is personal: it only changes this browser, never the room's show.
 const [lightsOff,setLightsOff]=useState(false),lightsOffRef=useRef(false);
 const [mixNonce,setMixNonce]=useState(0),mixSeed=useRef(0);
 const [tapped,setTapped]=useState(null);
 useEffect(()=>{try{setLightsOff(localStorage.getItem("fm:lights-off")==="1");}catch{}},[]);
 useEffect(()=>{lightsOffRef.current=lightsOff;stage.current?.set({off:lightsOff});if(lightsOff)shellRef.current?.style.setProperty("--bass","0");try{localStorage.setItem("fm:lights-off",lightsOff?"1":"0");}catch{}},[lightsOff]);
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
 const vars={"--crowd":CROWD,"--hue":(theme.hue||0)+"deg","--show-a":theme.a,"--show-b":theme.b,"--show-dark":theme.dark,"--show-beat":(60/(fx.beatBpm||116)).toFixed(3)+"s","--heat":heatScore/100};
 const mAt=room?.lights?.showMoment?.at,mKind=room?.lights?.showMoment?.kind;

 /* ── visual engines ── */
 useEffect(()=>{
  const quality=qualityFor();
  // the rig reports its drive every frame; globes and the cover breathe with it through CSS variables
  const shell=shellRef.current,onLevels=lv=>{shell.style.setProperty("--bass",lv.bass.toFixed(3));shell.style.setProperty("--kick",lv.kick.toFixed(3));};
  // a mapped drop fires the pyro for everyone in sync (each device follows the same cue sheet and room clock)
  stage.current=createStage(stageCv.current,{quality,photo:true,onLevels,onCue:kind=>{if(kind==="drop"&&!lightsOffRef.current)overlay.current?.burst("energy",1.15);}});
  overlay.current=createOverlay(overlayCv.current,{quality});
  spectrum.current=createSpectrum(specCv.current);
  const place=()=>{const f=photoFit(innerWidth,innerHeight),el=photoRef.current;if(el){el.style.backgroundImage="url("+f.src+")";el.style.backgroundSize=f.dw+"px "+f.dh+"px";el.style.backgroundPosition=f.ox+"px "+f.oy+"px";}};
  place();addEventListener("resize",place);
  if(analyser.current){stage.current.audio(analyser.current);spectrum.current.audio(analyser.current);}
  return ()=>{removeEventListener("resize",place);stage.current?.destroy();overlay.current?.destroy();spectrum.current?.destroy();stage.current=overlay.current=spectrum.current=null;};
 },[]);
 useEffect(()=>{stage.current?.setReduced(motionOff);overlay.current?.setReduced(motionOff);spectrum.current?.setReduced(motionOff);if(motionOff)shellRef.current?.style.setProperty("--bass","0");},[motionOff]);
 useEffect(()=>{spectrum.current?.playing(playing);},[playing]);
 useEffect(()=>{stage.current?.set({theme,fx:fx.fx,power:fx.intensity,bpm:cueSheet?.id===current?.id&&cueSheet?cueSheet.bpm:fx.beatBpm,heat:room?heatScore:50,playing,auto:autoShow,off:lightsOffRef.current});},[theme.id,fx.fx,fx.intensity,fx.beatBpm,heatScore,playing,room?.room,autoShow,cueSheet,current?.id]);
 // song position for the auto show: this device's audio when it is playing the song, else the room clock
 const songClock=()=>{const a=audio.current,r=roomRef.current;if(a&&!a.paused&&streamTrackId.current&&a.currentTime>0)return a.currentTime;if(r?.track&&r.startedAt)return (Date.now()-r.startedAt)/1000;return null;};
 useEffect(()=>{stage.current?.cues(cueSheet&&cueSheet.id===current?.id?cueSheet:null,songClock);},[cueSheet,current?.id]);
 // map the song on air once: the controller first, other desktops a moment later, phones last; the first sheet the
 // server accepts is sent to everyone, so most listeners never download anything extra
 useEffect(()=>{
  const id=current?.id;
  if(!id||cueSheet?.id===id||(room&&room.cues===id)||!canMapSongs())return;
  const ctrl=new AbortController(),small=innerWidth<760;
  const wait=room?(isDj?300:small?6000+Math.random()*3000:1500+Math.random()*1500):800;
  const timer=setTimeout(async()=>{
   setMapping(true);
   try{
    const sheet=await mapSong(id,{signal:ctrl.signal});
    if(!sheet||ctrl.signal.aborted)return;
    setCueSheet(c=>c?.id===id?c:sheet);
    if(roomRef.current?.track?.id===id)socket.current?.emit("fm:cues",sheet,()=>{});
   }catch{}finally{if(!ctrl.signal.aborted)setMapping(false);}
  },wait);
  return ()=>{clearTimeout(timer);ctrl.abort();setMapping(false);};
 },[current?.id,room?.cues,cueSheet?.id,isDj]);
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
 useEffect(()=>{if(!isDj&&room&&!room.track&&preview)setPreview(null);},[room?.room,isDj,room?.track]);
 useEffect(()=>{if(!room)setTab(t=>t==="chat"?"show":t);},[room?.room]);

 /* ── discovery feed ── */
 useEffect(()=>{
  if(room&&!isDj)return;
  const controller=new AbortController();setLoading(true);
  // a new seed every time the list loads, so nobody sees the same list twice
  mixSeed.current=1+Math.floor(Math.random()*2e9);
  fetch("/api/underground/tracks?page=0&seed="+mixSeed.current+(term?"&q="+encodeURIComponent(term):""),{signal:controller.signal})
   .then(r=>r.json()).then(j=>{setTracks(j.tracks||[]);setPage(0);setHasMore(Boolean(j.hasMore));if(j.error)setNotice(j.error);})
   .catch(e=>{if(e.name!=="AbortError")setNotice("Music discovery unavailable right now.");})
   .finally(()=>setLoading(false));
  return ()=>controller.abort();
 },[term,isDj,room?.room,mixNonce]);

 /* ── realtime room ── */
 useEffect(()=>{
  if(!SERVER_URL || /^http:\/\/localhost/i.test(SERVER_URL)&&location.hostname!=="localhost"){
    setNotice("Live rooms are offline until the ChatSpark real-time server is deployed.");return;
  }
  // after a refresh, rejoin the same room straight away (the music never stopped for everyone else)
  const saved=SS.get("fm:room");
  if(saved?.room&&ROOMS[saved.room]){lastRoom.current=saved;wantsRoom.current=true;autoPlay.current=true;setReconnecting(true);}
  const s=io(SERVER_URL,{path:SOCKET_PATH,transports:["websocket","polling"],autoConnect:true,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelayMax:6000,timeout:9000});
  socket.current=s;
  // Hosts can drop a realtime connection at any time (serverless functions close sockets after a few minutes).
  // Keep the room, the song and the audio on screen, then rejoin the same room with a snapshot of what we were hearing.
  s.on("connect",()=>{
   setConnected(true);setNotice("");
   // Enter automatically on arrival. The old Enter button is only kept as a reconnect fallback.
   if(!wantsRoom.current){join(s);return;}
   const last=lastRoom.current;
   s.emit("fm:join",{key:tabKey(),...(last?{room:last.room,seed:{track:last.track,startedAt:last.startedAt,lights:last.lights}}:{})},ack=>{
    setReconnecting(false);
    if(ack?.ok)setMe({handle:ack.handle,hue:ack.hue});
    else{wantsRoom.current=false;setRoom(null);setIsDj(false);setNotice("Room unavailable after reconnection. Tap Enter the room again.");}
   });
  });
  s.on("disconnect",()=>{setConnected(false);if(wantsRoom.current)setReconnecting(true);else setRoom(null);});
  s.on("connect_error",()=>setNotice("Live rooms are offline. Solo Audius discovery is still available."));
  s.on("fm:state",data=>{setRoom(data);setIsDj(data.dj===s.id);lastRoom.current={room:data.room,track:data.track,startedAt:data.startedAt,lights:data.lights};SS.set("fm:room",lastRoom.current);
   try{const u=new URL(location.href);if(u.searchParams.get("room")!==data.room){u.searchParams.set("room",data.room);history.replaceState(history.state,"",u);}}catch{}});
  s.on("fm:chat",entry=>setMessages(v=>[...v.slice(-79),entry]));
  s.on("fm:cues",sheet=>setCueSheet(sheet));
  s.on("fm:reaction",entry=>{setReactions(v=>[...v.slice(-11),{...entry,id:Math.random()}]);stage.current?.react(entry.kind);});
  s.on("fm:mood:burst",entry=>{
   setMoodBurst({...entry,nonce:Math.random()});
   setPulses(v=>({...v,[entry.kind]:v[entry.kind]+1}));
   const power=entry.kind==="energy"?.75+(entry.heat||50)/200:entry.kind==="chill"?.95:.9;
   overlay.current?.burst(entry.kind,power);stage.current?.mood(entry.kind);
   if(entry.by===s.id)navigator.vibrate?.(18);
  });
  return ()=>{s.emit("fm:leave");s.disconnect();socket.current=null;};
 },[]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),500);return ()=>clearInterval(timer);},[]);
 useEffect(()=>{try{const code=new URL(location.href).searchParams.get("room");if(code&&ROOMS[code])setInviteRoom(code);}catch{}},[]);
 const invite=async()=>{
  if(!room)return;
  const u=new URL(location.href);u.searchParams.set("room",room.room);
  try{if(navigator.share&&matchMedia("(pointer:coarse)").matches)await navigator.share({title:roomName+" · Underground FM",url:u.href});else{await navigator.clipboard.writeText(u.href);setNotice("Invite link copied. Anyone who opens it joins "+roomName+".");}}
  catch(e){if(e?.name!=="AbortError")setNotice("Share this link: "+u.href);}
 };

 /* ── audio ── */
 // Two decks, like a DJ: when the room moves on while this device is playing, the new song comes in on the other
 // deck and the two are blended with equal-power curves over CROSSFADE_MS. The server starts queued songs early for it.
 const finishFade=()=>{const job=fadeJob.current;if(!job)return;clearInterval(job.timer);fadeJob.current=null;job.from.pause();job.from.removeAttribute("src");job.from.load();job.from.volume=volRef.current;if(job.to)job.to.volume=volRef.current;};
 const crossfade=(from,to)=>{
  finishFade();
  const t0=performance.now(),job={from,to,timer:0};fadeJob.current=job;
  job.timer=setInterval(()=>{
   const k=Math.min(1,(performance.now()-t0)/CROSSFADE_MS),v=volRef.current;
   from.volume=v*Math.cos(k*Math.PI/2);if(to)to.volume=v*Math.sin(k*Math.PI/2);
   if(k>=1)finishFade();
  },50);
  if(!motionOff)stage.current?.react("spark");
 };
 useEffect(()=>{
  let a=audio.current;if(!a)return;
  if(!current){finishFade();a.pause();streamTrackId.current=null;setPlaying(false);return;}
  if(streamTrackId.current!==current.id){
   const old=a,mixing=Boolean(room?.track&&streamTrackId.current&&!old.paused&&!old.ended&&old.currentTime>0);
   if(mixing){finishFade();a=old===deckA.current?deckB.current:deckA.current;audio.current=a;a.volume=0;}
   else a.volume=volRef.current;
   streamTrackId.current=current.id;if(a.dataset.nocors!=="1")a.crossOrigin="anonymous";a.src="https://api.audius.co/v1/tracks/"+encodeURIComponent(current.id)+"/stream";
   if(mixing){
    a.addEventListener("canplay",()=>{ensureAnalyser(a);a.play().then(()=>crossfade(old,a)).catch(()=>{crossfade(old,null);setNotice("The next song is on. Tap ▶ to keep listening on this device.");});},{once:true});
   }
   // joining (a click) or coming back from a refresh: pick the room's song up where it is. Browsers may refuse
   // without a fresh tap; then the play button says so.
   else if(room?.track&&(autoPlay.current||listening.current)){autoPlay.current=false;a.addEventListener("canplay",()=>{a.play().catch(()=>setNotice("The song is still playing for the room. Tap ▶ to keep listening on this device."));},{once:true});}
   a.load();if(!mixing)setPlaying(false);setLiked(false);
  }
  const sync=()=>{
   if(!room?.startedAt||!a.duration||!Number.isFinite(a.duration))return;
   const offset=Math.max(0,(Date.now()-room.startedAt)/1000);
   if(offset<a.duration&&Math.abs(a.currentTime-offset)>3)a.currentTime=offset;
  };
  a.addEventListener("loadedmetadata",sync);sync();
  return ()=>a.removeEventListener("loadedmetadata",sync);
 },[current?.id,room?.startedAt]);
 useEffect(()=>()=>{const job=fadeJob.current;if(job)clearInterval(job.timer);},[]);
 // A failed Audius stream must not leave the player silently stuck.
 // Retry once with a fresh URL (content-node redirects may be transient), then surface the failure.
 useEffect(()=>{
  const decks=[deckA.current,deckB.current].filter(Boolean);
  const retries=new Map();
  const onError=e=>{
   const el=e.currentTarget,id=streamTrackId.current;
   if(!id||el!==audio.current)return;
   const count=retries.get(id)||0;
   if(count<1){
    retries.set(id,count+1);
    setNotice("Reconnecting to the music stream…");
    el.src="https://api.audius.co/v1/tracks/"+encodeURIComponent(id)+"/stream?retry="+Date.now();
    el.load();
    if(listening.current)el.play().catch(()=>{});
   }else{
    setPlaying(false);
    setNotice("This song's stream is unavailable. Select another song or try again.");
   }
  };
  const onPlaying=()=>{setPlaying(true);setNotice(n=>n==="Reconnecting to the music stream…"?"":n);};
  decks.forEach(el=>{el.addEventListener("error",onError);el.addEventListener("playing",onPlaying);});
  return ()=>decks.forEach(el=>{el.removeEventListener("error",onError);el.removeEventListener("playing",onPlaying);});
 },[]);

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
 // walking into a silent room starts the music for everyone: the song you picked, else something from the fresh mix
 const startMusic=async()=>{
  let pool=selectedTrack?[selectedTrack]:tracks.slice(0,10);
  if(!pool.length){try{const j=await (await fetch("/api/underground/tracks?page=0&seed="+(1+Math.floor(Math.random()*2e9)))).json();pool=(j.tracks||[]).slice(0,10);}catch{}}
  const pick=pool[Math.floor(Math.random()*pool.length)];
  if(pick)socket.current?.emit("fm:autostart",pick);
 };
 const join=(maybeSocket)=>{
  const activeSocket=maybeSocket?.connected&&typeof maybeSocket.emit==="function"?maybeSocket:socket.current;
  if(!activeSocket?.connected||joining.current)return;
  joining.current=true;wantsRoom.current=true;setMessages([]);setReactions([]);
  const requestedRoom=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("room"):null;
  const code=lastRoom.current?.room||(requestedRoom&&ROOMS[requestedRoom]?requestedRoom:null)||inviteRoom;
  autoPlay.current=true;
  activeSocket.emit("fm:join",{key:tabKey(),...(code?{room:code}:{})},ack=>{joining.current=false;if(ack?.ok){setMe({handle:ack.handle,hue:ack.hue});if(ack.silent)startMusic();}else{wantsRoom.current=false;setNotice("All rooms are full. Try again shortly.");}});
  setTimeout(()=>{joining.current=false;},8000);
 };
 const leave=()=>{
  wantsRoom.current=false;lastRoom.current=null;setInviteRoom(null);setReconnecting(false);SS.set("fm:room",null);
  try{const u=new URL(location.href);u.searchParams.delete("room");history.replaceState(history.state,"",u);}catch{}
  socket.current?.emit("fm:leave");
  listening.current=false;audio.current?.pause();setRoom(null);setIsDj(false);setPlaying(false);setMessages([]);setNotice("");setSelectedTrack(null);setTab("show");
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
   const res=await fetch("/api/underground/tracks?page="+(page+1)+"&seed="+mixSeed.current+(term?"&q="+encodeURIComponent(term):""),{cache:"no-store"});
   if(!res.ok)throw new Error("Could not load more tracks.");
   const payload=await res.json();
   setTracks(old=>{const ids=new Set(old.map(t=>t.id));return [...old,...(payload.tracks||[]).filter(t=>!ids.has(t.id))];});
   setPage(page+1);setHasMore(Boolean(payload.hasMore));
  }catch(e){setNotice(e.message);}finally{setLoadingMore(false);}
 };
 const chooseDiscoverTab=selected=>{setDiscoverTab(selected);setQuery("");setTerm(selected in DISCOVER_TERMS?DISCOVER_TERMS[selected]:selected);};
 const scrollRail=dir=>{const el=rail.current;if(el)el.scrollBy({left:dir*el.clientWidth*.8,behavior:motionOff?"auto":"smooth"});};
 const onRailScroll=e=>{const el=e.currentTarget;if(el.scrollLeft+el.clientWidth>el.scrollWidth-240)loadMore();};
 // Audius streams send CORS headers, so the browser can analyse the real audio and drive the lights with it.
 // createMediaElementSource is once-per-element; afterwards the element always plays through this graph.
 const ensureAnalyser=(a=audio.current)=>{
  if(a&&!sources.current.has(a)&&a.crossOrigin==="anonymous"){
   try{
    const Ctx=window.AudioContext||window.webkitAudioContext,ctx=actx.current||(actx.current=new Ctx());
    if(!analyser.current){const an=ctx.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=.7;an.connect(ctx.destination);analyser.current=an;stage.current?.audio(an);spectrum.current?.audio(an);}
    const src=ctx.createMediaElementSource(a);src.connect(analyser.current);sources.current.set(a,src);
   }catch{}
  }
  actx.current?.resume?.().catch(()=>{});
 };
 const togglePlay=async()=>{
  if(!current||!audio.current)return;
  try{
   if(audio.current.paused){ensureAnalyser();await audio.current.play();setPlaying(true);listening.current=true;}
   else{audio.current.pause();setPlaying(false);listening.current=false;}
  }catch{setNotice("The stream could not play. Try another track or tap play again.");}
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
  setQuery("");setTerm(genre);setDiscoverTab(genre);
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
  <div className="fx-chips" role="group" aria-label="Explore music by mood">{DISCOVER_TABS.map(item=><button type="button" key={item} onClick={()=>chooseDiscoverTab(item)} aria-pressed={item===discoverTab}>{item}</button>)}<button type="button" className="fx-remix" onClick={()=>{rail.current?.scrollTo({left:0});setMixNonce(n=>n+1);}} disabled={loading} aria-label="Shuffle a new mix"><Icon name="pass"/>NEW MIX</button></div>
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
  <span className="fx-orb-body"><OrbVideo kind={m.id} motionOff={motionOff} level={clamp(.55+moodScore(m.id)/100,.55,1)} pulseKey={pulses[m.id]}/><span className="fx-orb-icon"><Icon name={m.id==="energy"?"fire":m.id==="love"?"eq":"snow"}/></span>{voteBusy&&<i key={cooldownKey} className="fx-orb-cooldown"/>}</span>
  <span className="fx-orb-name">{m.core}</span><span className="fx-orb-blurb">{m.blurb}</span>
  <span className="fx-orb-cta">{room?(voteBusy?"Recharging…":m.cta):"Join to react"}</span>
 </button>;
 const reactionBar=<div className="fx-react-bar" role="group" aria-label="Send a reaction">{REACTIONS.map(([kind,emoji])=>{
  const hot=reactions.some(r=>r.kind===kind&&clock-r.at<2200),tap=tapped?.kind===kind?tapped.nonce:0;
  return <button key={kind} type="button" className={hot?"is-hot":""} onClick={()=>{setTapped({kind,nonce:Date.now()});react(kind);}} disabled={!room} aria-label={"React "+kind}>
   <span className="fx-react-emo" key={tap}><Emo code={REACTION_EMOJI[kind]} label={emoji}/></span>
   {tap>0&&<i className="fx-burst" key={"b"+tap} aria-hidden="true">{[0,1,2,3,4,5,6,7].map(n=><em key={n} style={{"--a":n*45+"deg"}}/>)}</i>}
   <b key={"c"+(room?.reactionCounts?.[kind]||0)}>{room?.reactionCounts?.[kind]||0}</b></button>;})}</div>;

 return <div ref={shellRef} className={"fx-shell fx-"+view+" "+oswald.variable} style={vars} data-view={view} data-tab={tab} data-motion={motionOff?"reduced":"full"} data-lights={lightsOff?"off":"on"} data-playing={playing} data-heat={hottest} data-fab={view==="controller"&&Boolean(selectedTrack)}>
  <div ref={photoRef} className="fx-photo" aria-hidden="true"/>
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

  <a className="fx-skip" href="#underground-main">Skip to main content</a>
  <main className="fx-main" id="underground-main">
   <header className="fx-topbar">
    <Link href={"/"+locale} className="fx-brand fx-brand-mobile">ChatSpark<span aria-hidden="true">⚡</span></Link>
    <nav className="fx-pills" aria-label="Site sections"><Link href={"/"+locale}>EXPLORE</Link><Link className="is-active" href={"/"+locale+"/underground"} aria-current="page">UNDERGROUND FM</Link><Link href={"/"+locale+"/poem-wall"}>COMMUNITY</Link></nav>
    <button type="button" className="fx-fx-toggle fx-lights-toggle" onClick={()=>setLightsOff(v=>!v)} aria-pressed={lightsOff} title={lightsOff?"Turn the light show back on for you":"Turn the light show off just for you"}>{lightsOff?"LIGHTS ON":"LIGHTS OFF"}</button>
    <button type="button" className="fx-fx-toggle" onClick={toggleMotion} aria-pressed={motionOff}>{motionOff?"ENABLE FX":<><span className="fx-long">REDUCE </span>MOTION</>}</button>
   </header>

   <section className="fx-hero" data-pane="show">
    <div className="fx-hero-copy">
     <div className="fx-live-row"><span className={"fx-live "+(room?"on":"")+(reconnecting?" is-reconnecting":"")}><i/>{reconnecting?"RECONNECTING…":room?"LIVE":"OFFLINE"}</span><span>{fmtListeners(room?.listeners)} LISTENERS</span><span className="fx-dim">{room?"ROOM · "+room.room:"OPEN FREQUENCY"} · {heroGenre} · Global</span></div>
     <h1>{roomName}</h1>
     <p>{roomTagline}</p>
     <div className="fx-genres" role="group" aria-label="Discover by genre">{GENRES.map(genre=><button type="button" key={genre} aria-pressed={heroGenre===genre} onClick={()=>selectGenre(genre)}>{genre}</button>)}</div>
    </div>
    <div className={"fx-ctrl-card fx-ctrl-card-"+view}>
     {view==="controller"&&<><span className="fx-ctrl-kicker"><Icon name="crown"/>YOU ARE THE CONTROLLER</span><p>Pick the music, set the energy and shape the night for everyone in the room.</p><small>{turnLeft!==null?"AUX ROTATES IN "+clockFmt(turnLeft):"THE AUX CHANGES HANDS"}</small><div className="fx-card-btns"><button type="button" className="fx-invite" onClick={invite}><Icon name="send"/>INVITE</button><button type="button" className="fx-leave" onClick={leave}>LEAVE ROOM</button></div></>}
     {view==="listener"&&<><span className="fx-ctrl-kicker"><Icon name="crown"/>CURRENT CONTROLLER</span><div className="fx-ctrl-who"><Avatar hue={room.djHue} label={room.djHandle} size="lg"/><strong>{room.djHold?"Reconnecting…":room.djHandle||"a stranger"}</strong></div><p>{room.djHold?"The controller is coming back. The music keeps playing.":"Controlling the vibe right now."}</p><small>{turnLeft!==null?"ROTATES IN "+clockFmt(turnLeft):"THE AUX CHANGES HANDS"}</small><div className="fx-card-btns"><button type="button" className="fx-invite" onClick={invite}><Icon name="send"/>INVITE</button><button type="button" className="fx-leave" onClick={leave}>LEAVE ROOM</button></div></>}
     {view==="discover"&&<><span className="fx-ctrl-kicker"><Icon name="headphones"/>PICK A TRACK. FIND YOUR PEOPLE.</span><p>{inviteRoom?"You were invited to "+ROOMS[inviteRoom][0]+". Join the same room, same song, same lights.":"You join the live music room automatically. Find a stranger, take the aux, and light up the night."}</p>{wantsRoom.current?<span className="fx-join" role="status">TUNING IN TO YOUR ROOM…</span>:<button type="button" className="fx-join" onClick={()=>join()} disabled={!connected}>{connected?"↻ RETRY ROOM CONNECTION":"CONNECTING TO THE ROOM…"}</button>}</>}
    </div>
   </section>

   <div className="fx-grid">
    <section className="fx-panel fx-now" data-pane="show" aria-label="Now playing">
     <header className="fx-panel-head"><h2>Now Playing</h2><span className="fx-dim">{room?"SHARED RADIO":preview?"SOLO PREVIEW":"WAITING FOR A SIGNAL"}</span></header>
     <div className="fx-now-body">
      <div className="fx-cover" data-playing={playing}>{current?.artwork?<img src={current.artwork} alt={current.title+" cover art"} referrerPolicy="no-referrer" onError={hideBroken}/>:<span className="fx-record"><i/></span>}<em/></div>
      <div className="fx-song">
       <div className="fx-song-head"><div><h3 title={current?.title}>{current?.title||"Your next discovery."}</h3><p>{current?.artist||"Select a track. Let the night unfold."}</p></div>
        <div className="fx-song-tools"><button type="button" className={"fx-icon-btn"+(liked?" is-on":"")} onClick={()=>setLiked(v=>!v)} aria-pressed={liked} aria-label={liked?"Remove like":"Like this track"} disabled={!current}><Icon name="heart"/></button></div></div>
       {(()=>{
        if(mapping&&cueSheet?.id!==current?.id)return <div className="fx-cue fx-cue-wait"><i/>Mapping the song for the light show…</div>;
        if(!cueSheet||cueSheet.id!==current?.id)return null;
        const st=songClock();if(st==null)return null;
        let sec=cueSheet.sections[0];for(const x of cueSheet.sections)if(x.t<=st)sec=x;
        const next=cueSheet.drops.find(d=>d>st),soon=next!=null&&next-st<=30&&autoShow;
        const label={intro:"Intro",groove:"In the groove",build:"Building up",drop:"The drop",break:"Breakdown",outro:"Outro"}[sec?.k]||"Live";
        return <div className={"fx-cue fx-cue-"+(soon?"soon":sec?.k||"groove")} aria-live="off"><i/>{soon?<b>DROP IN {clockFmt(next-st)}</b>:<b>{label}</b>}<span>{Math.round(cueSheet.bpm)} BPM{autoShow?" · AUTO SHOW":""}</span></div>;
       })()}
       <div className="fx-tags"><span>{current?.genre||"Underground"}</span><span>{room?"Live broadcast":"Discover"}</span><span>{theme.name}</span></div>
       <canvas ref={specCv} className="fx-wave" aria-hidden="true"/>
       <div className="fx-progress"><div className="fx-progress-track"><span style={{width:current&&duration?clamp(time/duration*100,0,100)+"%":room?.track?clamp((time%180)/180*100,0,100)+"%":"0%"}}/></div><small>{clockFmt(time)} {duration?"/ "+clockFmt(duration):current?"/ LIVE":"/ 0:00"}</small></div>
       <div className="fx-player"><button type="button" onClick={togglePlay} disabled={!current} className="fx-play" aria-label={playing?"Pause audio":"Play audio"}><Icon name={playing?"pause":"play"}/></button><span className="fx-player-hint">Tap to {playing?"pause":"listen"} on this device</span>
        <label className="fx-volume"><Icon name="volume"/><input type="range" min="0" max="100" value={volume} onChange={e=>{const value=Number(e.target.value);setVolume(value);volRef.current=value/100;if(!fadeJob.current)for(const d of [deckA.current,deckB.current])if(d)d.volume=value/100;}} aria-label="Volume"/><output>{volume}%</output></label></div>
      </div>
     </div>
     {[deckA,deckB].map((deck,n)=><audio key={n} ref={el=>{deck.current=el;if(n===0&&!audio.current)audio.current=el;}} className={"fx-deck-"+(n?"b":"a")} preload="none" crossOrigin="anonymous"
      onPlay={e=>{if(e.currentTarget!==audio.current)return;setPlaying(true);listening.current=true;}}
      onPause={e=>{if(e.currentTarget===audio.current)setPlaying(false);}}
      onTimeUpdate={e=>{
       // with nothing queued, the controller's device picks the next song from the crates in time to mix into it
       const el=e.currentTarget;if(el!==audio.current||!isDj||!room||!current||room.track?.id!==current.id||queue.length)return;
       if(el.duration>CROSSFADE_MS*3/1000&&el.duration-el.currentTime<CROSSFADE_MS/1000+1&&earlyNext.current!==current.id){earlyNext.current=current.id;nextTrack();}
      }}
      onEnded={e=>{if(e.currentTarget!==audio.current)return;setPlaying(false);const id=current?.id;if(!room||!id)return;
       // the server starts the next queued song for everyone; only an empty queue falls back to the controller's library
       socket.current?.emit("fm:ended",{id},ack=>{if(!ack?.advanced&&isDj&&!room.queue?.length)nextTrack();});}}
      onError={e=>{const el=e.currentTarget;if(el!==audio.current||!el.getAttribute("src"))return;if(el.crossOrigin&&!sources.current.has(el)){el.removeAttribute("crossorigin");el.dataset.nocors="1";el.load();return;}setNotice("Track unavailable for external Audius streaming.");}}/>)}
    </section>

    <section className={"fx-panel fx-reactor fx-reactor-"+hottest} data-pane="show" aria-label={room?"Room heat, "+heatScore+" percent":"Room heat, waiting for listeners"}>
     <header className="fx-panel-head"><h2>Room Reactor</h2><span className="fx-dim">Collective energy from everyone in the room</span></header>
     <div className="fx-reactor-body">
      <div className="fx-heat" role="img" aria-label={"Room vibe "+(room?heatScore+"%":"waiting")}><OrbVideo kind="room" motionOff={motionOff} level={room?.45+heatScore/110:.45} pulseKey={pulses.energy+pulses.love+pulses.chill}/><div className="fx-heat-core"><strong>{room?heatScore:"—"}<small>{room?"%":""}</small></strong><span>ROOM VIBE</span><em>{room?status:"WAITING FOR THE CROWD"}</em></div></div>
      <div className="fx-mini-orbs">{MOOD_SCENES.map(m=><button type="button" key={m.id} className={"fx-mini-orb fx-mini-"+m.id} disabled={!room||voteBusy} onClick={()=>castMood(m.id)} aria-label={"Vote "+m.title+": "+m.short}>
       <span className="fx-mini-body"><OrbVideo kind={m.id} small motionOff={motionOff} level={clamp(.5+moodScore(m.id)/100,.5,1)} pulseKey={pulses[m.id]}/></span>
       <b>{moodScore(m.id)}%</b><strong>{m.title}</strong><small>{m.core}</small></button>)}</div>
      <p className="fx-reactor-foot"><i className={room?"on":""}/>{room?moodTotal+" room votes · heat settles back to 50%":"Join a room to light it up"}</p>
     </div>
    </section>

    {view==="controller"&&<div className="fx-mobile-only" data-pane="show">{controllerActions}</div>}


    <RoomChat socket={socket} room={room} me={me} messages={messages} queue={queue} current={current} reactions={reactions} clock={clock} reactionBar={reactionBar} tab={tab} onNotice={setNotice}/>

    {view!=="listener"&&library}

    {view==="controller"&&<div className="fx-row fx-row-controller">
     <section className="fx-panel fx-lights" data-pane="vibe" aria-label="Light mode">
      <header className="fx-panel-head"><h2>Light Mode</h2><span className="fx-dim">{autoShow?"Auto show follows the song · scenes set colour + groove":"Manual: your scene runs as is"}</span><button type="button" className={"fx-auto"+(autoShow?" is-on":"")} aria-pressed={autoShow} onClick={()=>styleChange({auto:!autoShow})}><i/>AUTO SHOW</button><button type="button" className="fx-link" onClick={()=>styleChange({theme:"infrared",fx:"sweep",intensity:2})}>Reset</button></header>
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
      <div className="fx-react-cloud" aria-hidden="true">{reactions.filter(r=>clock-r.at<2900).map(r=><span key={r.id} style={floatStyle(r.id)}><Emo code={REACTION_EMOJI[r.kind]||REACTION_EMOJI.spark}/></span>)}</div>
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
   <footer className="fx-legal"><span>18+ only</span><Link href="/en/privacy">Privacy</Link><Link href="/en/cookies">Cookies</Link><Link href="/en/terms">Terms</Link><Link href={"/"+locale+"/safety"}>Safety</Link></footer>
  </main>

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
