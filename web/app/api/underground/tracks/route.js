// Read-only Audius discovery. Metadata only; song bytes never cross ChatSpark's server.
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const API = "https://api.audius.co/v1";
export async function GET(request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0,80) || "";
  const url = new URL(API + (query ? "/tracks/search" : "/tracks/trending"));
  url.searchParams.set("limit", "18");
  if(query) url.searchParams.set("query",query);
  if(process.env.AUDIUS_API_KEY) url.searchParams.set("api_key",process.env.AUDIUS_API_KEY);
  try {
    const upstream = await fetch(url,{headers:{"accept":"application/json"},signal:AbortSignal.timeout(9000),next:{revalidate:0}});
    if(!upstream.ok) throw new Error("Audius unavailable");
    const response = await upstream.json();
    const rows = (Array.isArray(response.data) ? response.data : []).filter(t=>t && t.id && t.title && !t.is_delete && !t.is_unlisted && !t.is_stream_gated && !t.is_scheduled);
    const tracks = rows.slice(0,18).map(t=>({id:String(t.id),title:String(t.title).slice(0,120),artist:String(t.user?.name||t.user?.handle||"Unknown artist").slice(0,90),genre:String(t.genre||""),duration:Number(t.duration)||0,artwork:t.artwork?.["480x480"]||t.artwork?.["150x150"]||null,permalink:typeof t.permalink==="string" && t.permalink.startsWith("https://audius.co/")?t.permalink:null}));
    return NextResponse.json({tracks},{headers:{"Cache-Control":"public, s-maxage=25, stale-while-revalidate=40"}});
  } catch {return NextResponse.json({tracks:[],error:"Music discovery is temporarily unavailable."},{status:503});}
}
