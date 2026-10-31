import test from "node:test";
import assert from "node:assert/strict";
import {parsePage,parseSitemap,auditPublicSite,toMarkdown} from "./seo-public-monitor.mjs";

const BASE="https://chatsparkrc.com";
const paths=["/en","/es","/pt","/fr","/de","/en/safety","/en/chat/general","/en/chat/music",
  "/en/underground","/en/poem-wall","/en/graffiti-wall","/en/start","/es/underground"];
const sitemapPaths=paths.filter(p=>!["/en/start","/es/underground"].includes(p));

function html(url, {noindex=false,canonical=true}={}) {
  const href = canonical ? `<link rel="canonical" href="${url}"/>` : "";
  const alternate= /^\\/(en|es|pt|fr|de)$/.test(new URL(url).pathname)
    ? ["en","es","pt","fr","de"].map(l=>
      `<link rel="alternate" hreflang="${l}" href="${BASE}/${l}"/>`).join("")
    : "";
  return `<!doctype html><html><head><title>ChatSpark page</title>
    <meta name="description" content="A useful, readable introduction to ChatSpark"/>
    ${noindex?'<meta name="robots" content="noindex,follow"/>':""}
    ${href}${alternate}</head><body><h1>Chat with strangers</h1></body></html>`;
}
function fakeFetcher(url) {
  if(url.endsWith("/robots.txt"))return Promise.resolve(new Response("User-agent: *\\nAllow: /\\nSitemap: "+BASE+"/sitemap.xml",{
    status:200,headers:{"content-type":"text/plain"}
  }));
  if(url.endsWith("/sitemap.xml"))return Promise.resolve(new Response(
    `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(p=>`<url><loc>${BASE+p}</loc></url>`).join("")}</urlset>`,
    {status:200,headers:{"content-type":"application/xml"}}
  ));
  const p=new URL(url).pathname;
  if(!paths.includes(p))return Promise.resolve(new Response("missing",{status:404}));
  return Promise.resolve(new Response(html(url,{noindex:p==="/en/start"}),{
    status:200,headers:{"content-type":"text/html;charset=UTF-8"}
  }));
}
test("Extract canonical, text, robots and hreflang from server HTML",()=>{
  const p=parsePage('<title>Sample &amp; Test</title><meta content="noindex,follow" name="robots"/>'+
    '<link href="https://chatsparkrc.com/en" rel="canonical"/>'+
    '<link hreflang="es" href="https://chatsparkrc.com/es" rel="alternate"/>'+
    '<h1><span>Useful</span> headline</h1>');
  assert.equal(p.title,"Sample & Test");
  assert.equal(p.canonical,BASE+"/en");
  assert.equal(p.alternates.es,BASE+"/es");
  assert.equal(p.robots,"noindex,follow");
  assert.equal(p.h1Count,1);
  assert.equal(p.h1,"Useful headline");
});
test("Identify duplicate sitemap URLs without pretending Google indexed them",()=>{
  const xml='<urlset><url><loc>https://chatsparkrc.com/en</loc></url>'+
    '<url><loc>https://chatsparkrc.com/en</loc></url></urlset>';
  const parsed=parseSitemap(xml);
  assert.equal(parsed.urls.length,2);
  assert.equal(parsed.duplicates.length,1);
});
test("Thirteen-page read-only audit reports no fabricated Search Console numbers",async()=>{
  const result=await auditPublicSite({baseUrl:BASE,fetcher:fakeFetcher,timeoutMs:500});
  assert.equal(result.checks.pages,13);
  assert.equal(result.checks.errors,0);
  assert.equal(result.googleClicks,null);
  assert.equal(result.googleImpressions,null);
  assert.equal(result.googleIndexedURLs,null);
  assert.equal(result.pages.find(p=>p.path==="/en/start").noindex,true);
  assert.ok(result.checks.warnings>0); // Draft English-only /es/underground is still indexable.
  assert.ok(toMarkdown(result).includes("Not measured"));
});
test("Public outages produce an error, not an indexing status claim",async()=>{
  async function broken(url){
    if(url.endsWith("/robots.txt"))throw Error("Simulated DNS failure");
    return fakeFetcher(url);
  }
  const result=await auditPublicSite({baseUrl:BASE,fetcher:broken,timeoutMs:500});
  assert.ok(result.checks.errors>=1);
  assert.equal(result.robots.status,null);
  assert.equal(result.googleIndexedURLs,null);
});
