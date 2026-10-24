// Ephemeral, server-authoritative underground music rooms. Never stores audio or chat.
import { randomInt } from "node:crypto";
const MAX_PEOPLE = 12;
const ROOM_CODES = ["STATIC","MIDNIGHT","BASEMENT","ECHO","FREQUENCY","AFTERHOURS"];
const TRACK_ID = /^[a-zA-Z0-9_-]{1,48}$/;
const MAX_CHAT = 280;
const MAX_QUEUE = 17;
const DJ_TURN_MS = 4 * 60_000;
const COLOR_THEMES = ["acid","infrared","ultraviolet","ocean","gold","rose","midnight","toxic"];
const FX_MODES = ["pulse","march","sweep","crossfire","tunnel","bloom","drift"];
const MOODS = ["energy","chill","love","deep"];
const REACTIONS = ["heart","fire","spark","wave"];
const defaultLights = () => ({theme:"acid",fx:"march",intensity:2,beatBpm:116,updatedAt:Date.now(),showMoment:null});

export function createUnderground(io) {
  const rooms = new Map();
  const bySocket = new Map();
  const lastChat = new Map();
  const state = (room) => ({
    room: room.code, listeners: room.members.size,
    dj: room.dj, track: room.track, startedAt: room.startedAt,
    queue: room.queue.slice(0, MAX_QUEUE), lights:room.lights, mood:room.mood, djSince:room.djSince, djTurnMs:DJ_TURN_MS, updatedAt: Date.now()
  });
  const publish = (room) => io.to("fm:" + room.code).emit("fm:state", state(room));
  const leave = (socket) => {
    const code = bySocket.get(socket.id);
    if (!code) return;
    bySocket.delete(socket.id);
    socket.leave("fm:" + code);
    const room = rooms.get(code);
    if (!room) return;
    room.members.delete(socket.id);room.reactionAt.delete(socket.id);room.lastMood.delete(socket.id);
    room.queue = room.queue.filter((q) => room.members.has(q.by));
    if (room.members.size === 0) { rooms.delete(code); return; }
    if (room.dj === socket.id) {room.dj = [...room.members][randomInt(room.members.size)];room.djSince=Date.now();}
    publish(room);
  };
  const join = (socket, ack) => {
    leave(socket);
    const available = [...rooms.values()].filter((r) => r.members.size < MAX_PEOPLE);
    let room = available.length ? available[randomInt(available.length)] : null;
    if (!room) {
      const code = ROOM_CODES.find((name) => !rooms.has(name));
      if (!code) return ack?.({ok:false,error:"full"});
      room = {code,members:new Set(),dj:null,djSince:Date.now(),track:null,startedAt:null,queue:[],lights:defaultLights(),mood:{energy:0,chill:0,love:0,deep:0},reactionAt:new Map(),lastMood:new Map(),lastMoment:0};
      rooms.set(code, room);
    }
    room.members.add(socket.id);
    socket.join("fm:" + room.code);
    bySocket.set(socket.id, room.code);
    if (!room.dj) {room.dj = socket.id;room.djSince=Date.now();}
    ack?.({ok:true,room:room.code});
    publish(room);
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
          host.endsWith(".figment.io") || host.endsWith(".monophonic.digital");
        return allowed && /^\/content\/[a-z0-9/._-]+\/(?:150x150|480x480|1000x1000)\.(?:jpg|jpeg|png|webp)$/i.test(uri.pathname);
      } catch {return false;}
    })() ? track.artwork : null;
    const duration = Number.isFinite(Number(track.duration)) ? Math.max(0,Math.min(21600,Math.round(Number(track.duration)))) : 0;
    return { id:track.id, title, artist, artwork, duration, genre:String(track.genre||"").slice(0,50) };
  };
  const attach = (socket) => {
    socket.on("fm:join", (...a) => join(socket, typeof a.at(-1) === "function" ? a.at(-1) : undefined));
    socket.on("fm:leave", (ack) => { leave(socket); if(typeof ack==="function") ack({ok:true}); });
    socket.on("fm:play", (raw, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id) return ack?.({ok:false,error:"dj_only"});
      const track = safeTrack(raw);
      if (!track) return ack?.({ok:false,error:"invalid_track"});
      room.track = track;
      room.startedAt = Date.now() + 1800;
      room.queue = room.queue.filter((item) => item.track.id !== track.id);
      publish(room);
      ack?.({ok:true});
    });
    socket.on("fm:request", (raw, ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      const track = safeTrack(raw);
      if (!room || !track || room.queue.length >= MAX_QUEUE) return ack?.({ok:false,error:"invalid_request"});
      if (room.queue.some((item) => item.by === socket.id && item.track.id === track.id)) return ack?.({ok:false,error:"duplicate"});
      room.queue.push({track,by:socket.id});
      publish(room); ack?.({ok:true});
    });
    socket.on("fm:queue:add", (raw, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if(!room || room.dj!==socket.id) return ack?.({ok:false,error:"dj_only"});
      if(room.queue.length>=MAX_QUEUE) return ack?.({ok:false,error:"queue_full"});
      const track=safeTrack(raw);
      if(!track) return ack?.({ok:false,error:"invalid_track"});
      if(room.queue.some(item=>item.track.id===track.id)) return ack?.({ok:false,error:"duplicate"});
      room.queue.push({track,by:socket.id});publish(room);ack?.({ok:true});
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
      if (item) {room.track=item.track;room.startedAt=Date.now()+1800;publish(room);}
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
      if (Date.now()-room.lastMoment<25000) return ack?.({ok:false,error:"cooldown"});
      room.lastMoment=Date.now();
      room.lights={...room.lights,showMoment:{kind,at:Date.now()},updatedAt:Date.now()};
      publish(room);ack?.({ok:true});
    });
    socket.on("fm:mood", (choice, ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || !MOODS.includes(choice)) return ack?.({ok:false,error:"invalid"});
      if (Date.now()-(room.lastMood.get(socket.id)||0)<20000) return ack?.({ok:false,error:"cooldown"});
      room.lastMood.set(socket.id,Date.now());
      room.mood[choice]=Math.min(9999,room.mood[choice]+1);publish(room);ack?.({ok:true});
    });
    socket.on("fm:reaction", (reaction,ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || !REACTIONS.includes(reaction)) return ack?.({ok:false,error:"invalid"});
      if (Date.now()-(room.reactionAt.get(socket.id)||0)<1800) return ack?.({ok:false,error:"cooldown"});
      room.reactionAt.set(socket.id,Date.now());
      io.to("fm:"+room.code).emit("fm:reaction",{kind:reaction,at:Date.now()});
      ack?.({ok:true});
    });
    socket.on("fm:chat", (message) => {
      const room=rooms.get(bySocket.get(socket.id));
      const text=typeof message==="string" ? message.trim() : "";
      if(!room || !text || text.length>MAX_CHAT || /https?:\/\//i.test(text)) return;
      const now=Date.now();
      if(now-(lastChat.get(socket.id)||0)<1250) return;
      lastChat.set(socket.id,now);
      io.to("fm:"+room.code).emit("fm:chat",{text,at:now,from:socket.id===room.dj?"DJ":"GUEST"});
    });
    socket.on("disconnect",()=>{leave(socket);lastChat.delete(socket.id);});
  };
  const turnTimer=setInterval(()=>{
    for(const room of rooms.values()){
      if(room.members.size<2) continue;
      if(Date.now()-room.djSince<DJ_TURN_MS) continue;
      const order=[...room.members];
      const idx=order.indexOf(room.dj);
      room.dj=order[(idx+1)%order.length];
      room.djSince=Date.now();publish(room);
    }
  },3000);
  turnTimer.unref?.();
  return {attach,rooms,leave,close:()=>clearInterval(turnTimer)};
}
