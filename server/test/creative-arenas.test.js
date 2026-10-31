import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {before,after,afterEach,test} from "node:test";
import {io as connectClient} from "socket.io-client";
import {createApp} from "../src/index.js";
import {validArenaArtwork,ARENA_ROOMS,ARENA_CAPACITY} from "../src/creative-arenas.js";

const sampleArt={background:"#343a38",style:"concrete",ops:[{
 tool:"spray",color:"#e6ff83",size:15,opacity:.8,pts:[[10,20,.5],[12,22,.7]],layer:0,mirror:false
}]};
test("graffiti validation accepts paint commands and rejects malformed or huge payloads",()=>{
 assert.equal(validArenaArtwork(sampleArt),true);
 assert.equal(validArenaArtwork({...sampleArt,ops:[]}),false);
 assert.equal(validArenaArtwork({...sampleArt,background:"red"}),false);
 assert.equal(validArenaArtwork({...sampleArt,ops:[{...sampleArt.ops[0],pts:[[Infinity,2]]}]}),false);
 assert.equal(validArenaArtwork({...sampleArt,ops:[{...sampleArt.ops[0],color:"<script>"}]}),false);
 assert.equal(validArenaArtwork({...sampleArt,ops:Array(281).fill(sampleArt.ops[0])}),false);
 assert.equal(ARENA_ROOMS,10);
 assert.equal(ARENA_CAPACITY,10);
});

let app,url,folder;
const open=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
before(async()=>{
 folder=mkdtempSync(join(tmpdir(),"creative-arenas-"));
 app=createApp({dataDir:folder,arenaOptions:{createMs:2600,voteMs:950,resultsMs:350}});
 url="http://127.0.0.1:"+(await app.listen(0));
});
afterEach(async()=>{
 for(const s of open.splice(0))s.disconnect();
 await sleep(40);
});
after(async()=>{await app.close();rmSync(folder,{recursive:true,force:true});});
const client=async()=>{
 const s=connectClient(url,{transports:["websocket"],forceNew:true});
 open.push(s);
 await new Promise((resolve,reject)=>{s.once("connect",resolve);s.once("connect_error",reject);});
 return s;
};
const ask=(s,event,payload)=>new Promise(resolve=>s.emit(event,payload,resolve));
const stateUntil=(s,predicate,timeout=6000)=>new Promise((resolve,reject)=>{
 let timer=setTimeout(()=>{s.off("arena:state",handler);reject(new Error("arena state timed out"));},timeout);
 function handler(v){if(predicate(v)){clearTimeout(timer);s.off("arena:state",handler);resolve(v);}}
 s.on("arena:state",handler);
});

test("two strangers start a poem round; one entry each; voting blocks self-votes and elects winner",async()=>{
 const a=await client(),b=await client();
 assert.equal((await ask(a,"arena:join",{kind:"poem",number:1})).ok,true);
 const startedA=stateUntil(a,v=>v.phase==="creating");
 const startedB=stateUntil(b,v=>v.phase==="creating");
 assert.equal((await ask(b,"arena:join",{kind:"poem",number:1})).ok,true);
 const [aState,bState]=await Promise.all([startedA,startedB]);
 assert.equal(aState.topic,bState.topic);
 assert.equal(aState.participants.length,2);
 assert.ok(aState.endsAt>Date.now());
 assert.equal(aState.entries.length,0,"no draft content leaks while creating");
 assert.equal((await ask(a,"arena:submit",{title:"The midnight city",body:"A little poetry about strangers",ageConfirmed:false})).error,"adult_consent_required");
 assert.equal((await ask(a,"arena:submit",{title:"The midnight city",body:"A little poetry about strangers",ageConfirmed:true})).ok,true);
 assert.equal((await ask(a,"arena:submit",{title:"Another title",body:"Another stranger poem",ageConfirmed:true})).error,"already_submitted");
 const votingA=stateUntil(a,v=>v.phase==="voting");
 const votingB=stateUntil(b,v=>v.phase==="voting");
 const [va,vb]=await Promise.all([votingA,votingB]);
 assert.equal(va.entries.length,1);
 assert.equal(vb.entries[0].body,"A little poetry about strangers");
 const id=va.entries[0].id;
 assert.equal((await ask(a,"arena:vote",{id})).error,"no_self_votes");
 assert.equal((await ask(b,"arena:vote",{id})).ok,true);
 assert.equal((await ask(b,"arena:vote",{id})).error,"already_voted");
 const done=await stateUntil(a,v=>v.phase==="results");
 assert.deepEqual(done.winnerIds,[id]);
 assert.equal(done.entries[0].likes,1);
});

test("a graffiti battle validates actual drawing commands; ten seats enforced",async()=>{
 const sockets=[];
 for(let i=0;i<10;i++){const s=await client();sockets.push(s);
  assert.equal((await ask(s,"arena:join",{kind:"graffiti",number:3})).ok,true);
 }
 const extra=await client();
 assert.equal((await ask(extra,"arena:join",{kind:"graffiti",number:3})).error,"room_closed");
 const lobby=await new Promise(resolve=>{
  sockets[0].once("arena:lobby",resolve);
  sockets[0].emit("arena:join",{kind:"graffiti",number:3},()=>{});
 });
 assert.equal(lobby.rooms[2].count,10);
 assert.equal((await ask(sockets[0],"arena:submit",{title:"Neon night",artwork:{...sampleArt,ops:[]},ageConfirmed:true})).error,"invalid_artwork");
 assert.equal((await ask(sockets[0],"arena:submit",{title:"Neon night",artwork:sampleArt,ageConfirmed:true})).ok,true);
});
