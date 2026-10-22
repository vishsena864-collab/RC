// Ephemeral, server-authoritative underground music rooms. Never stores audio or chat.
import { randomInt } from "node:crypto";
const MAX_PEOPLE = 12;
const ROOM_CODES = ["STATIC","MIDNIGHT","BASEMENT","ECHO","FREQUENCY","AFTERHOURS"];
const TRACK_ID = /^[a-zA-Z0-9_-]{1,48}$/;
const MAX_CHAT = 280;
export function createUnderground(io) {
  const rooms = new Map();
  const bySocket = new Map();
  const lastChat = new Map();
  const state = (room) => ({
    room: room.code, listeners: room.members.size,
    dj: room.dj, track: room.track, startedAt: room.startedAt,
    queue: room.queue.slice(0, 12), updatedAt: Date.now()
  });
  const publish = (room) => io.to("fm:" + room.code).emit("fm:state", state(room));
  const leave = (socket) => {
    const code = bySocket.get(socket.id);
    if (!code) return;
    bySocket.delete(socket.id);
    socket.leave("fm:" + code);
    const room = rooms.get(code);
    if (!room) return;
    room.members.delete(socket.id);
    room.queue = room.queue.filter((q) => room.members.has(q.by));
    if (room.members.size === 0) { rooms.delete(code); return; }
    if (room.dj === socket.id) room.dj = [...room.members][randomInt(room.members.size)];
    publish(room);
  };
  const join = (socket, ack) => {
    leave(socket);
    const available = [...rooms.values()].filter((r) => r.members.size < MAX_PEOPLE);
    let room = available.length ? available[randomInt(available.length)] : null;
    if (!room) {
      const code = ROOM_CODES.find((name) => !rooms.has(name));
      if (!code) return ack?.({ok:false,error:"full"});
      room = {code,members:new Set(),dj:null,track:null,startedAt:null,queue:[]};
      rooms.set(code, room);
    }
    room.members.add(socket.id);
    socket.join("fm:" + room.code);
    bySocket.set(socket.id, room.code);
    if (!room.dj) room.dj = socket.id;
    ack?.({ok:true,room:room.code});
    publish(room);
  };
  const safeTrack = (track) => {
    if (!track || typeof track !== "object" || !TRACK_ID.test(track.id)) return null;
    const title = String(track.title || "").slice(0, 120).trim();
    const artist = String(track.artist || "").slice(0, 90).trim();
    if (!title || !artist) return null;
    return { id:track.id, title, artist };
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
      if (!room || !track || room.queue.length >= 12) return ack?.({ok:false,error:"invalid_request"});
      if (room.queue.some((item) => item.by === socket.id && item.track.id === track.id)) return ack?.({ok:false,error:"duplicate"});
      room.queue.push({track,by:socket.id});
      publish(room); ack?.({ok:true});
    });
    socket.on("fm:next", (ack) => {
      const room = rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id) return ack?.({ok:false,error:"dj_only"});
      const item = room.queue.shift();
      if (item) {room.track=item.track;room.startedAt=Date.now()+1800;publish(room);}
      ack?.({ok:Boolean(item)});
    });
    socket.on("fm:pass", (ack) => {
      const room=rooms.get(bySocket.get(socket.id));
      if (!room || room.dj !== socket.id || room.members.size < 2) return ack?.({ok:false});
      const others=[...room.members].filter((id)=>id!==socket.id);
      room.dj=others[randomInt(others.length)];publish(room);ack?.({ok:true});
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
  return {attach,rooms,leave};
}
