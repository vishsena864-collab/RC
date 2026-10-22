import http from 'node:http';
import {Server} from 'socket.io';
import {randomUUID} from 'node:crypto';
const port=Number(process.env.PORT||3001);
const origins=(process.env.ALLOWED_ORIGINS||'https://randomchat.vercel.app').split(',').map(s=>s.trim()).filter(Boolean);
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:true,service:'randomchat-realtime'}));});
const io=new Server(server,{cors:{origin:origins,methods:['GET','POST']},maxHttpBufferSize:8192,pingTimeout:20000,allowRequest:(req,callback)=>{const origin=req.headers.origin;callback(null,!origin||origins.includes(origin));}});
let waiting=null;const peers=new Map();const limits=new Map();
const send=(socket,event,payload)=>socket.emit(event,payload);
function detach(id){const other=peers.get(id);peers.delete(id);if(other){peers.delete(other);io.to(other).emit('partner:left');}if(waiting===id)waiting=null;}
io.on('connection',socket=>{
  send(socket,'ready',{id:randomUUID()});
  socket.on('match:find',()=>{detach(socket.id);if(waiting&&waiting!==socket.id&&io.sockets.sockets.has(waiting)){const other=waiting;waiting=null;peers.set(socket.id,other);peers.set(other,socket.id);send(socket,'match:found',{});io.to(other).emit('match:found',{});}else{waiting=socket.id;send(socket,'match:waiting',{});}});
  socket.on('chat:message',raw=>{const now=Date.now();const prev=limits.get(socket.id)||0;if(now-prev<450)return;limits.set(socket.id,now);const partner=peers.get(socket.id);if(!partner)return;const text=typeof raw==='string'?raw:raw?.text;if(typeof text!=='string'||text.length>1000||!text.trim())return;io.to(partner).emit('chat:message',{text:text.trim(),sentAt:now});});
  socket.on('chat:typing',value=>{const partner=peers.get(socket.id);if(partner)io.to(partner).emit('chat:typing',Boolean(value));});
  socket.on('match:next',()=>{detach(socket.id);socket.emit('partner:left');});
  socket.on('disconnect',()=>{detach(socket.id);limits.delete(socket.id);});
});
server.listen(port,'0.0.0.0',()=>console.log('RandomChat listening on',port));
