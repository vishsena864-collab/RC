// Server-authoritative, anonymous seven-minute creative battles.
// Ten rooms per wall, up to ten people in each. No artwork is stored on disk.
import { randomInt, randomUUID } from "node:crypto";

export const ARENA_ROOMS = 10;
export const ARENA_CAPACITY = 10;
export const ARENA_CREATE_MS = 7 * 60_000;
export const ARENA_VOTE_MS = 60_000;
export const ARENA_RESULTS_MS = 15_000;

const PROMPTS = {
  poem: [
    "The message you never sent", "A stranger at the last bus stop",
    "When the city forgets your name", "A little hope at 3 AM",
    "The sound of an empty train", "The moon owes me an apology",
    "Seven minutes before sunrise", "The words written on a ticket",
    "A conversation with your younger self", "A borrowed umbrella",
    "A goodbye without a destination", "The streetlight that stayed awake",
    "Love in a city of strangers", "The moment nobody photographed",
    "A secret hidden in the rain", "An unfinished letter",
    "The person behind the window", "A dream with no return address"
  ],
  graffiti: [
    "Beautiful chaos", "The city after midnight", "Tomorrow is ours",
    "A neon creature", "No signal, all feeling", "A wall that can speak",
    "The last arcade on Earth", "Rebel in full colour",
    "The future has no rules", "Lost in the underground",
    "Electric heartbreak", "Paint a sound", "Outsiders only",
    "A dream made of spray paint", "The night belongs to us",
    "What freedom looks like", "The monster under the disco ball",
    "Make the impossible visible"
  ]
};
const KINDS = ["poem", "graffiti"];
const TOOLS = new Set(["spray","splatter","drip","glow-spray","marker","brush",
  "pencil","neon","calligraphy","eraser","rainbow","highlighter","line",
  "rectangle","fill-rectangle","ellipse","fill-ellipse","arrow","text","stamp"]);
const STAMPS = new Set(["star","heart","lightning","smile","crown","flower","spark"]);
const COLOR = /^#[0-9a-fA-F]{6}$/;
const clean = (value, limit) => typeof value === "string"
  ? value.normalize("NFKC").replace(/[\u0000-\u0008\u000B-\u001F\u007F<>]/g, "").trim().slice(0, limit) : "";
const pointsOkay = pts => Array.isArray(pts) && pts.length >= 1 && pts.length <= 190 &&
  pts.every(p => Array.isArray(p) && p.length >= 2 && p.length <= 3 &&
    p.every(v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000));

export function validArenaArtwork(art) {
  if (!art || typeof art !== "object" || !Array.isArray(art.ops) ||
      art.ops.length < 1 || art.ops.length > 280 || !COLOR.test(art.background || "")) return false;
  // The realtime transport limit is 64 KB; leave room for protocol overhead and the envelope.
  try { if (JSON.stringify(art).length > 48_000) return false; } catch { return false; }
  return art.ops.every(op => op && typeof op === "object" && TOOLS.has(op.tool) &&
    COLOR.test(op.color || "") && Number.isFinite(op.size) && op.size >= 1 && op.size <= 80 &&
    Number.isFinite(op.opacity) && op.opacity >= 0 && op.opacity <= 1 &&
    (op.text === undefined || (typeof op.text === "string" && op.text.length <= 80)) &&
    (op.stamp === undefined || STAMPS.has(op.stamp)) && pointsOkay(op.pts));
}

function newRoom(kind, number) {
  return {kind, number, members:new Map(), entries:new Map(), votes:new Map(),
    phase:"waiting", endsAt:null, round:0, topic:null, winnerIds:[], lastTopic:null};
}
const keyFor = (room) => "creative:" + room.kind + ":" + room.number;
const lobbyKey = kind => "creative:lobby:" + kind;
const reply = cb => typeof cb === "function" ? cb : () => {};

