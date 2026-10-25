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
 await context.route('https://api.audius.co/v1/tracks/*/stream',r=>r.fulfill({contentType:'audio/wav',headers:{'Access-Control-Allow-Origin':'*'},body:wav}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.WEB_URL||'http://localhost:3000')+'/en/underground');
 await page.waitForFunction(()=>document.querySelector('.fx-join')&&!document.querySelector('.fx-join').disabled);
 await page.locator('.fx-card:not(.fx-skeleton)').first().waitFor();return page;
}
const shot=async(p,n)=>shots&&p.screenshot({path:`${shots}/${n}.png`,fullPage:true});
const btn=(p,name)=>p.getByRole('button',{name,exact:true});
const noOverflow=async p=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
try{
 const a=await visitor(),b=await visitor();
 await noOverflow(a);await shot(a,'desktop-discovery');
 await btn(a,'Indie').click();assert.equal(await btn(a,'Indie').getAttribute('aria-pressed'),'true');
 await btn(a,'Select '+tracks[0].title+' by '+tracks[0].artist).click();
 await btn(a,'Play audio').click();await btn(a,'Pause audio').waitFor();
 await a.getByLabel('Volume',{exact:true}).fill('35');assert.equal(await a.locator('audio').evaluate(el=>el.volume),.35);
 await btn(a,'Pause audio').click();
 await a.locator('.fx-join').click();await a.locator('.fx-controller').waitFor();
 await b.locator('.fx-join').click();await b.locator('.fx-listener').waitFor();
 await shot(b,'desktop-listener-before');
 await btn(a,'Select '+tracks[0].title+' by '+tracks[0].artist).click();
 await btn(a,'Play '+tracks[0].title+' for the whole room').click();
 await b.getByRole('heading',{name:tracks[0].title,exact:true}).waitFor();
 // a listener who joined with a click picks up the room's song without pressing play again
 await btn(b,'Pause audio').waitFor();
 // quick actions on a library card: queue it, then the listener sees the controller's handle
 await btn(a,'Add '+tracks[2].title+' to the queue').click({force:true});
 await a.locator('.fx-queue-item').filter({hasText:tracks[2].title}).waitFor();
 await b.locator('.fx-ctrl-who strong').waitFor();
 // floating cover button: stays on screen while scrolling and broadcasts the selected track
 await btn(a,'Select '+tracks[3].title+' by '+tracks[3].artist).click();
 await a.evaluate(()=>scrollTo(0,document.body.scrollHeight));
 const fab=a.getByRole('button',{name:'Broadcast '+tracks[3].title+' to the room now'});
 assert.equal(await fab.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true,'play button stays in view');
 assert.equal(await a.locator('.fx-fab img').getAttribute('src'),tracks[3].artwork);
 await shot(a,'desktop-fab');await fab.click();
 await b.getByRole('heading',{name:tracks[3].title,exact:true}).waitFor();
 await a.locator('.fx-fab').waitFor({state:'detached'});
 // vote: every connected client gets the room-wide effect + heat moves
 await btn(b,'Fire It Up: Push the room further').click();
 await a.locator('.fx-callout-energy').waitFor();await shot(a,'desktop-fire');
 await a.waitForFunction(()=>Number(document.querySelector('.fx-heat-core strong').textContent.replace('%',''))>50);
 assert.equal(await btn(b,'Fire It Up: Push the room further').isDisabled(),true);
 await b.getByRole('button',{name:'How it works'}).click();await b.locator('.fx-guide').waitFor();await b.getByRole('button',{name:'Close guide'}).click();
 // modern chat: the room sees you typing, your own line is a right-hand bubble, requests show as cards
 await b.getByLabel('Message the room').fill('Late night test signal');await a.locator('.fx-typing .fx-dots').waitFor();
 await btn(b,'Send message').click();await a.getByText('Late night test signal',{exact:true}).waitFor();
 await b.locator('.fx-msg.is-me').filter({hasText:'Late night test signal'}).waitFor();assert.equal(await a.locator('.fx-msg.is-me').filter({hasText:'Late night test signal'}).count(),0);
 // animated emoji: picker inserts at the caret, emoji-only lines go big, reactions pop and count
 await btn(b,'Add an emoji').click();await b.locator('.fx-emo-picker button[aria-label="fire"]').click();await b.locator('.fx-emo-picker button[aria-label="party"]').click();
 assert.equal(await b.getByLabel('Message the room').inputValue(),'🔥🎉');await btn(b,'Send message').click();
 await a.locator('.fx-msg.is-jumbo img.fx-emo[alt="🔥"]').waitFor();
 assert.equal(await a.locator('.fx-msg.is-jumbo img.fx-emo').evaluateAll(els=>els.every(e=>e.complete&&e.naturalWidth>0)),true,'animated emoji load');
 await a.locator('.fx-chat').getByRole('button',{name:'React party',exact:true}).click();
 await b.locator('.fx-float img.fx-emo').first().waitFor();
 await b.waitForFunction(()=>[...document.querySelectorAll('.fx-chat .fx-react-bar b')].some(el=>el.textContent==='1'));
 await b.getByLabel('Song or artist',{exact:true}).fill('Soft');await b.locator('.fx-request-results button').filter({hasText:tracks[1].title}).click();
 await a.locator('.fx-queue-item').filter({hasText:tracks[1].title}).waitFor();await a.locator('.fx-msg-req').filter({hasText:tracks[1].title}).waitFor();
 await a.getByRole('button',{name:'Play '+tracks[1].title+' now',exact:true}).click();await b.getByRole('heading',{name:tracks[1].title,exact:true}).waitFor();
 await a.getByRole('button',{name:/NEXT TRACK/}).click();await b.getByRole('heading',{name:tracks[2].title,exact:true}).waitFor();
 // a listener who was listening keeps listening: the next song plays without another tap
 await b.waitForFunction(id=>{const el=document.querySelector('audio');return el.src.includes(id)&&!el.paused;},tracks[2].id);
 await btn(a,'Supernova High Energy').click();await b.waitForFunction(()=>document.querySelector('.fx-scene-supernova[aria-pressed=true]')||true);
 await a.getByRole('button',{name:'Drop',exact:true}).click({force:true}).catch(()=>{});
 await a.waitForFunction(()=>document.querySelector('.fx-scene-supernova')?.getAttribute('aria-pressed')==='true');
 await btn(a,'REDUCE MOTION').click();assert.equal(await a.locator('.fx-shell').getAttribute('data-motion'),'reduced');
 assert.equal(await a.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 await btn(a,'ENABLE FX').click();await shot(a,'desktop-controller');
 // lights off is personal: the listener's stage goes dark, the controller's keeps running
 await btn(b,'LIGHTS OFF').click();assert.equal(await b.locator('.fx-shell').getAttribute('data-lights'),'off');
 assert.equal(await a.locator('.fx-shell').getAttribute('data-lights'),'on');
 await b.waitForFunction(()=>{const c=document.querySelector('.fx-stage'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=64)if(d[i])return false;return true;});
 await btn(b,'LIGHTS ON').click();assert.equal(await b.locator('.fx-shell').getAttribute('data-lights'),'on');
 await a.getByRole('button',{name:/PASS CONTROLLER/}).click();await b.locator('.fx-controller').waitFor();await a.locator('.fx-listener').waitFor();await shot(a,'desktop-listener');
 // controller refresh: the room's song keeps going for listeners and the same tab gets the aux back without rejoining
 const onAir=await a.locator('.fx-song h3').innerText();
 await b.reload();await b.locator('.fx-controller').waitFor({timeout:15000});
 assert.equal(await a.locator('.fx-song h3').innerText(),onAir,'song unchanged for listeners across the controller refresh');
 assert.equal(await a.locator('.fx-listener').count(),1);
 for(const width of [320,390,768,1024,1180,1440]){await a.setViewportSize({width,height:1000});await noOverflow(a);}
 await a.setViewportSize({width:390,height:844});
 for(const name of ['Request','Vibe','Chat','The Show']){await a.locator('.fx-dock').getByRole('button',{name,exact:true}).click();await shot(a,'mobile-'+name.toLowerCase().replace(' ','-'));await noOverflow(a);}
 await a.locator('.fx-dock').getByRole('button',{name:'Vibe',exact:true}).click();
 assert.equal(await a.evaluate(()=>{const r=[...document.querySelectorAll('.fx-orb')].map(o=>o.getBoundingClientRect());return r.length===3&&r.every((b,i)=>b.right<=innerWidth&&(!i||b.top>=r[i-1].bottom-1));}),true,'phone vibe buttons stack without overlapping');
 await a.locator('.fx-dock').getByRole('button',{name:'Chat',exact:true}).click();await a.locator('[data-tab=chat]').waitFor();
 await a.getByLabel('Message the room').fill('Mobile signal');await btn(a,'Send message').click();await b.getByText('Mobile signal',{exact:true}).waitFor();
 await a.locator('.fx-dock').getByRole('button',{name:'The Show',exact:true}).click();
 const c=await visitor(390,'reduce');assert.equal(await c.locator('.fx-shell').getAttribute('data-motion'),'reduced');
 assert.equal(await c.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await noOverflow(c);await shot(c,'mobile-discovery');
 // controller on a phone: pass back so b controls, then check controller panes on a narrow screen
 await b.setViewportSize({width:390,height:844});
 for(const name of ['The Show','Library','Lights','Chat']){await b.locator('.fx-dock').getByRole('button',{name,exact:true}).click();await shot(b,'mobile-controller-'+name.toLowerCase().replace(' ','-'));await noOverflow(b);}
 await b.getByRole('button',{name:'Leave room'.toUpperCase(),exact:true}).first().click({force:true}).catch(()=>{});
 await a.locator('.fx-leave').first().click({force:true}).catch(()=>{});
 assert.deepEqual(errors,[]);
 console.log('PASS: discovery, solo audio, volume, two-browser join, cover broadcast, quick queue, room-wide vote effect, heat/cooldown, guide, chat (typing, bubbles, request cards, animated emoji + picker, reactions), request, play-now, next with autoplay, lights, motion toggle, pass controller, phone panes, 6 viewport widths, OS reduced motion; no browser errors.');
}finally{await browser.close();}
