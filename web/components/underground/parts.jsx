"use client";
// Underground FM: small presentational pieces shared by the stage, the panels and the chat.
import {useEffect,useRef,useState} from "react";
import {emojiSrc} from "@/lib/emoji";

export const hideBroken=e=>{e.currentTarget.style.display="none";};

export function Icon({name}){
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

export function Avatar({hue=200,label="?",crown=false,size=""}){
 return <span className={"fx-avatar "+size} style={{"--h":hue}} aria-hidden="true">{crown?<Icon name="crown"/>:String(label).charAt(0).toUpperCase()}</span>;
}

// a neon emoji; CSS flickers it on and lets the glow breathe (none of that when motion is reduced)
export function Emo({code,label="",className=""}){
 return <img className={"fx-emo "+className} src={emojiSrc(code)} alt={label} draggable={false} decoding="async"/>;
}

export function Art({track,className=""}){
 return <span className={"fx-art "+className}>{track?.artwork?<img src={track.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={hideBroken}/>:<Icon name="note"/>}</span>;
}

// Energy-globe loops (web/public/underground/orbs). Black backgrounds drop out with mix-blend-mode:screen,
// so nothing between the video and its panel may create an isolated group (no transform/opacity/filter on ancestors).
const ORB_VIDEO={energy:"fire",love:"vibe",chill:"chill",room:"room"};
// Sparks orbiting each globe on a tilted ellipse: fixed angles/radii/speeds so server and client render the same.
const SPARKS=Array.from({length:12},(_,i)=>({"--a":(i*137)%360+"deg","--r":(39+(i*7)%9)+"%","--d":(5+(i*3)%6)+"s","--t":(-(i*.83)).toFixed(2)+"s","--s":(i%3?3:5)+"px","--k":i%2?"var(--g1)":"var(--g2)"}));
export function OrbVideo({kind,motionOff,level=.8,pulseKey=0,small=false}){
 const ref=useRef(null),[flare,setFlare]=useState(0),name=ORB_VIDEO[kind];
 useEffect(()=>{
  const v=ref.current;if(!v)return;
  v.muted=true;
  if(motionOff){v.pause();return;}
  const io=new IntersectionObserver(([e])=>{if(e.isIntersecting)v.play().catch(()=>{});else v.pause();});
  io.observe(v);return ()=>io.disconnect();
 },[motionOff]);
 useEffect(()=>{if(pulseKey)setFlare(n=>n+1);},[pulseKey]);
 return <span className={"fx-orb-video fx-orb-video-"+name} style={{"--lvl":level}} aria-hidden="true">
  <i className="fx-aura"/><i className="fx-floor"/>
  <video ref={ref} src={"/underground/orbs/"+name+"-"+(small?320:480)+".mp4"} poster={"/underground/orbs/"+name+"-poster.jpg"} muted loop playsInline preload="auto" disablePictureInPicture/>
  <i className="fx-corona"/><i className="fx-corona fx-corona-b"/>
  <span className="fx-sparks">{SPARKS.slice(0,small?6:12).map((p,i)=><i key={i} style={p}/>)}</span>
  {flare>0&&!motionOff&&<i key={flare} className="fx-orb-flare"/>}
 </span>;
}

// A reaction drifts up from a spot and on a sway that both come from its id, so every client draws the same path.
export const floatStyle=id=>{const n=Math.floor(id*1e6);return {"--x":(n%72)+"%","--dx":((n>>3)%60-30)+"px","--r":((n>>5)%40-20)+"deg","--s":(.85+(n>>7)%5/10).toFixed(2),"--d":(2.2+(n>>9)%6/10).toFixed(2)+"s"};};
