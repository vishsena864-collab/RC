// Read-only Audius discovery. Metadata only; song bytes never cross ChatSpark's server.
import { NextResponse } from "next/server";
import { MIX_GENRES, dealMix, mixPlan } from "@/lib/mix";
export const dynamic = "force-dynamic";
const API = "https://api.audius.co/v1";
const clean = (t) => t && t.id && t.title && !t.is_delete && !t.is_unlisted && !t.is_stream_gated && !t.is_scheduled;
const shape = (t) => ({id:String(t.id),title:String(t.title).slice(0,120),artist:String(t.user?.name||t.user?.handle||"Unknown artist").slice(0,90),genre:String(t.genre||""),duration:Number(t.duration)||0,artwork:t.artwork?.["480x480"]||t.artwork?.["150x150"]||null,permalink:typeof t.permalink==="string" && t.permalink.startsWith("https://audius.co/")?t.permalink:null});
async function feed(path, params, limit) {
  const url = new URL(API + path);
  url.searchParams.set("limit", String(limit));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  if (process.env.AUDIUS_API_KEY) url.searchParams.set("api_key", process.env.AUDIUS_API_KEY);
  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await fetch(url, {headers:{"accept":"application/json"},signal:AbortSignal.timeout(9000),cache:"no-store"});
      if (!upstream.ok) {
        if ((upstream.status === 429 || upstream.status >= 500) && attempt === 0) continue;
        throw new Error(`Audius HTTP ${upstream.status} on ${path}`);
      }
      response = await upstream.json();
      break;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  return (Array.isArray(response.data) ? response.data : []).filter(clean).map(shape);
}
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0,80) || "";
  const page = Math.max(0,Math.min(30,Number.parseInt(params.get("page")||"0",10)||0));
  // a thousand seeds is plenty of variety and keeps the edge cache useful (and the upstream fan-out bounded)
  const seed = Math.abs(Number.parseInt(params.get("seed")||"0",10)||0) % 1000;
  try {
    // a typed search stays a search; no query or a genre chip gets a fresh mix from many feeds
    if (query && !MIX_GENRES[query]) {
      const tracks = (await feed("/tracks/search", {query, offset: page*24}, 24)).slice(0,24);
      return NextResponse.json({tracks,page,hasMore:tracks.length===24},{headers:{"Cache-Control":"public, s-maxage=25, stale-while-revalidate=40"}});
    }
    const settled = await Promise.allSettled(mixPlan(seed, page, query || null).map(([, path, p]) => feed(path, p, 12)));
    const buckets = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
    if (!buckets.length) throw new Error("All Audius feeds failed");
    const tracks = dealMix(seed + page, buckets);
    return NextResponse.json({tracks,page,seed,hasMore:tracks.length>=12},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=120"}});
  } catch (error) {
    console.error("[underground/tracks] Audius discovery failed:", error);
    return NextResponse.json({tracks:[],error:"Music discovery is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
