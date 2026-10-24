// Short-lived diagnostics for verifying Vercel WebSocket upgrade and multi-client room behavior.
// Remove this endpoint after deployment validation. Does not inspect real visitor traffic.
const ORIGIN="https://chatspark-rc.vercel.app";
const REALTIME_URL="wss://chatspark-realtime.vercel.app/api/socket/?EIO=4&transport=websocket";
function connectClient(category){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(REALTIME_URL);
  let status="connecting",events=[],timer;
  timer=setTimeout(()=>{ws.close();reject(Error("WebSocket connection timeout, stage="+status));},9000);
  ws.addEventListener("error",()=>{clearTimeout(timer);reject(Error("WebSocket error, stage="+status));},{once:true});
  ws.addEventListener("message",event=>{
   const text=String(event.data);
   if(text.startsWith("0{")){status="engine_open";ws.send("40");return;}
   if(text.startsWith("40")){status="socket_ready";clearTimeout(timer);resolve({
    ws,events,get status(){return status;},
    emit(name,payload){ws.send("42"+JSON.stringify(payload===undefined?[name]:[name,payload]));}
   });return;}
   if(text==="2"){ws.send("3");return;}
   if(text.startsWith("42")){try{events.push(JSON.parse(text.slice(2)));}catch{}}
  });
 });
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
export default async function handler(req,res){
 if(req.method!=="GET"){res.statusCode=405;return res.end("Method not allowed");}
 const clients=[];const result={ws:false,rooms:false,matching:false,errors:[]};
 try{
  const a=await connectClient("fm");clients.push(a);result.ws=true;
  a.emit("fm:join");
  await sleep(450);
  const b=await connectClient("fm");clients.push(b);b.emit("fm:join");
  await sleep(650);
  const aState=a.events.filter(e=>e[0]==="fm:state").at(-1)?.[1],bState=b.events.filter(e=>e[0]==="fm:state").at(-1)?.[1];
  result.fm={aListeners:aState?.listeners??null,bListeners:bState?.listeners??null,aRoom:aState?.room??null,bRoom:bState?.room??null};
  result.rooms=Boolean(aState&&bState&&aState.room===bState.room&&aState.listeners>=2&&bState.listeners>=2);
  const c=await connectClient("chat");clients.push(c);
  const d=await connectClient("chat");clients.push(d);
  const join={gender:"male",want:"any",mode:"text",category:"general",interests:[],ageConfirmed:true};
  c.emit("join",join);d.emit("join",join);
  await sleep(850);
  result.matching=c.events.some(e=>e[0]==="matched")&&d.events.some(e=>e[0]==="matched");
  result.matches={a:c.events.map(e=>e[0]).slice(-4),b:d.events.map(e=>e[0]).slice(-4)};
 }catch(e){result.errors.push(String(e.message||e).slice(0,250));}
 finally{for(const client of clients)try{client.ws.close();}catch{}}
 res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json");
 res.statusCode=200;res.end(JSON.stringify(result));
}
