"use client";
// Underground FM room chat: messenger-style bubbles, neon emoji, typing, reactions floating up, and an emoji picker.
import {useEffect,useRef,useState} from "react";
import {EMOJI,REACTION_EMOJI,splitEmoji,jumboCount} from "@/lib/emoji";
import {Icon,Avatar,Emo,Art,floatStyle} from "./parts";
import ReportDialog from "../ReportDialog";

const MAX_CHAT=280;
// consecutive messages from one person within two minutes form a group, like a messenger
const sameRun=(a,b)=>a&&b&&a.from!=="SYSTEM"&&b.from!=="SYSTEM"&&a.from!=="REQUEST"&&b.from!=="REQUEST"&&a.handle===b.handle&&Math.abs(b.at-a.at)<120000;
const REPORT_TEXT={reportTitle:"Report this person",reportWhy:"What's wrong?",reportNote:"Anything else? (optional)",cancel:"Cancel",reportSend:"Send report",
 reasons:{underage:"They seem to be under 18",sexual_content:"Sexual content",harassment:"Harassment or hate",spam:"Spam or scams",other:"Something else"}};
const chatTime=at=>new Date(at).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});

export default function RoomChat({socket,room,me,messages,queue,current,reactions,clock,reactionBar,tab,onNotice}){
 const [draft,setDraft]=useState(""),[menu,setMenu]=useState(null),[muted,setMuted]=useState([]),[reporting,setReporting]=useState(null),[picker,setPicker]=useState(false),[unread,setUnread]=useState(0),[typing,setTyping]=useState({});
 const list=useRef(null),draftRef=useRef(null),lastTypingAt=useRef(0),seen=useRef(0);

 // who is typing: shown for 3.5 s after their last ping, cleared as soon as their message lands
 useEffect(()=>{
  const s=socket.current;if(!s)return;
  const onTyping=who=>{if(typeof who?.handle==="string")setTyping(t=>({...t,[who.handle]:Date.now()+3500}));};
  s.on("fm:typing",onTyping);return ()=>s.off("fm:typing",onTyping);
 },[socket.current,room?.room]);
 useEffect(()=>{
  const newest=messages[messages.length-1];
  if(newest?.handle)setTyping(t=>{if(!t[newest.handle])return t;const n={...t};delete n[newest.handle];return n;});
 },[messages]);
 // follow the conversation only when the reader is already at the bottom (or wrote the message)
 useEffect(()=>{
  const el=list.current,added=messages.length-seen.current;seen.current=messages.length;
  if(!el)return;
  const newest=messages[messages.length-1],mine=newest&&me&&newest.handle===me.handle;
  if(added<=0||mine||el.scrollHeight-el.scrollTop-el.clientHeight<160){el.scrollTop=el.scrollHeight;setUnread(0);}
  else setUnread(n=>n+added);
 },[messages,tab]);
 useEffect(()=>{
  if(!picker)return;
  const close=e=>{if(!e.target.closest?.(".fx-emo-picker,.fx-emo-toggle"))setPicker(false);};
  document.addEventListener("pointerdown",close);return ()=>document.removeEventListener("pointerdown",close);
 },[picker]);

 const nearBottom=()=>{const el=list.current;return !el||el.scrollHeight-el.scrollTop-el.clientHeight<80;};
 const scrollDown=()=>{const el=list.current;if(!el)return;el.scrollTo({top:el.scrollHeight,behavior:"smooth"});setUnread(0);};
 const typingPing=()=>{const now=Date.now();if(!room||now-lastTypingAt.current<2000)return;lastTypingAt.current=now;socket.current?.emit("fm:typing");};
 const addEmoji=char=>{
  const el=draftRef.current,at=el?.selectionStart??draft.length,end=el?.selectionEnd??at,next=(draft.slice(0,at)+char+draft.slice(end)).slice(0,MAX_CHAT);
  setDraft(next);typingPing();
  requestAnimationFrame(()=>{if(!el)return;el.focus();const c=Math.min(next.length,at+char.length);el.setSelectionRange(c,c);});
 };
 // muting only hides someone on this device; reporting sends their recent lines to moderation
 const mute=handle=>{setMuted(m=>m.includes(handle)?m:[...m,handle]);setMenu(null);onNotice(handle+" is muted for you.");};
 const sendReport=(reason,note)=>{
  const handle=reporting;setReporting(null);
  socket.current?.emit("fm:report",{handle,reason,note},ack=>onNotice(ack?.ok?"Thanks. The report was sent to moderation.":ack?.error==="cooldown"?"Please wait a moment before sending another report.":"The report couldn't be sent."));
 };
 const submit=()=>{
  const text=draft.trim();if(!text||!room)return;
  socket.current?.emit("fm:chat",text,ack=>{
   if(ack?.ok){setDraft("");setPicker(false);}
   else onNotice(ack?.error==="cooldown"?"You're sending messages too quickly.":ack?.error==="links"?"Links aren't allowed in room chat.":"Message couldn't be delivered.");
  });
 };

 const typingNames=Object.entries(typing).filter(([,until])=>until>clock).map(([h])=>h);
 const next=queue[0]?.track||current;
 const shown=muted.length?messages.filter(m=>m.from==="SYSTEM"||!muted.includes(m.handle)):messages;
 const rows=shown.map((msg,i)=>{
  const key=msg.at+"-"+i;
  if(msg.from==="SYSTEM")return <p className="fx-msg-system" key={key}><span>{msg.text}</span></p>;
  if(msg.from==="REQUEST"){const m=/^🎵 Track requested: (.*)$/.exec(msg.text||"");return <div className="fx-msg-req" key={key}><Icon name="note"/><span><small>{msg.handle||"stranger"} requested</small><b>{m?m[1]:msg.text}</b></span><time>{chatTime(msg.at)}</time></div>;}
  const mine=Boolean(me&&msg.handle===me.handle),first=!sameRun(shown[i-1],msg),last=!sameRun(msg,shown[i+1]),dj=msg.from==="DJ";
  const parts=splitEmoji(msg.text||""),jumbo=jumboCount(parts);
  return <div className={"fx-msg"+(mine?" is-me":"")+(dj?" is-dj":"")+(first?" is-first":"")+(last?" is-last":"")+(jumbo?" is-jumbo":"")} key={key} style={{"--h":msg.hue??200}}>
   {!mine&&(last?<Avatar hue={msg.hue??200} label={msg.handle||"?"} crown={dj}/>:<span className="fx-avatar-gap" aria-hidden="true"/>)}
   <div className="fx-msg-body">
    {first&&!mine&&<header><b>{msg.handle||"stranger"}</b>{dj&&<em>CONTROLLER</em>}{msg.handle&&<button type="button" className="fx-msg-more" aria-label={"Options for "+msg.handle} aria-expanded={menu===key} onClick={()=>setMenu(m=>m===key?null:key)}>•••</button>}
     {menu===key&&<span className="fx-msg-menu" role="menu"><button type="button" role="menuitem" onClick={()=>mute(msg.handle)}>Mute</button><button type="button" role="menuitem" onClick={()=>{setMenu(null);setReporting(msg.handle);}}>Report</button></span>}</header>}
    <p>{parts.map((part,j)=>typeof part==="string"?part:<Emo key={j} code={part.code} label={part.char}/>)}</p>
    {last&&<time>{mine?"You · ":""}{chatTime(msg.at)}</time>}
   </div>
  </div>;
 });

 return <aside className="fx-panel fx-chat" data-pane="chat" aria-label="Room chat"><div className="fx-chat-inner">
  <header className="fx-panel-head fx-chat-head">
   <div><h2>Room Chat</h2><span className="fx-chat-live"><i className={room?"on":""}/>{room?(room.listeners||0)+" here":"offline"}</span></div>
   {room?.people?.length>0&&<div className="fx-chat-people" aria-hidden="true">{room.people.slice(0,5).map((p,i)=><Avatar key={p.handle+i} hue={p.hue} label={p.handle} crown={p.dj}/>)}{room.people.length>5&&<span className="fx-chat-more">+{room.people.length-5}</span>}</div>}
  </header>
  {muted.length>0&&<p className="fx-muted">Muted: {muted.map(h=><button type="button" key={h} onClick={()=>setMuted(m=>m.filter(x=>x!==h))} aria-label={"Unmute "+h}>{h} ✕</button>)}</p>}
  {room&&next&&<div className="fx-chat-next"><Art track={next}/><span><small>{queue[0]?"UP NEXT":"NOW PLAYING"}</small><b>{next.title}</b></span><em>{queue[0]?(queue.length>1?"+"+(queue.length-1)+" more":"autoplays"):""}</em></div>}
  <div className="fx-messages" ref={list} onScroll={()=>{if(nearBottom())setUnread(0);}} role="log" aria-live="polite" aria-label="Room conversation">{messages.length?rows:<div className="fx-empty-chat"><span aria-hidden="true">👋</span><strong>Every good night starts with a hello.</strong><p>{room?"Be the first to say hello. Everyone in this room can chat.":"Enter a room to meet the people behind the music."}</p></div>}</div>
  {unread>0&&<button type="button" className="fx-chat-jump" onClick={scrollDown}><Icon name="down"/>{unread} new message{unread>1?"s":""}</button>}
  <div className="fx-float" aria-hidden="true">{reactions.filter(r=>clock-r.at<2600).map(r=><span key={r.id} style={floatStyle(r.id)}><Emo code={REACTION_EMOJI[r.kind]||REACTION_EMOJI.spark}/>{r.handle&&<small>{r.handle}</small>}</span>)}</div>
  <div className="fx-typing" aria-live="polite">{typingNames.length>0&&<><span className="fx-dots" aria-hidden="true"><i/><i/><i/></span>{typingNames.length>2?"Several people are typing":typingNames.join(" and ")+(typingNames.length>1?" are":" is")+" typing"}</>}</div>
  {reactionBar}
  <form onSubmit={e=>{e.preventDefault();submit();}} className="fx-compose">
   <button type="button" className="fx-emo-toggle" onClick={()=>setPicker(v=>!v)} disabled={!room} aria-expanded={picker} aria-label="Add an emoji"><Emo code="love" label=""/></button>
   {picker&&room&&<div className="fx-emo-picker" role="dialog" aria-label="Emoji" onKeyDown={e=>{if(e.key==="Escape"){setPicker(false);draftRef.current?.focus();}}}>
    {EMOJI.map(([char,code,name],i)=><button type="button" key={code} onClick={()=>addEmoji(char)} aria-label={name} title={name} style={{"--i":i}}><Emo code={code} label=""/></button>)}
   </div>}
   <input ref={draftRef} value={draft} onChange={e=>{setDraft(e.target.value);typingPing();}} maxLength={MAX_CHAT} disabled={!room} aria-label="Message the room" placeholder={room?"Message the room…":"Join a room to chat"}/>{draft.length>200&&<small className="fx-count">{MAX_CHAT-draft.length}</small>}<button disabled={!room||!draft.trim()} type="submit" aria-label="Send message"><Icon name="send"/></button></form>
  <p className="fx-chat-foot">Temporary room chat. No recordings or profiles. Be kind. Use ••• on a message to mute or report.</p>
  <ReportDialog t={REPORT_TEXT} open={Boolean(reporting)} onClose={()=>setReporting(null)} onSubmit={sendReport}/>
 </div></aside>;
}
