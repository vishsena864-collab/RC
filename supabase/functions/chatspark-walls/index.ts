import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const origins = new Set([
  "https://chatspark-rc.vercel.app",
  "https://randomchat-indol.vercel.app",
  "http://localhost:3000"
]);
const encoder = new TextEncoder();
const serviceSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { const value = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; return typeof value==="string"?value:value?.api_key; }catch{return undefined;} })();
const serviceUrl = Deno.env.get("SUPABASE_URL");
if(!serviceSecret || !serviceUrl) console.error("[walls] Missing privileged database configuration");
const db = serviceSecret && serviceUrl ? createClient(serviceUrl,serviceSecret,{
  auth:{persistSession:false,autoRefreshToken:false}
}):null;

const safe = (value,limit) => typeof value==="string"
  ? value.normalize("NFKC").replace(/[\u0000-\u001F\u007F<>]/g,"").trim().slice(0,limit) : "";
const hex = (bytes) => [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha = async(v)=>hex(await crypto.subtle.digest("SHA-256",encoder.encode(v)));
const sign = async(v)=>{
  const key=await crypto.subtle.importKey("raw",encoder.encode(serviceSecret+"|cs-walls-card-v1"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(v)));
};
const visitor = (req)=>{
  const value=req.headers.get("x-cs-visitor")||"";
  return /^[0-9a-f-]{36}$/i.test(value)?value:"anonymous";
};
const clientAddress = (req)=>{
  const value=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")||"unknown";
  return value.split(",")[0].trim().slice(0,90);
};
const json = (payload,status,origin) => new Response(JSON.stringify(payload),{
  status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store",
  "access-control-allow-origin":origin,"vary":"Origin","x-content-type-options":"nosniff"}
});
const err = (message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const check = async (actor,action,max,seconds) => {
  const {data,error}=await db.rpc("cs_wall_rate_check",{p_actor:actor,p_action:action,p_max:max,p_seconds:seconds});
  if(error)throw error;
  if(!data)err("Too many requests. Please try later.",429);
};
const isColor = (s) => typeof s==="string" && /^#[0-9a-fA-F]{6}$/.test(s);
const artOk = (art) => {
  if(!art || typeof art!=="object" || !Array.isArray(art.ops) || art.ops.length<1 || art.ops.length>280)return false;
  if(JSON.stringify(art).length>57000)return false;
  if(!isColor(art.background))return false;
  const tools=new Set(["spray","splatter","drip","glow-spray","marker","brush","pencil","neon","calligraphy","eraser","rainbow","highlighter","line","rectangle","fill-rectangle","ellipse","fill-ellipse","arrow","text","stamp"]);
  return art.ops.every(op=>{
    if(!op || typeof op!=="object" || !tools.has(op.tool) || !isColor(op.color) || !Number.isFinite(op.size) || op.size<1 || op.size>80 || !Number.isFinite(op.opacity) || op.opacity<0 || op.opacity>1)return false;
    if(op.text && (typeof op.text!=="string" || op.text.length>80))return false;
    if(op.stamp && (!["star","heart","lightning","smile","crown","flower","spark"].includes(op.stamp)))return false;
    if(!Array.isArray(op.pts) || op.pts.length<1 || op.pts.length>190)return false;
    return op.pts.every(p=>Array.isArray(p) && p.length>=2 && p.length<=3 && p.every(n=>typeof n==="number" && Number.isFinite(n) && n>=0 && n<=1000));
  });
};

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin")||"";
  const responseOrigin=origins.has(origin)?origin:"https://chatspark-rc.vercel.app";
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "access-control-allow-origin":responseOrigin,
    "access-control-allow-methods":"GET, POST, OPTIONS",
    "access-control-allow-headers":"content-type,x-cs-visitor,authorization,apikey,x-client-info",
    "access-control-max-age":"7200","vary":"Origin"}});
  if(!origins.has(origin))return json({error:"Origin not allowed"},403,responseOrigin);
  if(!db)return json({error:"Server unavailable"},503,responseOrigin);
  try{
    const rateKey=await sign("rate|"+clientAddress(req));
    const voterKey=await sign("vote|"+clientAddress(req)+"|"+visitor(req));
    const networkKey=await sign("network|"+clientAddress(req));
    const finished=await db.rpc("cs_wall_finalize");
    if(finished.error)throw finished.error;
    if(req.method==="GET"){
      const url=new URL(req.url);
      const kind=url.searchParams.get("kind");
      const view=url.searchParams.get("view")==="hall"?"winner":"active";
      if(!["poem","graffiti"].includes(kind))err("Invalid wall type");
      await check(rateKey,"read",120,3600);
      const {data,error}=await db.from("cs_wall_entries")
        .select("id,kind,title,author_tag,body,artwork,art_hash,season_start,likes,status,created_at")
        .eq("kind",kind).eq("status",view)
        .order(view==="winner"?"season_start":"likes",{ascending:false})
        .order(view==="winner"?"likes":"created_at",{ascending:false})
        .limit(view==="winner"?24:35);
      if(error)throw error;
      return json({items:data||[],view,topSaved:5,season:"Weekly; UTC Monday reset"},200,responseOrigin);
    }
    if(req.method!=="POST")err("Method not allowed",405);
    const text=await req.text();
    if(text.length>66000)err("Submission exceeds the maximum size",413);
    const input=JSON.parse(text);
    const action=input.action;
    if(action==="post"){
      const kind=input.kind;
      if(!["poem","graffiti"].includes(kind))err("Invalid wall type");
      if(input.ageConfirmed!==true)err("Adult consent is required.");
      await check(rateKey,"post",3,86400);
      const title=safe(input.title,80);
      const author_tag=safe(input.author_tag,24)||"UNKNOWN";
      const body=kind==="poem" && typeof input.body==="string" ? input.body.normalize("NFKC").replace(/\r\n?/g,"\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g,"").trim().slice(0,1400) : null;
      const artwork=kind==="graffiti"?input.artwork:null;
      if(title.length<3)err("Give your creation a title (at least 3 characters).");
      if(kind==="poem" && (!body || body.length<8))err("Write at least eight characters.");
      if(kind==="graffiti"&&!artOk(artwork))err("Invalid or oversized graffiti. Try reducing strokes.");
      const hash=await sha(kind+"\n"+title+"\n"+(body||"")+"\n"+(artwork?JSON.stringify(artwork):""));
      const {data,error}=await db.from("cs_wall_entries").insert({
        kind,title,author_tag,body,artwork,
        creator_key:voterKey,art_hash:hash
      }).select("id,kind,title,author_tag,art_hash,created_at").single();
      if(error)throw error;
      const proofString=[data.id,data.kind,data.art_hash,data.created_at].join("|");
      const signature=await sign(proofString);
      return json({ok:true,entry:data,certificate:{signature,serial:"CS-"+data.id.slice(0,8).toUpperCase(),
        digest:data.art_hash,issued:data.created_at}},201,responseOrigin);
    }
    if(action==="like"){
      await check(rateKey,"like",45,86400);
      const id=String(input.id||"");
      if(!/^[0-9a-f-]{36}$/i.test(id))err("Invalid entry");
      const {data,error}=await db.rpc("cs_wall_like",{p_entry:id,p_actor:voterKey,p_network:networkKey});
      if(error)throw error;
      if(data===-2)err("You've already liked this creation.",409);
      if(data===-1)err("This round has ended.",410);
      return json({ok:true,likes:data},200,responseOrigin);
    }
    if(action==="report"){
      await check(rateKey,"report",8,86400);
      const id=String(input.id||"");
      if(!/^[0-9a-f-]{36}$/i.test(id))err("Invalid entry");
      const {data,error}=await db.rpc("cs_wall_flag",{p_entry:id,p_actor:voterKey,p_network:networkKey});
      if(error)throw error;
      return json({ok:true,hidden:data>=3},200,responseOrigin);
    }
    if(action==="verify"){
      await check(rateKey,"verify",35,3600);
      const data=input.certificate;
      if(!data || !/^[0-9a-f-]{36}$/i.test(data.id||"") || !["graffiti","poem"].includes(data.kind) ||
        !/^[a-f0-9]{64}$/i.test(data.digest||"") || typeof data.issued!=="string" || data.issued.length>70 ||
        !/^[a-f0-9]{64}$/i.test(data.signature||""))err("Invalid certificate");
      const expected=await sign([data.id,data.kind,data.digest,data.issued].join("|"));
      return json({valid:expected===data.signature,cryptography:"HMAC-SHA-256"},200,responseOrigin);
    }
    err("Unknown action");
  }catch(e){
    const status=Number.isInteger(e?.status)?e.status:500;
    if(status===500)console.error("[walls] request error:",e?.message);
    return json({error:status===500?"Service temporarily unavailable.":e.message},status,responseOrigin);
  }
});
