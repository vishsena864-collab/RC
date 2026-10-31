import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PILOT_GUIDES, PILOT_PATTERNS, PILOT_ROUTES, getPilotGuide, pilotGuidePath, pilotRobots } from "./pseo-pilot.js";

const countWords = str => str.split(/\s+/).filter(Boolean).length;
const tokenSet = str => new Set(str.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean));
const jaccard = (a,b) => {
  const x=tokenSet(a),y=tokenSet(b);
  return [...x].filter(t=>y.has(t)).length / new Set([...x,...y]).size;
};

test("Finite pilot inventory and no keyword permutations",()=>{
  assert.deepEqual(PILOT_PATTERNS,["conversation-starters","chat-safety"]);
  assert.equal(PILOT_GUIDES.length,6);
  assert.equal(PILOT_ROUTES.length,6);
  assert.equal(new Set(PILOT_GUIDES.map(pilotGuidePath)).size,6);
  for(const entry of PILOT_ROUTES) {
    assert.equal(entry.locale,"en");
    assert.ok(PILOT_PATTERNS.includes(entry.pattern));
    assert.ok(getPilotGuide(entry.pattern,entry.slug));
  }
  assert.equal(getPilotGuide("city","colombo"),null);
  assert.equal(getPilotGuide("conversation-starters","random-keyword"),null);
});

test("Every pilot route is blocked from indexing until manual release",()=>{
  assert.deepEqual(pilotRobots(),{index:false,follow:true});
  assert.ok(PILOT_GUIDES.every(g=>g.reviewStatus==="draft-unreviewed"));
  const sitemap=readFileSync(new URL("../app/sitemap.js",import.meta.url),"utf8");
  assert.ok(!sitemap.includes("/guides/"),"Pilot pages must not be added to sitemap");
  const page=readFileSync(new URL("../app/[locale]/guides/[pattern]/[slug]/page.jsx",import.meta.url),"utf8");
  assert.ok(page.includes("robots: pilotRobots()"));
  assert.ok(!page.includes("alternates:"));
});

test("Distinct descriptive drafts meet minimum usefulness checks",()=>{
  const titles=new Set(),descriptions=new Set(),h1s=new Set();
  for(const guide of PILOT_GUIDES){
    assert.ok(guide.title.length>=25&&guide.title.length<60,guide.title);
    assert.ok(guide.description.length>=90&&guide.description.length<155,guide.description);
    assert.ok(!titles.has(guide.title));
    assert.ok(!descriptions.has(guide.description));
    assert.ok(!h1s.has(guide.h1));
    titles.add(guide.title); descriptions.add(guide.description); h1s.add(guide.h1);
    assert.ok(countWords(guide.intro)>=65,guide.slug+" must have an original introduction");
    assert.ok(guide.approach.length>=3);
    assert.ok(guide.closing.length>85);
    assert.ok(guide.sourceLinks.length>=2);
    if(guide.pattern==="conversation-starters"){
      assert.ok(guide.prompts.length>=7);
      for(const p of guide.prompts)assert.ok(p.question&&p.followUp&&p.reason);
    } else {
      assert.ok(guide.steps.length>=5);
      assert.ok(guide.examples.length>=3);
      for(const step of guide.steps)assert.ok(step.heading&&step.explanation.length>65);
    }
  }
  for(let i=0;i<PILOT_GUIDES.length;i++)
    for(let j=i+1;j<PILOT_GUIDES.length;j++)
      assert.ok(jaccard(PILOT_GUIDES[i].intro,PILOT_GUIDES[j].intro)<0.46,"Intro content too similar");
});
