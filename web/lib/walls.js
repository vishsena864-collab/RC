// Public Edge Function: no client access to privileged database credentials.
export const WALL_ENDPOINT="https://lpbpjffnjbjwzdrcscko.supabase.co/functions/v1/chatspark-walls";
function visitor(){
  if(typeof window==="undefined")return "anonymous";
  const key="chatspark.wall.anon.v1";
  let id=localStorage.getItem(key);
  if(!id||!/^[a-f0-9-]{36}$/i.test(id)){
    id=crypto.randomUUID();localStorage.setItem(key,id);
  }
  return id;
}
async function request(url,method,body){
  const r=await fetch(url,{method,headers:{"content-type":"application/json","x-cs-visitor":visitor()},
    ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||"Something went wrong. Please retry.");
  return data;
}
export const loadWall=(kind,view="active")=>request(WALL_ENDPOINT+"?kind="+encodeURIComponent(kind)+"&view="+encodeURIComponent(view),"GET");
export const postWall=(body)=>request(WALL_ENDPOINT,"POST",{action:"post",...body});
export const likeWall=(id)=>request(WALL_ENDPOINT,"POST",{action:"like",id});
export const flagWall=(id)=>request(WALL_ENDPOINT,"POST",{action:"report",id});
export const verifyCard=(certificate)=>request(WALL_ENDPOINT,"POST",{action:"verify",certificate});
