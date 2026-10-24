// Production web on :3000, real room server on :4000. Metadata/audio are fixtures.
// CHROME_PATH=/path/to/chrome SHOTS_DIR=/tmp/fm node underground.e2e.mjs
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
const errors=[],shots=process.env.SHOTS_DIR;
if(shots)await mkdir(shots,{recursive:true});
const tracks=['After the Last Train','Soft Focus','Night Service','A Quiet Frequency','Side Streets','Until Morning'].map((title,i)=>({id:'fmtest'+i,title,artist:['Night Assembly','Low Season','Tape Studies'][i%3],duration:180,genre:'Electronic',artwork:`https://node.audius.co/content/fmtest${i}/480x480.jpg`}));
const wav=Buffer.alloc(44+8000*2*180);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
async function visitor(width=1440,motion='no-preference'){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:motion});
 await context.route('**/api/underground/tracks?*',r=>r.fulfill({json:{tracks,hasMore:false}}));
 await context.route('https://node.audius.co/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="#77795a"/><circle cx="240" cy="240" r="160" fill="#1b2119"/><circle cx="240" cy="240" r="52" fill="#ced9a0"/><path d="M0 340L480 50" stroke="#e2d4b8" stroke-width="12"/></svg>'}));
 await context.route('https://api.audius.co/v1/tracks/*/stream',r=>r.fulfill({contentType:'audio/wav',body:wav}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.WEB_URL||'http://localhost:3000')+'/en/underground');
 await page.waitForFunction(()=>document.querySelector('.show-join')&&!document.querySelector('.show-join').disabled);
 await page.locator('.show-track').first().waitFor();return page;
}
const shot=async(p,n)=>shots&&p.screenshot({path:`${shots}/${n}.png`,fullPage:true});
const btn=(p,name)=>p.getByRole('button',{name,exact:true});
const noOverflow=async p=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
try{
 const a=await visitor(),b=await visitor();
 await noOverflow(a);await shot(a,'desktop-discovery');
 await btn(a,'Indie').click();assert.equal(await btn(a,'Indie').getAttribute('aria-pressed'),'true');
 await a.locator('.show-track').filter({hasText:tracks[0].title}).click();
 await btn(a,'Play audio').click();await btn(a,'Pause audio').waitFor();
 await a.getByLabel('Volume',{exact:true}).fill('35');assert.equal(await a.locator('audio').evaluate(el=>el.volume),.35);
 await btn(a,'Pause audio').click();
 await a.locator('.show-join').click();await a.locator('.fm-controller-view').waitFor();
 await b.locator('.show-join').click();await b.locator('.fm-listener-view').waitFor();
 await a.locator('.show-track').filter({hasText:tracks[0].title}).click();
 await btn(a,'Play '+tracks[0].title+' for the whole room').click();
 await b.getByRole('heading',{name:tracks[0].title,exact:true}).waitFor();
 assert.match(await a.locator('.show-track').last().innerText(),new RegExp(tracks[0].title));
 await btn(b,'Play audio').click();await btn(b,'Pause audio').waitFor();
 await btn(b,'FIRE IT UP: Push the room further').click();
 await a.waitForFunction(()=>Number(document.querySelector('.fm-real-reactor-value strong').textContent.replace('%',''))>50);
 assert.equal(await btn(b,'FIRE IT UP: Push the room further').isDisabled(),true);
 await a.getByRole('button',{name:'HOW IT WORKS'}).click();await a.locator('.fm-real-vibe-guide').waitFor();await a.getByRole('button',{name:'CLOSE GUIDE'}).click();
 await b.getByLabel('Message the room').fill('Late night test signal');await btn(b,'Send message').click();await a.getByText('Late night test signal',{exact:true}).waitFor();
 await b.getByLabel('Song or artist',{exact:true}).fill('Soft');await b.locator('.fm-request-results button').filter({hasText:tracks[1].title}).click();
 await a.locator('.show-queue-item').filter({hasText:tracks[1].title}).waitFor();
 await a.getByRole('button',{name:'NEXT TRACK'}).click();await b.getByRole('heading',{name:tracks[1].title,exact:true}).waitFor();
 await btn(a,'Supernova High Energy').click();await b.waitForFunction(()=>document.querySelector('.show-fx-crossfire'));
 await btn(a,'REDUCE MOTION').click();assert.equal(await a.locator('.fm-show-shell').getAttribute('data-motion'),'reduced');
 assert.equal(await a.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 await btn(a,'ENABLE FX').click();await shot(a,'desktop-controller');
 await a.getByRole('button',{name:'PASS CONTROLLER'}).click();await b.locator('.fm-controller-view').waitFor();await a.locator('.fm-listener-view').waitFor();await shot(a,'desktop-listener');
 for(const width of [320,390,768,1024,1440]){await a.setViewportSize({width,height:1000});await noOverflow(a);}
 await a.setViewportSize({width:390,height:844});await a.locator('.show-mobile-dock').getByRole('button',{name:'ROOM CHAT'}).click();await a.locator('.chat-expanded').waitFor();
 await a.getByLabel('Message the room').fill('Mobile signal');await btn(a,'Send message').click();await b.getByText('Mobile signal',{exact:true}).waitFor();await shot(a,'mobile-chat');
 await a.getByRole('button',{name:'RETURN TO THE SHOW'}).click();await a.locator('.chat-expanded').waitFor({state:'hidden'});await shot(a,'mobile-listener');
 const c=await visitor(390,'reduce');assert.equal(await c.locator('.fm-show-shell').getAttribute('data-motion'),'reduced');
 assert.equal(await c.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await noOverflow(c);await shot(c,'mobile-discovery');
 await b.locator('.show-leave').click();await b.locator('.fm-discover-view').waitFor();await a.locator('.fm-controller-view').waitFor();await a.locator('.show-leave').click();
 assert.deepEqual(errors,[]);
 console.log('PASS: discovery, solo audio, volume, two-browser join, cover broadcast, track rotation, heat/cooldown, guide, chat, request/next, lights, motion toggle, pass controller, leave, mobile chat, 5 viewport widths, OS reduced motion; no browser errors.');
}finally{await browser.close();}
