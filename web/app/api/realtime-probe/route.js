import {NextResponse} from "next/server";
import {io} from "socket.io-client";
export const runtime="nodejs";
export const maxDuration=27;
export const dynamic="force-dynamic";
function connect(){
 return new Promise((resolve,reject)=>{
  const client=io("https://chatspark-realtime.vercel.app",{path:"/api/socket",transports:["websocket"],timeout:9000,reconnection:false,forceNew:true,extraHeaders:{Origin:"https://chatspark-rc.vercel.app"}});
  const timeout=setTimeout(()=>{client.disconnect();reject(Error("connection_timeout"));},11500);
  client.once("connect",()=>{clearTimeout(timeout);resolve(client);});
  client.once("connect_error",err=>{clearTimeout(timeout);client.disconnect();reject(err);});
 });
}
function ack(s,event,arg){
 return new Promise((res,rej)=>{
  const timer=setTimeout(()=>rej(Error("ack_timeout_"+event)),6500);
  s.emit(event,arg,reply=>{clearTimeout(timer);res(reply);});
 });
}
export async function GET(){
 let a,b;
 try{
  [a,b]=await Promise.all([connect(),connect()]);
  const states={a:[],b:[]};
  a.on("fm:state",e=>states.a.push({room:e.room,listeners:e.listeners,track:e.track?.id||null}));
  b.on("fm:state",e=>states.b.push({room:e.room,listeners:e.listeners,track:e.track?.id||null}));
  const joinedA=await ack(a,"fm:join",{});
  const joinedB=await ack(b,"fm:join",{});
  await new Promise(resolve=>setTimeout(resolve,600));
  const shared=states.a.some(e=>e.listeners>=2)&&states.b.some(e=>e.listeners>=2);
  const result={ok:joinedA?.ok&&joinedB?.ok,transports:[a.io.engine.transport.name,b.io.engine.transport.name],joinedA,joinedB,shared,latestA:states.a.at(-1),latestB:states.b.at(-1)};
  return NextResponse.json(result,{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({ok:false,error:String(e.message||e)},{status:503});}
 finally{a?.disconnect();b?.disconnect();}
}
