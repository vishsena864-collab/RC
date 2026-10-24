import {NextResponse} from "next/server";
import {io} from "socket.io-client";
export const runtime="nodejs";
export const maxDuration=25;
export const dynamic="force-dynamic";
export async function GET(){
 const target="https://chatspark-realtime-vercel.vercel.app";
 const client=io(target,{path:"/api/socket",transports:["websocket"],timeout:10000,reconnection:false,forceNew:true,extraHeaders:{Origin:"https://chatspark-rc.vercel.app"}});
 try {
  const data=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error("probe_timeout")),12500);
   client.once("connect",()=>{client.emit("fm:join",ack=>{clearTimeout(timeout);resolve({connected:true,join:ack,transport:client.io.engine.transport.name});});});
   client.once("connect_error",e=>{clearTimeout(timeout);reject(e);});
  });
  client.emit("fm:leave");client.disconnect();
  return NextResponse.json({ok:true,...data});
 }catch(e){client.disconnect();return NextResponse.json({ok:false,error:String(e?.message||e).slice(0,160)},{status:503});}
}
