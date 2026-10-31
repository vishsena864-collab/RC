// Public, read-only SEO health monitor. Never queries Google search results or
// claims to access Google Search Console. No keys/cookies/analytics are needed.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CANONICAL = "https://chatsparkrc.com";
const PAGES = [
  { path: "/en", expectation: "index", role: "English homepage" },
  { path: "/es", expectation: "index", role: "Spanish homepage" },
  { path: "/pt", expectation: "index", role: "Portuguese homepage" },
  { path: "/fr", expectation: "index", role: "French homepage" },
  { path: "/de", expectation: "index", role: "German homepage" },
  { path: "/en/safety", expectation: "index", role: "Safety information" },
  { path: "/en/chat/general", expectation: "index", role: "General chat topic" },
  { path: "/en/chat/music", expectation: "index", role: "Music chat topic" },
  { path: "/en/underground", expectation: "index", role: "Underground FM" },
  { path: "/en/poem-wall", expectation: "index", role: "Poem Wall" },
  { path: "/en/graffiti-wall", expectation: "index", role: "Graffiti Wall" },
  { path: "/en/start", expectation: "noindex", role: "Interactive chat app" },
  { path: "/es/underground", expectation: "translation-pending", role: "Untranslated feature replica" }
];

function unescapeHtml(s = "") {
  return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
function attr(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*(['\"])([\\s\\S]*?)\\1", "i"));
  return match ? unescapeHtml(match[2]) : null;
}
function stripMarkup(html) {
  return unescapeHtml(html.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim());
}
export function parsePage(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
  const headerMatches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const canonicalTag = linkTags.find(t => attr(t,"rel")?.toLowerCase() === "canonical");
  const descriptionTag = metaTags.find(t => attr(t,"name")?.toLowerCase() === "description");
  const robotsTag = metaTags.find(t => attr(t,"name")?.toLowerCase() === "robots");
  const alternates = {};
  for (const tag of linkTags) {
    if (attr(tag,"rel")?.toLowerCase() !== "alternate") continue;
    const lang=attr(tag,"hreflang");
    const href=attr(tag,"href");
    if (lang && href) alternates[lang]=href;
  }
  return {
    title: titleMatch ? stripMarkup(titleMatch[1]) : "",
    description: descriptionTag ? attr(descriptionTag,"content") : "",
    canonical: canonicalTag ? attr(canonicalTag,"href") : null,
    robots: robotsTag ? attr(robotsTag,"content") : "",
    h1Count: headerMatches.length,
    h1: headerMatches[0] ? stripMarkup(headerMatches[0][1]).slice(0,250) : "",
    alternates
  };
}
export function parseSitemap(xml) {
  const urls=[...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)]
    .map(m=>unescapeHtml(m[1].trim()));
  // Next.js uses url nodes, not a sitemap index.
  return { urls, duplicates:urls.filter((u,i)=>urls.indexOf(u)!==i),
    hasSitemap: /<urlset\b/i.test(xml), hasIndex: /<sitemapindex\b/i.test(xml) };
}
function sameCanonical(current, expected) {
  const normalize = s=>{try{const u=new URL(s);return u.origin+u.pathname.replace(/\/$/,"")+(u.search||"");}catch{return s;}};
  return normalize(current)===normalize(expected);
}
async function getText(url, fetcher, timeoutMs) {
  const started=Date.now();
  try {
    const res=await fetcher(url,{redirect:"follow",signal:AbortSignal.timeout(timeoutMs),
      headers:{"Accept":"text/html,application/xml,text/plain;q=0.8","User-Agent":"ChatSparkSEOHealth/1.0 (public metadata checker)"}});
    // Guard against unexpectedly huge pages or error dumps.
    const text=(await res.text()).slice(0,1_800_000);
    return {url,status:res.status,ok:res.ok,finalUrl:res.url||url,
      mime:res.headers.get("content-type")||"",text,
      xRobots:res.headers.get("x-robots-tag")||"",elapsedMs:Date.now()-started};
  } catch (e) {
    return {url,status:null,ok:false,finalUrl:null,mime:"",text:"",
      xRobots:"",elapsedMs:Date.now()-started,error:String(e?.message||e)};
  }
}
function note(bucket,level,message) {bucket.push({level,message});}
function looksNoindex(meta,xrobots) {
  return /(?:^|[,\s])noindex(?:[,\s]|$)/i.test((meta||"")+" "+(xrobots||""));
}
export async function auditPublicSite({baseUrl=CANONICAL,fetcher=fetch,timeoutMs=18000}={}) {
  const base=baseUrl.replace(/\/$/,"");
  const start=new Date().toISOString();
  const issues=[],pages=[];
  const [robots,sitemap]=await Promise.all([
    getText(base+"/robots.txt",fetcher,timeoutMs),
    getText(base+"/sitemap.xml",fetcher,timeoutMs)
  ]);
  if(!robots.ok)note(issues,"error","Cannot retrieve robots.txt: "+(robots.status||robots.error));
  else {
    if(!/^sitemap:\s*https?:\/\//im.test(robots.text))note(issues,"warning","robots.txt has no sitemap declaration");
    if(!robots.text.includes(base+"/sitemap.xml"))note(issues,"warning","robots.txt does not reference expected canonical sitemap");
    if(/^disallow:\s*\/\s*$/im.test(robots.text))note(issues,"error","robots.txt disallows root crawling");
  }
  if(!sitemap.ok)note(issues,"error","Cannot retrieve sitemap.xml: "+(sitemap.status||sitemap.error));
  const parsed=sitemap.ok?parseSitemap(sitemap.text):{urls:[],duplicates:[],hasSitemap:false,hasIndex:false};
  if(sitemap.ok&&!parsed.hasSitemap)note(issues,"error","Expected a sitemap URL set; inspect XML response");
  if(parsed.duplicates.length)note(issues,"error","Duplicate sitemap URLs: "+parsed.duplicates.length);
  if(parsed.urls.length && parsed.urls.length<40)note(issues,"warning","Unexpectedly small sitemap: "+parsed.urls.length+" URLs");
  for (const url of parsed.urls) {
    if(!url.startsWith(base+"/")) note(issues,"warning","Sitemap contains non-canonical host or URL: "+url);
    if(/\/start(?:\/|$)|\/guides\//.test(url))note(issues,"error","Noindex or draft URL included in sitemap: "+url);
  }
  for (const important of ["/en","/en/underground","/en/poem-wall","/en/graffiti-wall"]) {
    if(parsed.urls.length && !parsed.urls.some(u=>sameCanonical(u,base+important)))
      note(issues,"warning","Core page absent from current sitemap: "+important);
  }
  // Limit concurrency and public traffic to three low-volume fetches at a time.
  for(let i=0;i<PAGES.length;i+=3) {
    const chunk=PAGES.slice(i,i+3);
    const response=await Promise.all(chunk.map(p=>getText(base+p.path,fetcher,timeoutMs)));
    chunk.forEach((p,j)=>{
      const res=response[j],messages=[];
      const meta=res.ok?parsePage(res.text):null;
      if(!res.ok)note(messages,"error","HTTP/network failure: "+(res.status||res.error));
      else{
        if(!res.mime.includes("text/html"))note(messages,"error","Unexpected content-type: "+res.mime);
        if(!res.finalUrl?.startsWith(base+"/"))note(messages,"warning","Final URL leaves canonical domain: "+res.finalUrl);
        if(!meta.title)note(messages,"error","Missing HTML title");
        if(!meta.description)note(messages,"warning","Missing meta description");
        if(meta.h1Count!==1)note(messages,"warning","Expected exactly one H1, got "+meta.h1Count);
        const noindex=looksNoindex(meta.robots,res.xRobots);
        if(p.expectation==="index"){
          if(noindex)note(messages,"error","An intended indexable page has a noindex tag");
          if(!sameCanonical(meta.canonical,base+p.path))
            note(messages,"error","Canonical missing or not self-referencing: "+(meta.canonical||"none"));
        }else if(p.expectation==="noindex"){
          if(!noindex)note(messages,"error","Interactive app is missing noindex");
        }else if(p.expectation==="translation-pending"&&!noindex){
          note(messages,"warning","Non-English experience still indexable with English-language main content; Phase 6 release pending");
        }
        if(["/en","/es","/pt","/fr","/de"].includes(p.path)&&Object.keys(meta.alternates).length<5)
          note(messages,"warning","Homepage has fewer than five alternate hreflang tags");
      }
      pages.push({path:p.path,role:p.role,expected:p.expectation,status:res.status,
        latencyMs:res.elapsedMs,redirectedTo:res.finalUrl,
        title:meta?.title||"",description:meta?.description||"",
        h1:meta?.h1||"",h1Count:meta?.h1Count??0,
        canonical:meta?.canonical||null,noindex:meta?looksNoindex(meta.robots,res.xRobots):null,
        alternateCount:meta?Object.keys(meta.alternates).length:0,
        issues:messages});
      issues.push(...messages.map(x=>({...x,page:p.path})));
    });
  }
  return {
    inspectedAtUTC:start, baseUrl:base, source:"Public-site HTML and sitemap only — NOT Search Console",
    googleIndexedURLs:null,googleClicks:null,googleImpressions:null,organicConversionRate:null,
    robots:{status:robots.status,elapsedMs:robots.elapsedMs,error:robots.error||null},
    sitemap:{status:sitemap.status,urlCount:parsed.urls.length,duplicateCount:parsed.duplicates.length,
      hasSitemap:parsed.hasSitemap,urls:parsed.urls},
    checks:{pages:pages.length,errors:issues.filter(x=>x.level==="error").length,
      warnings:issues.filter(x=>x.level==="warning").length},
    issues,pages
  };
}
export function toMarkdown(data) {
  const s=data.checks;
  const lines=[
    "# ChatSpark — Public SEO Endpoint Check",
    "",
    "**UTC check:** "+data.inspectedAtUTC,
    "**Base URL:** "+data.baseUrl,
    "**Scope:** public HTTP, HTML, canonical, robots, hreflang and sitemap only.",
    "**Not measured:** Google Search Console verification, actual indexing, impressions, clicks, ranks or backlinks.",
    "",
    "| Pages checked | Errors | Warnings | Sitemap URLs |",
    "|---:|---:|---:|---:|",
    "| "+s.pages+" | "+s.errors+" | "+s.warnings+" | "+data.sitemap.urlCount+" |",
    "",
    "## Inspected URLs",
    "| Route | HTTP | Expected | Canonical | Noindex | Finding |",
    "|---|---:|---|---|---|---|",
    ...data.pages.map(p=>
      "| `"+p.path+"` | "+(p.status??"N/A")+" | "+p.expected+
      " | "+(p.canonical||"—").replaceAll("|","\\|")+" | "+
      (p.noindex===null?"Unknown":p.noindex?"Yes":"No")+" | "+
      (p.issues.length?p.issues.map(x=>x.level+": "+x.message).join("; "):"OK").replaceAll("|","\\|")+" |"
    ),
    "",
    "## Priority findings",
    ...(data.issues.length?data.issues.map(x=>"- **"+x.level.toUpperCase()+"**"+(x.page?" ("+x.page+")":"")+": "+x.message):["- No issues detected in the public checks. This does not establish Google index status."]),
    "",
    "## Search Console follow-up",
    "- Confirm `sc-domain:chatsparkrc.com` DNS property ownership in Google Search Console.",
    "- Inspect live URLs using Search Console's URL Inspection tool (Google-indexed and live test are separate).",
    "- Check Sitemaps and Pages indexing reports; export Performance → Pages and Queries by country and device.",
    "- Compare the exported GSC report with these technical observations. Do not infer impressions or rankings from this report.",
    ""
  ];
  return lines.join("\n");
}
async function run() {
  const out=resolve(process.env.CHATSPARK_SEO_OUTPUT||"seo-health-reports");
  const base=process.env.CHATSPARK_SEO_BASE||CANONICAL;
  const result=await auditPublicSite({baseUrl:base});
  await mkdir(out,{recursive:true});
  const stamp=result.inspectedAtUTC.slice(0,10);
  await Promise.all([
    writeFile(resolve(out,"seo-public-"+stamp+".json"),JSON.stringify(result,null,2)+"\n"),
    writeFile(resolve(out,"seo-public-"+stamp+".md"),toMarkdown(result)+"\n"),
    writeFile(resolve(out,"seo-public-latest.md"),toMarkdown(result)+"\n"),
  ]);
  process.stdout.write("SEO technical check "+result.inspectedAtUTC+
    ": "+result.checks.errors+" errors; "+result.checks.warnings+" warnings; "+
    result.sitemap.urlCount+" sitemap URLs. No Google account data was accessed.\n");
  if(result.checks.errors>0)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  run().catch(e=>{console.error("SEO monitor fatal:",e);process.exitCode=1});
}
