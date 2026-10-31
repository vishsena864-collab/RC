"use client";
import {useState} from "react";
import Link from "next/link";
import WallGallery from "./WallGallery";
import CreativeArena from "./CreativeArena";
import {postWall} from "@/lib/walls";
import "./walls.css";

export default function PoemWall({locale="en"}){
 const [title,setTitle]=useState(""),[body,setBody]=useState(""),[tag,setTag]=useState(""),[allowed,setAllowed]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[refresh,setRefresh]=useState(0),[latest,setLatest]=useState(null);
 const submit=async(e)=>{
  e.preventDefault();if(busy||!allowed)return;
  setBusy(true);setMessage("");
  try{
    const res=await postWall({kind:"poem",title,body,author_tag:tag||"UNKNOWN",ageConfirmed:true});
    setLatest(res.entry);setMessage("Your poem is now on this week's wall. Readers can vote for it.");
    setTitle("");setBody("");setRefresh(x=>x+1);
  }catch(e){setMessage(e.message);}finally{setBusy(false);}
 };
 return <div className="walls-shell poem-shell">
  <div className="walls-topline"><span>CHATSPARK / SIDE FEATURE 002</span><Link href={"/"+locale}>↖ BACK TO RANDOM CHAT</Link></div>
  <section className="walls-hero poem-hero">
    <div className="walls-hero-overline">A QUIET CORNER OF THE INTERNET / NO FOLLOWERS / NO PROFILE</div>
    <div className="poem-intro"><div><h1><span className="walls-seo-kicker">Online poetry writing challenge</span>WORDS FROM<br/><em>NOBODY.</em></h1><p>Write a poem without an account, join a seven-minute challenge with a surprise topic, or share your words on the weekly wall. The room's participants vote for challenge entries.</p><a href="#creative-arena" className="walls-action-link">★ LIVE 7-MINUTE BATTLES ↘</a><a href="#write" className="walls-action-link">WRITE YOUR POEM ↘</a></div><div className="poem-art" aria-hidden="true"><span className="poem-giant-quote">“</span><span>UNTOLD<br/>STORIES<br/>BY STRANGERS</span><span className="poem-outline">001 / THE POEM WALL</span></div></div>
  </section>
  <div className="walls-ribbon">✳ WRITE ANONYMOUSLY &nbsp; · &nbsp; ♥ VOTE FOR YOUR FAVORITES &nbsp; · &nbsp; ★ ONLY THE TOP FIVE ARE KEPT &nbsp; · &nbsp; ✳ A NEW WALL EVERY MONDAY</div>
  <section id="write" className="poem-create">
   <div className="poem-aside"><span className="walls-eyebrow">01 / LEAVE SOMETHING REAL</span><h2>Tell the wall what you can't tell the world.</h2><p>Poetry in any language. Sinhala, English, Tamil, or just a sentence that means something. No account needed.</p><div className="poem-side-stamp">WHAT SURVIVES<br/>IS WHAT STRANGERS<br/><strong>CHOOSE TO KEEP.</strong></div></div>
   <form onSubmit={submit} className="poem-editor">
    <div className="poem-field-label">TITLE <span>MAX 80 CHARACTERS</span></div><input maxLength={80} required minLength={3} placeholder="A title for your poem" value={title} onChange={e=>setTitle(e.target.value)}/>
    <div className="poem-field-label">YOUR WORDS <span>{body.length}/1400</span></div>
    <textarea maxLength={1400} minLength={8} required rows={9} value={body} onChange={e=>setBody(e.target.value)} placeholder={"The streetlights stay awake\nlong after we go home…"}/>
    <div className="poem-field-label">ANONYMOUS SIGNATURE <span>OPTIONAL</span></div><input maxLength={24} value={tag} onChange={e=>setTag(e.target.value)} placeholder="Someone, somewhere"/>
    <label className="walls-consent"><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)}/><span>I'm 18 or older and I created this poem. I agree to its public display and weekly competition.</span></label>
    <button type="submit" className="walls-submit" disabled={busy||!allowed||body.trim().length<8||title.trim().length<3}>{busy?"PRESSING INK…":"PUBLISH TO THIS WEEK'S WALL ↗"}</button>
    <p className="walls-form-note">Only five highest-ranked poems are archived per weekly round. All other entries are erased. Reports can remove abusive submissions.</p>
    {message&&<div className="walls-feedback" role="status">{message}</div>}
    {latest&&<div className="walls-published">✓ SUBMITTED / ID {latest.id.slice(0,8).toUpperCase()}</div>}
   </form>
  </section>
  <CreativeArena kind="poem" draft={{title,body,author_tag:tag||"UNKNOWN"}} allowed={allowed}/>
  <WallGallery kind="poem" refreshKey={refresh}/>
  <div className="walls-endline"><span>ANONYMOUS WORDS / HUMAN CONNECTIONS</span><Link href={"/"+locale+"/graffiti-wall"}>NEXT UP: GRAFFITI WALL ↗</Link></div>
 </div>;
}
