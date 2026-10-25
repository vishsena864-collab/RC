// Ephemeral, server-authoritative underground music rooms. Never stores audio; chat lives only in memory, except
// the reported person's recent lines when someone files a report (kept by Moderation for its short retention).
import { randomInt } from "node:crypto";
import { cleanMessage } from "./moderation.js";
import { RateLimiter } from "./ratelimit.js";
const MAX_PEOPLE = 12;
const ROOM_CODES = ["STATIC","MIDNIGHT","BASEMENT","ECHO","FREQUENCY","AFTERHOURS"];
const TRACK_ID = /^[a-zA-Z0-9_-]{1,48}$/;
const MAX_CHAT = 280;
const MAX_QUEUE = 17;
const DJ_TURN_MS = 4 * 60_000;
const COLOR_THEMES = ["acid","infrared","ultraviolet","ocean","gold","rose","midnight","toxic"];
const FX_MODES = ["pulse","march","sweep","crossfire","tunnel","bloom","drift","cone","matrix","chase","follow"];
const MOODS = ["energy","chill","love"];
const REACTIONS = ["heart","fire","spark","wave","party","hands"];
const HEAT_STEP = {energy:14,love:7,chill:-13};
const HEAT_DECAY_MS = 18000;
const CLIENT_KEY = /^[a-zA-Z0-9_-]{8,40}$/;
const SKIP_GRACE_MS = 4000;
const REPORT_REASONS = ["underage","sexual_content","harassment","spam","other"];
const RECENT_LINES = 40;
const CUE_KINDS = ["intro","groove","build","drop","break","outro"];
const num = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
// The auto light show's cue sheet for the song on air, made by one listener's browser. Checked field by field and
// rebuilt from scratch, so nothing but numbers and known section names is ever relayed to the room.
const safeCues = (raw, track) => {
  if (!raw || typeof raw !== "object" || !track || raw.id !== track.id) return null;
  if (!num(raw.bpm, 60, 200) || !num(raw.bar, 0, 4) || !num(raw.dur, 20, 7200)) return null;
  if (!Array.isArray(raw.energy) || raw.energy.length > 15000 || !raw.energy.every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) return null;
  if (!Array.isArray(raw.sections) || raw.sections.length > 400 || !Array.isArray(raw.drops) || raw.drops.length > 80) return null;
  let prev = -1;
  const sections = [];
  for (const s of raw.sections) {
    if (!s || !num(s.t, 0, 7200) || s.t < prev || !CUE_KINDS.includes(s.k) || !num(s.e, 0, 100)) return null;
    sections.push({t:s.t, k:s.k, e:Math.round(s.e)}); prev = s.t;
  }
  prev = -1;
  for (const d of raw.drops) { if (!num(d, 0, 7200) || d < prev) return null; prev = d; }
  return {id:track.id, bpm:raw.bpm, bar:raw.bar, dur:raw.dur, conf:num(raw.conf, 0, 1000) ? raw.conf : 0, energy:raw.energy.slice(), sections, drops:raw.drops.slice()};
};
const heatNow = (room, now=Date.now()) => {
  const elapsed=Math.max(0,now-(room.heatAt||now));
  return Math.max(0,Math.min(100,Math.round(50+(room.heatValue-50)*Math.exp(-elapsed/HEAT_DECAY_MS))));
};
// Ephemeral, anonymous stage names derived from the connection id. Never stored, never tied to an account.
const HANDLE_WORDS = ["luna","mars","kiwi","neon","skye","jett","kael","rhea","miso","nova","echo","onyx","wren","zeal","vega","juno","pixel","ember","koda","sable"];
const handleHash = (id) => { let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const handleFor = (id) => { const h = handleHash(id); return HANDLE_WORDS[h % HANDLE_WORDS.length] + "." + String((h >>> 8) % 90 + 10); };
const hueFor = (id) => handleHash(id + "hue") % 360;
const defaultLights = () => ({theme:"infrared",fx:"sweep",intensity:2,auto:true,beatBpm:116,updatedAt:Date.now(),showMoment:null});

// djHoldMs: how long the controller seat (and an otherwise empty room) is kept for a controller who dropped or refreshed.
// crossfadeMs: the next queued song starts this long before the current one ends, so devices blend the two like a DJ.
// moderation/onBan: room-chat reports go through the same report and auto-ban pipeline as one-to-one chats.
export function createUnderground(io, { djHoldMs = 15000, crossfadeMs = 8000, moderation = null, onBan = () => {} } = {}) {
  const rooms = new Map();
  // Stage names follow the tab key when the client sends one, so a refresh keeps the same name.
  const who = new Map();
  const name = (id) => handleFor(who.get(id) || id), tint = (id) => hueFor(who.get(id) || id);
  const bySocket = new Map();
  const lastChat = new Map(), lastTyping = new Map(), lastRequest = new Map(), lastReport = new Map();
  const state = (room) => ({
    room: room.code, listeners: room.members.size,
    people: [...room.members].slice(0, 12).map((id) => ({handle:name(id), hue:tint(id), dj:id===room.dj})),
    dj: room.dj, track: room.track, startedAt: room.startedAt,
    queue: room.queue.slice(0, MAX_QUEUE).map((q) => ({track:q.track,by:q.by})), djHold: Boolean(room.hold), cues: room.cues && room.cues.id === room.track?.id ? room.cues.id : null, djHandle: room.dj ? name(room.dj) : null, djHue: room.dj ? tint(room.dj) : 0, reactionCounts:room.reactionCounts, lights:room.lights, mood:room.mood, moodAt:room.moodAt, heat:heatNow(room), heatUpdatedAt:Date.now(), djSince:room.djSince, djTurnMs:DJ_TURN_MS, updatedAt: Date.now()
  });
  const publish = (room) => io.to("fm:" + room.code).emit("fm:state", state(room));
  const system = (room, text) => io.to("fm:" + room.code).emit("fm:chat", {text, at:Date.now(), from:"SYSTEM"});
  const handOver = (room) => {
    room.hold = null;
    room.dj = [...room.members][randomInt(room.members.size)]; room.djSince = Date.now();
    system(room, "♛ " + name(room.dj) + " has the aux now. The music keeps playing.");
  };
  // The song is room state, so nobody leaving ever stops it. Leaving on purpose hands the aux over at once;
  // a dropped connection or a refresh holds the controller seat (and the room, even when empty) for djHoldMs.
  const leave = (socket, deliberate = true) => {
    const code = bySocket.get(socket.id);
    if (!code) return;
    bySocket.delete(socket.id);
    socket.leave("fm:" + code);
    const room = rooms.get(code);
    if (!room) return;
    const key = room.keys.get(socket.id);
    room.members.delete(socket.id);room.keys.delete(socket.id);room.cueAt.delete(socket.id);room.reactionAt.delete(socket.id);room.lastMood.delete(socket.id);
    if (room.dj === socket.id) {
      room.dj = null;
      if (!deliberate && key) room.hold = {key, until:Date.now() + djHoldMs, djSince:room.djSince};
      else if (room.members.size) handOver(room);
    }
    if (room.members.size === 0 && !room.hold) { rooms.delete(code); return; }
    publish(room);
  };
  const newRoom = (code) => ({code,recent:[],members:new Set(),keys:new Map(),hold:null,dj:null,djSince:Date.now(),track:null,startedAt:null,queue:[],lights:defaultLights(),mood:{energy:0,chill:0,love:0},moodAt:Date.now(),heatValue:50,heatAt:Date.now(),reactionAt:new Map(),reactionCounts:{heart:0,fire:0,spark:0,wave:0,party:0,hands:0},lastMood:new Map(),lastMoment:0,cues:null,cueAt:new Map()});
  // A client that lost its connection (or a host instance that restarted) sends what it was hearing, so the room it
  // asks for comes back with the same song, position and lights instead of empty. Only used when the room is gone.
  const restore = (room, seed) => {
    if (!seed || typeof seed !== "object") return;
    const track = safeTrack(seed.track), started = Number(seed.startedAt), now = Date.now();
    if (track && Number.isFinite(started) && started <= now + 5000 && now - started < Math.max(track.duration, 60) * 1000) { room.track = track; room.startedAt = started; }
    const l = seed.lights;
    if (l && typeof l === "object") room.lights = {...room.lights, ...(COLOR_THEMES.includes(l.theme) ? {theme:l.theme} : {}), ...(FX_MODES.includes(l.fx) ? {fx:l.fx} : {}), ...([0,1,2,3].includes(l.intensity) ? {intensity:l.intensity} : {}), updatedAt:now};
  };
  const join = (socket, ack, want) => {
    leave(socket);
    const code = typeof want?.room === "string" && ROOM_CODES.includes(want.room) ? want.room : null;
    let room = code ? rooms.get(code) : null;
    if (room && room.members.size >= MAX_PEOPLE) room = null;
    if (!room && code && !rooms.has(code)) { room = newRoom(code); restore(room, want.seed); rooms.set(code, room); }
    if (!room) {
      // an empty room on hold is reserved for its returning controller, not handed to strangers
      const available = [...rooms.values()].filter((r) => r.members.size > 0 && r.members.size < MAX_PEOPLE);
      room = available.length ? available[randomInt(available.length)] : null;
    }
    if (!room) {
      const free = ROOM_CODES.find((name) => !rooms.has(name));
      if (!free) return ack?.({ok:false,error:"full"});
      room = newRoom(free);
      rooms.set(free, room);
    }
    const key = typeof want?.key === "string" && CLIENT_KEY.test(want.key) ? want.key : null;
    room.members.add(socket.id);
    if (key) { room.keys.set(socket.id, key); who.set(socket.id, key); }
    socket.join("fm:" + room.code);
    bySocket.set(socket.id, room.code);
    if (room.hold && key && room.hold.key === key && Date.now() < room.hold.until) { room.dj = socket.id; room.djSince = room.hold.djSince; room.hold = null; }
    else if (!room.dj && !room.hold) {room.dj = socket.id;room.djSince=Date.now();}
    ack?.({ok:true,room:room.code,handle:name(socket.id),hue:tint(socket.id),silent:idle(room)});
    publish(room);
    if (room.cues && room.cues.id === room.track?.id) socket.emit("fm:cues", room.cues);
  };
  const safeTrack = (track) => {
    if (!track || typeof track !== "object" || !TRACK_ID.test(track.id)) return null;
    const title = String(track.title || "").slice(0, 120).trim();
    const artist = String(track.artist || "").slice(0, 90).trim();
    if (!title || !artist) return null;
    // Audius cover URLs are served by numerous content-node domains, not only audius.co.
    // Accept image URLs only from verified Audius-operated/hosted content node patterns.
    const artwork = typeof track.artwork==="string" && track.artwork.length<800 && (() => {
      try {
        const uri=new URL(track.artwork);
        if(uri.protocol!=="https:" || uri.username || uri.password || uri.port) return false;
        const host=uri.hostname.toLowerCase();
        const allowed=host==="audius.co" || host.endsWith(".audius.co") ||
          host.endsWith(".audiusindex.org") || host.endsWith(".audiususercontent.com") ||
          host.endsWith(".figment.io") || host.endsWith(".monophonic.digital") ||
          host.endsWith(".theblueprint.xyz") || host.endsWith(".open-audio-validator.com") ||
          host==="validator.soundmaxx.xyz" || host==="audius-04.staked.cloud";
        return allowed && /^\/content\/[a-z0-9/._-]+\/(?:150x150|480x480|1000x1000)\.(?:jpg|jpeg|png|webp)$/i.test(uri.pathname);
      } catch {return false;}
    })() ? track.artwork : null;
    const duration = Number.isFinite(Number(track.duration)) ? Math.max(0,Math.min(21600,Math.round(Number(track.duration)))) : 0;
    return { id:track.id, title, artist, artwork, duration, genre:String(track.genre||"").slice(0,50) };
  };
  const attach = (socket) => {
    // every room event counts against one budget, so no single connection can flood a room
    const budget = new RateLimiter(40, 10_000);
    socket.use((packet, next) => {
      if (typeof packet[0] !== "string" || !packet[0].startsWith("fm:") || budget.take()) return next();
      const ack = packet.at(-1);
      if (typeof ack === "function") ack({ok:false,error:"rate_limited"});
    });
    socket.on("fm:join", (...a) => join(socket, typeof a.at(-1) === "function" ? a.at(-1) : undefined, a[0] && typeof a[0] === "object" ? a[0] : null));
    // Whoever walks into a silent room starts a song for everyone, so nobody arrives to nothing.
    socket.on("fm:autostart", (raw, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room) return ack?.({ok:false});
      if (!idle(room)) return ack?.({ok:false,error:"playing"});
      const track = safeTrack(raw);
      if (!track) return ack?.({ok:false,error:"invalid_track"});
      room.track = track; room.cues = null; room.startedAt = Date.now() + 1200;
      room.queue = room.queue.filter((item) => item.track.id !== track.id);
      publish(room); ack?.({ok:true});
      system(room, "♫ " + name(socket.id) + " walked in and started the music: " + track.title + " — " + track.artist);
    });
    socket.on("fm:leave", (ack) => { leave(socket); if(typeof ack==="function") ack({ok:true}); });
    // Any listener whose audio reached the end reports it; the server moves to the next queued song once.
    // first valid cue sheet for the song on air wins; one submission per listener every 5 s
    socket.on("fm:cues", (raw, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room) return ack?.({ok:false});
      if (Date.now() - (room.cueAt.get(socket.id) || 0) < 5000) return ack?.({ok:false,error:"cooldown"});
      room.cueAt.set(socket.id, Date.now());
      if (room.cues && room.cues.id === room.track?.id) return ack?.({ok:false,error:"exists"});
      const cues = safeCues(raw, room.track);
      if (!cues) return ack?.({ok:false,error:"invalid"});
      room.cues = cues;
      io.to("fm:" + room.code).emit("fm:cues", cues);
      publish(room); ack?.({ok:true});
    });
    socket.on("fm:ended", (payload, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room || !room.track || payload?.id !== room.track.id) return ack?.({ok:false});
      if (room.track.duration && Date.now() < room.startedAt + room.track.duration * 1000 - 5000) return ack?.({ok:false,error:"early"});
      ack?.({ok:true, advanced:advance(room)});
    });
    socket.on("fm:play", (raw, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id) return ack?.({ok:false,error:"dj_only"});
      const track = safeTrack(raw);
      if (!track) return ack?.({ok:false,error:"invalid_track"});
      room.track = track; room.cues = null;
      room.startedAt = Date.now() + 1800;
      room.queue = room.queue.filter((item) => item.track.id !== track.id);
      publish(room);
      ack?.({ok:true});
    });
    socket.on("fm:request", (raw, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      const track = safeTrack(raw);
      if (!room || !track || room.queue.length >= MAX_QUEUE) return ack?.({ok:false,error:"invalid_request"});
      if (room.queue.some((item) => item.track.id === track.id)) return ack?.({ok:false,error:"duplicate"});
      if (Date.now() - (lastRequest.get(socket.id) || 0) < 4000) return ack?.({ok:false,error:"cooldown"});
      lastRequest.set(socket.id, Date.now());
      room.queue.push({track,by:name(socket.id)});
      if (!idle(room) || !advance(room)) publish(room);
      ack?.({ok:true});
      io.to("fm:"+room.code).emit("fm:chat",{text:"🎵 Track requested: "+track.title+" — "+track.artist,at:Date.now(),from:"REQUEST",handle:name(socket.id),hue:tint(socket.id)});
    });
    socket.on("fm:queue:add", (raw, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if(!room || room.dj!==socket.id) return ack?.({ok:false,error:"dj_only"});
      if(room.queue.length>=MAX_QUEUE) return ack?.({ok:false,error:"queue_full"});
      const track=safeTrack(raw);
      if(!track) return ack?.({ok:false,error:"invalid_track"});
      if(room.queue.some(item=>item.track.id===track.id)) return ack?.({ok:false,error:"duplicate"});
      room.queue.push({track,by:name(socket.id)});if(!idle(room)||!advance(room))publish(room);ack?.({ok:true});
    });
    socket.on("fm:queue:remove", (index, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if(!room || room.dj!==socket.id) return ack?.({ok:false,error:"dj_only"});
      if(!Number.isInteger(index)||index<0||index>=room.queue.length) return ack?.({ok:false,error:"invalid_index"});
      room.queue.splice(index,1);publish(room);ack?.({ok:true});
    });
    socket.on("fm:queue:move", (payload, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if(!room || room.dj!==socket.id) return ack?.({ok:false,error:"dj_only"});
      const from=payload?.from,to=payload?.to;
      if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=room.queue.length||to>=room.queue.length) return ack?.({ok:false,error:"invalid_index"});
      const [entry]=room.queue.splice(from,1);room.queue.splice(to,0,entry);publish(room);ack?.({ok:true});
    });
    socket.on("fm:next", (...args) => {
      const ack=typeof args.at(-1)==="function"?args.at(-1):undefined;
      const room = rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id) return ack?.({ok:false,error:"dj_only"});
      const item = room.queue.shift();
      if (item) {room.track=item.track;room.cues=null;room.startedAt=Date.now()+1800;publish(room);}
      ack?.({ok:Boolean(item)});
    });
    socket.on("fm:pass", (...args) => {
      const ack=typeof args.at(-1)==="function"?args.at(-1):undefined;
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id || room.members.size < 2) return ack?.({ok:false});
      const others=[...room.members].filter((id)=>id!==socket.id);
      room.dj=others[randomInt(others.length)];room.djSince=Date.now();publish(room);ack?.({ok:true});
    });
    socket.on("fm:lights", (payload, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id) return ack?.({ok:false,error:"dj_only"});
      if (!payload || typeof payload !== "object") return ack?.({ok:false,error:"invalid"});
      const next={...room.lights};
      if (payload.theme !== undefined) {
        if (!COLOR_THEMES.includes(payload.theme)) return ack?.({ok:false,error:"invalid_theme"});
        next.theme=payload.theme;
      }
      if (payload.fx !== undefined) {
        if (!FX_MODES.includes(payload.fx)) return ack?.({ok:false,error:"invalid_fx"});
        next.fx=payload.fx;
      }
      if (payload.intensity !== undefined) {
        if (![0,1,2,3].includes(payload.intensity)) return ack?.({ok:false,error:"invalid_intensity"});
        next.intensity=payload.intensity;
      }
      if (payload.auto !== undefined) {
        if (typeof payload.auto !== "boolean") return ack?.({ok:false,error:"invalid_auto"});
        next.auto=payload.auto;
      }
      if (payload.beatBpm !== undefined) {
        if (!Number.isInteger(payload.beatBpm) || payload.beatBpm<60 || payload.beatBpm>180) return ack?.({ok:false,error:"invalid_bpm"});
        next.beatBpm=payload.beatBpm;
      }
      next.updatedAt=Date.now();room.lights=next;publish(room);ack?.({ok:true});
    });
    socket.on("fm:moment", (kind, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || room.dj!==socket.id) return ack?.({ok:false,error:"dj_only"});
      if (!["drop","flip","storm","fade"].includes(kind)) return ack?.({ok:false,error:"invalid"});
      if (Date.now()-room.lastMoment<5000) return ack?.({ok:false,error:"cooldown"});
      room.lastMoment=Date.now();
      room.lights={...room.lights,showMoment:{kind,at:Date.now()},updatedAt:Date.now()};
      publish(room);ack?.({ok:true});
    });
    socket.on("fm:mood", (choice, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || !MOODS.includes(choice)) return ack?.({ok:false,error:"invalid"});
      if (Date.now()-(room.lastMood.get(socket.id)||0)<3000) return ack?.({ok:false,error:"cooldown"});
      room.lastMood.set(socket.id,Date.now());
      const now=Date.now();
      const base=heatNow(room,now);
      room.heatValue=Math.max(0,Math.min(100,base+HEAT_STEP[choice]));
      room.heatAt=now;
      room.mood[choice]=Math.min(9999,room.mood[choice]+1);room.moodAt=now;
      const newHeat=heatNow(room,now);
      publish(room);
      io.to("fm:"+room.code).emit("fm:mood:burst",{kind:choice,at:now,heat:newHeat,by:socket.id,handle:name(socket.id)});
      ack?.({ok:true,heat:newHeat});
    });
    socket.on("fm:reaction", (reaction,ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || !REACTIONS.includes(reaction)) return ack?.({ok:false,error:"invalid"});
      if (Date.now()-(room.reactionAt.get(socket.id)||0)<700) return ack?.({ok:false,error:"cooldown"});
      room.reactionAt.set(socket.id,Date.now());
      room.reactionCounts[reaction]=Math.min(9999,(room.reactionCounts[reaction]||0)+1);
      io.to("fm:"+room.code).emit("fm:reaction",{kind:reaction,at:Date.now(),count:room.reactionCounts[reaction],handle:name(socket.id)});
      publish(room);
      ack?.({ok:true});
    });
    socket.on("fm:chat", (message, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if(!room) return ack?.({ok:false,error:"invalid_chat"});
      // same hygiene as one-to-one chat: no control or direction-override characters, no links
      const clean=cleanMessage(message, MAX_CHAT);
      if(!clean.ok) return ack?.({ok:false,error:clean.reason==="links"?"links":"invalid_chat"});
      const now=Date.now();
      if(now-(lastChat.get(socket.id)||0)<1250) return ack?.({ok:false,error:"cooldown"});
      lastChat.set(socket.id,now);
      const handle=name(socket.id);
      room.recent.push({handle,text:clean.text,at:now}); if(room.recent.length>RECENT_LINES) room.recent.shift();
      io.to("fm:"+room.code).emit("fm:chat",{text:clean.text,at:now,from:socket.id===room.dj?"DJ":"GUEST",handle,hue:tint(socket.id)});
      ack?.({ok:true});
    });
    // Report someone in the room by stage name: their recent lines go to the moderation log, and enough distinct
    // reporters ban their network key (and drop them) exactly like a one-to-one chat report.
    socket.on("fm:report", (payload, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if(!room || !moderation) return ack?.({ok:false});
      const reason=REPORT_REASONS.includes(payload?.reason) ? payload.reason : null;
      const handle=typeof payload?.handle==="string" ? payload.handle : "";
      const target=[...room.members].find((id)=>id!==socket.id && name(id)===handle);
      if(!reason || !target) return ack?.({ok:false,error:"invalid"});
      if(Date.now()-(lastReport.get(socket.id)||0)<10_000) return ack?.({ok:false,error:"cooldown"});
      lastReport.set(socket.id,Date.now());
      const reportedKey=io.sockets.sockets.get(target)?.data?.networkKey;
      const reporterKey=socket.data?.networkKey;
      if(!reportedKey || !reporterKey) return ack?.({ok:false});
      const result=moderation.report({reporterKey,reportedKey,reason,note:typeof payload?.note==="string"?payload.note:"",category:"underground",mode:"room",
        transcript:room.recent.filter((l)=>l.handle===handle).slice(-12).map((l)=>({from:"reported",text:l.text,ts:l.at}))});
      if(result.banned) onBan(reportedKey);
      ack?.({ok:true});
    });
    socket.on("fm:typing", () => {
      const room=rooms.get(bySocket.get(socket.id));
      const now=Date.now();
      if(!room || now-(lastTyping.get(socket.id)||0)<1500) return;
      lastTyping.set(socket.id,now);
      socket.to("fm:"+room.code).emit("fm:typing",{handle:name(socket.id)});
    });
    socket.on("disconnect",()=>{leave(socket,false);for(const m of [lastChat,lastTyping,lastRequest,lastReport,who])m.delete(socket.id);});
  };
  // nothing loaded, or the current song has run out
  const idle = (room) => !room.track || Boolean(room.track.duration && Date.now() > room.startedAt + room.track.duration * 1000);
  const advance = (room) => {
    const item = room.queue.shift();
    if (!item) return false;
    room.track = item.track; room.cues = null; room.startedAt = Date.now() + 1800; publish(room);
    return true;
  };
  const turnTimer=setInterval(()=>{
    const now=Date.now();
    for(const room of rooms.values()){
      if(room.hold && now>=room.hold.until){
        room.hold=null;
        if(!room.members.size){rooms.delete(room.code);continue;}
        handOver(room);publish(room);
      }
      // keep the set going even when nobody's device reports the end of the song
      // songs long enough to mix start the next one early for the crossfade; short clips wait for their end
      if(room.track?.duration && room.queue.length){
        const length=room.track.duration*1000, lead=length > crossfadeMs*3 ? crossfadeMs : -SKIP_GRACE_MS;
        if(now > room.startedAt + length - lead) advance(room);
      }
      if(room.members.size<2 || !room.dj) continue;
      if(Date.now()-room.djSince<DJ_TURN_MS) continue;
      const order=[...room.members];
      const idx=order.indexOf(room.dj);
      room.dj=order[(idx+1)%order.length];
      room.djSince=Date.now();publish(room);
    }
  },1000);
  turnTimer.unref?.();
  return {attach,rooms,leave,close:()=>clearInterval(turnTimer)};
}
