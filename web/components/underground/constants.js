// Underground FM: shared constants and small helpers.

// Real venue photography (web/public/underground). The stage photo is tinted to the controller's light colour.
export const CROWD="url(/underground/crowd-1200.webp)";

export const THEMES=[
 {id:"acid",name:"Acid Lime",a:"#ddff73",b:"#80ffb1",dark:"#1c3221",hue:95},
 {id:"infrared",name:"Infrared Red",a:"#ff625c",b:"#ffb467",dark:"#381d29",hue:0},
 {id:"ultraviolet",name:"Ultraviolet",a:"#cf7cff",b:"#ff70cf",dark:"#251738",hue:290},
 {id:"ocean",name:"Ocean Cyan",a:"#2de5ee",b:"#72aaff",dark:"#122837",hue:185},
 {id:"gold",name:"Solar Gold",a:"#ffe77a",b:"#ff9c55",dark:"#362819",hue:35},
 {id:"rose",name:"Velvet Pulse",a:"#ff84c8",b:"#ffb9a5",dark:"#36202c",hue:330},
 {id:"midnight",name:"Midnight Tunnel",a:"#83a5ff",b:"#75d0ff",dark:"#111b34",hue:225},
 {id:"toxic",name:"Neon Riot",a:"#9cff2d",b:"#fe52b8",dark:"#2c1536",hue:100}
];
export const FX=[["march","Marching lasers"],["pulse","Pulse"],["sweep","Wave sweep"],["crossfire","Crossfire"],["tunnel","Tunnel"],["bloom","Soft bloom"],["drift","Drift"],["cone","Laser tunnel"],["matrix","Beam matrix"],["chase","LED chase"],["follow","Follow spots"]];
export const MOODS=["energy","love","chill"];
export const MOOD_SCENES=[
 {id:"energy",title:"FIRE",core:"Ignition Core",blurb:"Add energy and intensity to the room.",cta:"Fire It Up",short:"Push the room further"},
 {id:"love",title:"VIBE",core:"Vibe Pulse",blurb:"Keep the current energy going strong.",cta:"Keep the Vibe",short:"Keep this energy alive"},
 {id:"chill",title:"CHILL",core:"Cool Drift",blurb:"Bring the energy down and mellow it out.",cta:"Chill It Down",short:"Ease into the afterhours"}
];
export const REACTIONS=[["heart","❤️"],["fire","🔥"],["party","🎉"],["hands","🙌"]];
export const ROOMS={
 STATIC:["Static Lounge","Signals from nowhere, tuned in."],
 MIDNIGHT:["The Midnight Lobby","Late night music for random souls."],
 BASEMENT:["The Basement","Low ceilings. Loud ideas."],
 ECHO:["Echo Chamber","Say it once. Hear it everywhere."],
 FREQUENCY:["Frequency Hall","One signal. Everyone tuned in."],
 AFTERHOURS:["Afterhours Club","The night doesn't end here."]
};
export const SCENES=[
 {id:"supernova",name:"Supernova",subtitle:"High Energy",theme:"infrared",fx:"crossfire",intensity:3,moment:"drop"},
 {id:"spectral",name:"Spectral Shift",subtitle:"Euphoric",theme:"ultraviolet",fx:"sweep",intensity:2,moment:"flip"},
 {id:"ion",name:"Ion Storm",subtitle:"Raw Energy",theme:"ocean",fx:"march",intensity:3,moment:"storm"},
 {id:"blackout",name:"Blackout / Reveal",subtitle:"Dramatic",theme:"midnight",fx:"tunnel",intensity:1,moment:"fade"},
 {id:"dreamscape",name:"Dreamscape",subtitle:"Deep & Hypnotic",theme:"rose",fx:"drift",intensity:2,moment:"fade"},
 {id:"tunnel",name:"Laser Tunnel",subtitle:"Hypnotic",theme:"toxic",fx:"cone",intensity:3,moment:"flip"},
 {id:"matrix",name:"Beam Matrix",subtitle:"Precision",theme:"ocean",fx:"matrix",intensity:3,moment:"drop"},
 {id:"chase",name:"Strobe Wall",subtitle:"Relentless",theme:"infrared",fx:"chase",intensity:3,moment:"storm"},
 {id:"follow",name:"Follow Spot",subtitle:"Spotlight",theme:"gold",fx:"follow",intensity:2,moment:"fade"}
];
export const MOMENTS=[["drop","Drop"],["flip","Color shift"],["storm","Ion storm"],["fade","Blackout"]];
export const CROSSFADE_MS=8000; // keep in step with the server's crossfadeMs
// every tab is a fresh mix: "For You" from all of Audius, the rest from that genre family (see lib/mix.js)
export const DISCOVER_TABS=["For You","Electronic","House","Techno","Hip-Hop","Bass","Chill","Pop","Indie"];
export const DISCOVER_TERMS={"For You":""};
export const GENRES=["Electronic","House","Techno","Hip-Hop","Bass","Chill","Pop","Indie"];
export const LIGHT_DEFAULTS={theme:"infrared",fx:"sweep",intensity:2,beatBpm:116,showMoment:null};
export const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
export const clockFmt=seconds=>!Number.isFinite(seconds)?"0:00":Math.floor(Math.max(0,seconds)/60)+":"+String(Math.floor(Math.max(0,seconds)%60)).padStart(2,"0");
export const fmtListeners=n=>Number(n||0).toLocaleString("en-US");
// Per-tab memory (sessionStorage survives a refresh, not a closed tab): which room we're in, and a key that lets
// a refreshing controller reclaim the aux. Storage can be blocked, so every access is guarded.
export const SS={get(k){try{return JSON.parse(sessionStorage.getItem(k));}catch{return null;}},set(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,JSON.stringify(v));}catch{}}};
export const tabKey=()=>{let k=SS.get("fm:key");if(typeof k!=="string"||!/^[a-z0-9]{12}$/.test(k)){k=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>(b%36).toString(36)).join("");SS.set("fm:key",k);}return k;};
