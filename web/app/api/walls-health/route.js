import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
// Minimal health probe — does not expose moderation records or database secrets.
export async function GET(){
 try{
  const upstream=await fetch("https://lpbpjffnjbjwzdrcscko.supabase.co/functions/v1/chatspark-walls?kind=poem&view=active",{
   headers:{Origin:"https://chatsparkrc.com","x-cs-visitor":"health-probe"},
   cache:"no-store",signal:AbortSignal.timeout(8000)
  });
  const data=await upstream.json().catch(()=>({}));
  return NextResponse.json({available:upstream.ok,service:upstream.ok?"healthy":"unhealthy",
    returnedItems:Array.isArray(data.items)?data.items.length:undefined,
    error:upstream.ok?undefined:String(data.error||"Upstream unavailable").slice(0,100)},{
    status:upstream.ok?200:503,headers:{"cache-control":"private, max-age=0, s-maxage=60"}
  });
 }catch{return NextResponse.json({available:false,service:"unreachable"},{status:503});}
}