export function createCreativeArenas(io, options = {}) {
  const createMs = options.createMs ?? ARENA_CREATE_MS;
  const voteMs = options.voteMs ?? ARENA_VOTE_MS;
  const resultsMs = options.resultsMs ?? ARENA_RESULTS_MS;
  const rooms = Object.fromEntries(KINDS.map(kind =>
    [kind, Array.from({length:ARENA_ROOMS}, (_, i) => newRoom(kind, i + 1))]));
  const memberships = new Map();

  function lobby(kind) {
    return {kind, rooms:rooms[kind].map(r => ({
      number:r.number, count:r.members.size, capacity:ARENA_CAPACITY,
      phase:r.phase, round:r.round, endsAt:r.endsAt,
      open:r.members.size < ARENA_CAPACITY && (r.phase === "waiting" ||
        (r.phase === "creating" && r.endsAt - Date.now() > 10_000))
    }))};
  }
  function publishLobby(kind) { io.to(lobbyKey(kind)).emit("arena:lobby", lobby(kind)); }

  function state(r, socket) {
    const show = r.phase === "voting" || r.phase === "results";
    const tallies = new Map();
    for (const id of r.votes.values()) tallies.set(id, (tallies.get(id) || 0) + 1);
    return {kind:r.kind, number:r.number, round:r.round, phase:r.phase,
      topic:r.topic, endsAt:r.endsAt, serverNow:Date.now(), you:socket.id,
      participants:[...r.members].map(([id,m])=>({id, name:m.name, submitted:r.entries.has(id)})),
      submissions:r.entries.size, votes:r.votes.size,
      yourVote:r.votes.get(socket.id) || null, yourSubmission:r.entries.has(socket.id),
      entries:show ? [...r.entries.values()].map(entry=>({
        ...entry, likes:r.phase === "results" ? (tallies.get(entry.id) || 0) : null
      })) : [],
      winnerIds:r.phase === "results" ? r.winnerIds : []};
  }
  function publish(r) {
    for (const id of r.members.keys()) {
      const s = io.sockets.sockets.get(id);
      if (s) s.emit("arena:state", state(r,s));
    }
    publishLobby(r.kind);
  }
  function pickTopic(r) {
    const options=PROMPTS[r.kind].filter(x=>x!==r.lastTopic);
    return options[randomInt(options.length)];
  }
  function start(r) {
    r.round += 1; r.phase="creating"; r.topic=pickTopic(r); r.lastTopic=r.topic;
    r.endsAt=Date.now()+createMs; r.entries.clear(); r.votes.clear(); r.winnerIds=[];
    publish(r);
  }
  function reset(r) {
    r.phase="waiting"; r.endsAt=null; r.topic=null;
    r.entries.clear();r.votes.clear();r.winnerIds=[];
    publish(r);
  }
  function complete(r) {
    const tally = new Map();
    for (const id of r.votes.values()) tally.set(id,(tally.get(id)||0)+1);
    const max = Math.max(0,...tally.values());
    r.winnerIds = max>0 ? [...tally].filter(([,count])=>count===max).map(([id])=>id) : [];
    r.phase="results";r.endsAt=Date.now()+resultsMs;publish(r);
  }
  function getMembership(socket) {
    const ref=memberships.get(socket.id);
    return ref && rooms[ref.kind][ref.number-1] || null;
  }
  function leave(socket) {
    const old=getMembership(socket);
    if(!old)return;
    old.members.delete(socket.id);
    memberships.delete(socket.id);
    socket.leave(keyFor(old));
    if(old.members.size===0)reset(old);
    else publish(old);
  }
  function attach(socket) {
    socket.on("arena:join",(input,cb)=>{
      const ack=reply(cb),kind=input?.kind;
      if(!KINDS.includes(kind))return ack({ok:false,error:"invalid_wall"});
      socket.join(lobbyKey(kind));
      socket.emit("arena:lobby",lobby(kind));
      const desired=input?.number;
      if(desired !== undefined && (!Number.isInteger(desired)||desired<1||desired>ARENA_ROOMS))
        return ack({ok:false,error:"invalid_room"});
      const target=desired ? rooms[kind][desired-1]
        : [...rooms[kind]].filter(r=>r.members.size<ARENA_CAPACITY &&
           (r.phase==="waiting"||(r.phase==="creating" && r.endsAt-Date.now()>10_000)))
          .sort((a,b)=>b.members.size-a.members.size || a.number-b.number)[0];
      if(!target)return ack({ok:false,error:"rooms_full"});
      const previous=getMembership(socket);
      if(previous===target){socket.emit("arena:state",state(target,socket));return ack({ok:true,number:target.number});}
      if(target.members.size>=ARENA_CAPACITY ||
         (target.phase!=="waiting" && (target.phase!=="creating"||target.endsAt-Date.now()<=10_000)))
        return ack({ok:false,error:"room_closed"});
      if(previous)leave(socket);
      const name="STRANGER "+String(randomInt(100,1000));
      target.members.set(socket.id,{name});
      memberships.set(socket.id,{kind,number:target.number});
      socket.join(keyFor(target));
      ack({ok:true,number:target.number});
      if(target.phase==="waiting" && target.members.size>=2)start(target);
      else publish(target);
    });
    socket.on("arena:leave",(_input,cb)=>{leave(socket);reply(cb)({ok:true});});
    socket.on("arena:submit",(input,cb)=>{
      const ack=reply(cb),r=getMembership(socket);
      if(!r)return ack({ok:false,error:"not_in_room"});
      if(r.phase!=="creating" || r.endsAt<=Date.now())return ack({ok:false,error:"round_closed"});
      if(r.entries.has(socket.id))return ack({ok:false,error:"already_submitted"});
      const title=clean(input?.title,80),tag=clean(input?.author_tag,24)||r.members.get(socket.id)?.name||"STRANGER";
      if(title.length<3)return ack({ok:false,error:"title_required"});
      const entry={id:randomUUID(),owner:socket.id,title,author_tag:tag};
      if(r.kind==="poem") {
        const body=clean(input?.body,1400);
        if(body.length<8)return ack({ok:false,error:"poem_too_short"});
        entry.body=body;
      }else{
        if(!validArenaArtwork(input?.artwork))return ack({ok:false,error:"invalid_artwork"});
        // Strip unknown metadata and prototype surprises from the incoming drawing.
        entry.artwork=JSON.parse(JSON.stringify(input.artwork));
      }
      r.entries.set(socket.id,entry);
      ack({ok:true,id:entry.id});publish(r);
    });
    socket.on("arena:vote",(input,cb)=>{
      const ack=reply(cb),r=getMembership(socket);
      if(!r)return ack({ok:false,error:"not_in_room"});
      if(r.phase!=="voting" || r.endsAt<=Date.now())return ack({ok:false,error:"voting_closed"});
      if(r.votes.has(socket.id))return ack({ok:false,error:"already_voted"});
      const e=[...r.entries.values()].find(v=>v.id===input?.id);
      if(!e)return ack({ok:false,error:"entry_not_found"});
      if(e.owner===socket.id)return ack({ok:false,error:"no_self_votes"});
      r.votes.set(socket.id,e.id);
      ack({ok:true});publish(r);
    });
    socket.on("disconnect",()=>leave(socket));
  }
  const ticker=setInterval(()=>{
    const now=Date.now();
    for(const kind of KINDS)for(const r of rooms[kind]) {
      if(!r.endsAt || now<r.endsAt)continue;
      if(r.phase==="creating"){
        if(r.entries.size===0){complete(r);}
        else{r.phase="voting";r.endsAt=now+voteMs;publish(r);}
      }else if(r.phase==="voting"){complete(r);}
      else if(r.phase==="results"){if(r.members.size>=2)start(r);else reset(r);}
    }
  },Math.max(50,Math.min(1000,Math.floor(Math.min(createMs,voteMs,resultsMs)/3))));
  ticker.unref?.();
  return {attach,lobby,rooms,close:()=>clearInterval(ticker)};
}
