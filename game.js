(() => {
"use strict";
const $ = id => document.getElementById(id);
const el = {
 intro:$("intro-screen"),game:$("game-screen"),over:$("over-screen"),start:$("start-button"),restart:$("restart-button"),
 timer:$("timer"),final:$("final-time"),message:$("game-message"),best:$("best-time"),headline:$("loss-headline"),
 badge:$("new-best-badge"),ring:$("ring-progress"),mode:$("mode-select"),stage:$("timer-stage"),
 modeLabel:$("mode-label"),survival:$("survival-label"),events:$("event-counter"),panel:$("info-panel"),
 panelTitle:$("panel-title"),panelContent:$("panel-content"),toast:$("toast"),notification:$("notification-layer"),
 fake:$("fake-overlay"),temptation:$("temptation"),sound:$("sound-toggle")
};
const KEY="do-nothing-v2";
const C=2*Math.PI*132;
const MODES={normal:"NORMAL",hardcore:"HARDCORE",blind:"BLIND",anxiety:"ANXIETY",invisible:"INVISIBLE",minute:"ONE MINUTE",impossible:"IMPOSSIBLE"};
const whispers=[
"Relax. It's literally your only job.","Don't even think about touching that mouse.","Your mouse misses you. Ignore it.",
"Doing nothing is harder than it looks, huh?","Your brain: Should we do something? You: NO.","Five minutes of zero achievements. Beautiful.",
"LinkedIn can't turn this into a success story.","You could've watched an entire episode. But here you are.",
"Your hand just twitched. We saw that.","Imagine explaining this to your future self.","You are currently winning at absolutely nothing.",
"Somewhere, someone is being productive. Not you. Good.","Don't check the time. Oh wait, you can't.",
"Is this meditation or a cry for help?","You have become one with the chair."
];
const notifications=[
["YOUR PHONE","You have 17 unread messages. Probably important."],
["BANK ALERT","Your imaginary cashback is waiting."],
["YOUR BOSS","Quick question. Are you free for a second?"],
["UNKNOWN NUMBER","We need to talk."],
["SOCIAL MEDIA","Someone just posted something you need to see."],
["SYSTEM","Your patience subscription is about to expire."],
["YOUR FRIEND","Bro. Are you alive?"],
["URGENT","You have been selected for absolutely nothing."]
];
const achievements=[
["🥉","The Beginner","Survive 30 seconds",30],["🥈","The Patient","Survive 2 minutes",120],
["🥇","The Monk","Survive 10 minutes",600],["👑","The Legend","Survive 1 hour",3600],
["🧘","Unbothered","Survive 5 minutes",300],["🪨","Stone Cold","Survive 15 minutes",900],
["🫥","Invisible","Survive 60 seconds in Blind Mode",60,"blind"],["🔥","No Fear","Survive 2 minutes in Hardcore",120,"hardcore"]
];
let state="idle",startAt=0,raf=0,arm=0,whisperAt=0,lastPointer=null,events=0,eventTimers=[],soundOn=true,audio=null,mode="normal",best=0;
let data=loadData(),dailyTarget=120;
function loadData(){try{return JSON.parse(localStorage.getItem(KEY))||{best:0,records:[],unlocked:[],streak:0,lastDay:"",dailyDone:false}}catch{return {best:0,records:[],unlocked:[],streak:0,lastDay:"",dailyDone:false}}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
function fmt(ms){let s=Math.floor(ms/1000),h=String(Math.floor(s/3600)).padStart(2,"0"),m=String(Math.floor(s%3600/60)).padStart(2,"0"),sec=String(s%60).padStart(2,"0"),cs=String(Math.floor(ms%1000/10)).padStart(2,"0");return `${h}:${m}:${sec}<span class="timer-ms">.${cs}</span>`}
function seconds(ms){return Math.floor(ms/1000)}
function show(screen){[el.intro,el.game,el.over].forEach(x=>x.classList.add("hidden"));screen.classList.remove("hidden")}
function toast(msg){el.toast.textContent=msg;el.toast.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>el.toast.classList.add("hidden"),2600)}
function tone(freq=520,duration=.08){if(!soundOn)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.stop(audio.currentTime+duration)}catch{}}
function setMessage(t){el.message.style.opacity="0";setTimeout(()=>{if(state==="playing"){el.message.textContent=t;el.message.style.opacity="1"}},250)}
function updateBest(){el.best.textContent=best?fmt(best).split("<")[0]:"00:00:00"}
function clearEvents(){eventTimers.forEach(clearTimeout);eventTimers=[];clearTimeout(arm);cancelAnimationFrame(raf);el.notification.innerHTML="";el.fake.classList.add("hidden");el.temptation.classList.add("hidden");document.body.classList.remove("event-glitch","event-flash","timer-hidden")}
function later(fn,ms){let t=setTimeout(()=>{if(state==="playing")fn()},ms);eventTimers.push(t)}
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function gameTick(now){
 if(state!=="playing")return;
 let elapsed=now-startAt,sec=seconds(elapsed);
 el.timer.innerHTML=fmt(elapsed);
 let p=(elapsed%60000)/60000;el.ring.style.strokeDashoffset=String(C*(1-p));
 if(whisperAt<Math.min(whispers.length,Math.floor(sec/16)+1)){setMessage(whispers[whisperAt++]);}
 if(mode==="blind"){el.stage.classList.add("timer-hidden")}
 if(mode==="invisible"&&sec>=30)el.stage.classList.add("timer-hidden");
 if(mode==="minute"){let left=Math.max(0,60000-elapsed);el.survival.textContent=left>0?`SURVIVE ${Math.ceil(left/1000)}s`:"YOU MADE IT";if(elapsed>=60000){win();return}}
 raf=requestAnimationFrame(gameTick);
}
function pointerMove(e){
 if(e.pointerType==="touch")return;
 const x=e.clientX,y=e.clientY;
 if(lastPointer){let d=Math.hypot(x-lastPointer.x,y-lastPointer.y);let threshold=mode==="hardcore"||mode==="impossible"?1:3;if(d>=threshold){endGame("move");return}}
 lastPointer={x,y};
}
function onDown(e){endGame(e.pointerType==="touch"?"touch":"click")}
function onKey(){endGame("type")}
function onScroll(){endGame("scroll")}
function onTouch(){endGame("touch")}
function onDrag(){endGame("drag")}
function attach(){window.addEventListener("pointermove",pointerMove,true);window.addEventListener("pointerdown",onDown,true);window.addEventListener("keydown",onKey,true);window.addEventListener("wheel",onScroll,true);window.addEventListener("scroll",onScroll,true);window.addEventListener("touchstart",onTouch,{capture:true,passive:true});window.addEventListener("dragstart",onDrag,true)}
function detach(){window.removeEventListener("pointermove",pointerMove,true);window.removeEventListener("pointerdown",onDown,true);window.removeEventListener("keydown",onKey,true);window.removeEventListener("wheel",onScroll,true);window.removeEventListener("scroll",onScroll,true);window.removeEventListener("touchstart",onTouch,true);window.removeEventListener("dragstart",onDrag,true)}
function addNotification(){let [title,body]=rand(notifications),n=document.createElement("div");n.className="fake-notification";n.innerHTML=`<small>${title}</small><strong>${body.split(".")[0]}</strong><p>${body}</p>`;el.notification.appendChild(n);tone(720,.12);later(()=>n.remove(),4800);events++;el.events.textContent=`DISTRACTIONS: ${events}`}
function fakeGameOver(){el.fake.classList.remove("hidden");tone(180,.2);later(()=>{el.fake.classList.add("hidden");setMessage("Still playing. You almost fell for that.");},1800)}
function glitch(){document.body.classList.add("event-glitch");later(()=>document.body.classList.remove("event-glitch"),700);setMessage("Did the screen just move?")}
function showTemptation(){el.temptation.classList.remove("hidden");tone(600,.15);later(()=>el.temptation.classList.add("hidden"),4200)}
function scheduleEvents(){
 const interval=mode==="impossible"||mode==="anxiety"?18000:30000;
 const schedule=()=>{
  if(state!=="playing")return;
  let pool=mode==="anxiety"||mode==="impossible"?[addNotification,addNotification,glitch,fakeGameOver,showTemptation,()=>setMessage("Someone just mentioned your name.")]:[addNotification,glitch,fakeGameOver,()=>setMessage(rand(["You can leave now.","Nobody is watching.","Just one click won't hurt.","Are you seriously still here?"]))];
  rand(pool)();later(schedule,interval+Math.random()*12000);
 };
 later(schedule,mode==="impossible"?9000:14000);
 if(mode==="anxiety"||mode==="impossible")later(()=>{if(state==="playing")addNotification()},5000);
}
function startGame(){
 if(state==="playing")return;
 clearEvents();detach();state="playing";mode=el.mode.value;startAt=performance.now();whisperAt=0;events=0;lastPointer=null;
 el.events.textContent="DISTRACTIONS: 0";el.modeLabel.textContent=MODES[mode]+" MODE";el.survival.textContent=mode==="minute"?"SURVIVE 60s":"STAY ALIVE";
 el.stage.classList.toggle("timer-hidden",mode==="blind");el.message.textContent="Be still.";el.timer.innerHTML=fmt(0);
 el.ring.style.strokeDasharray=String(C);el.ring.style.strokeDashoffset=String(C);
 document.body.classList.add("is-playing");document.body.classList.remove("is-over");show(el.game);tone(440);
 raf=requestAnimationFrame(gameTick);
 // Ignore the start-button click and allow the pointer to settle before arming.
 arm=setTimeout(()=>{if(state==="playing"){attach();scheduleEvents()}},450);
}
function rank(ms){let s=seconds(ms);return s>=3600?"LEGEND":s>=900?"STONE COLD":s>=600?"THE MONK":s>=300?"UNBOTHERED":s>=120?"PATIENT":s>=30?"BEGINNER":"WARM-UP"}
function headline(reason){return ({move:"YOU MOVED.",click:"YOU CLICKED.",type:"YOU TYPED.",scroll:"YOU SCROLLED.",touch:"YOU TOUCHED.",drag:"YOU DRAGGED."})[reason]||"YOU MOVED."}
function updateAchievements(ms){
 achievements.forEach(a=>{if(seconds(ms)>=a[3]&&(!a[4]||a[4]===mode)&&!data.unlocked.includes(a[1])){data.unlocked.push(a[1]);toast("Achievement unlocked: "+a[1]);tone(880,.18)}});
}
function record(ms,won=false){
 let day=new Date().toISOString().slice(0,10);
 if(data.lastDay!==day){let y=new Date(Date.now()-86400000).toISOString().slice(0,10);data.streak=data.lastDay===y?(data.streak||0)+1:1;data.lastDay=day;data.dailyDone=false}
 data.records.unshift({ms:Math.floor(ms),mode,day,won});data.records=data.records.slice(0,10);
 if(ms>data.best){data.best=Math.floor(ms);best=data.best;el.badge.classList.remove("hidden")}else el.badge.classList.add("hidden");
 updateAchievements(ms);if(won)data.dailyDone=true;save();updateBest();
}
function finish(ms,reason,won){
 state="over";clearEvents();detach();document.body.classList.remove("is-playing");document.body.classList.add("is-over");
 record(ms,won);el.headline.textContent=won?"YOU DID NOTHING.":headline(reason);el.final.innerHTML=fmt(ms);
 $("result-copy").textContent=won?"An entire minute of absolutely nothing. Beautiful.":rand(["Your willpower had a short vacation.","The mouse won this round.","You moved. The universe noticed.","You were so close to doing nothing.","At least you failed at something simple."]);
 $("result-mode").textContent=MODES[mode];$("result-rank").textContent=rank(ms);$("result-events").textContent=events;
 $("result-kicker").textContent=won?"CHALLENGE COMPLETE":"THE EXPERIMENT IS OVER";
 show(el.over);tone(won?900:220,.2);
}
function endGame(reason){if(state!=="playing")return;finish(performance.now()-startAt,reason,false)}
function win(){if(state!=="playing")return;finish(60000,"",true)}
function openPanel(which){
 el.panel.classList.remove("hidden");
 if(which==="achievements"){el.panelTitle.textContent="Achievements";el.panelContent.innerHTML='<div class="achievement-list">'+achievements.map(a=>{let ok=data.unlocked.includes(a[1]);return `<div class="achievement ${ok?"":"locked"}"><span class="emoji">${a[0]}</span><div><strong>${a[1]}</strong><small>${a[2]}</small></div><span>${ok?"✓":"🔒"}</span></div>`}).join("")+'</div>'}
 if(which==="leaderboard"){el.panelTitle.textContent="Local leaderboard";let rows=data.records||[];el.panelContent.innerHTML=rows.length?'<div class="leader-list">'+rows.map((r,i)=>`<div class="leader-row"><strong>#${i+1}</strong><div><strong>${fmt(r.ms).split("<")[0]}</strong><small>${MODES[r.mode]||r.mode} · ${r.day}</small></div><span>${r.won?"🏆":rank(r.ms)}</span></div>`).join("")+'</div>':'<p class="muted">No runs yet. Go do nothing.</p>'}
 if(which==="daily"){el.panelTitle.textContent="Daily challenge";let done=data.dailyDone&&data.lastDay===new Date().toISOString().slice(0,10);el.panelContent.innerHTML=`<div class="daily-card"><span style="font-size:32px">📅</span><div><strong>Today's challenge: The One-Minute Void</strong><small>Survive for 60 seconds in One Minute mode. No movement. No excuses.</small><p>${done?"Completed today ✓":"Not completed yet"}</p></div></div><button class="pill-btn" id="daily-start" style="margin-top:16px">Play daily challenge →</button>`;$("daily-start").addEventListener("click",()=>{el.panel.classList.add("hidden");el.mode.value="minute";startGame()})}
}
function share(){let ms=state==="over"?el.final.textContent.trim():el.best.textContent;let text=`I survived ${ms} doing absolutely nothing in Do Nothing. Can you beat me?`;if(navigator.share)navigator.share({title:"Do Nothing",text,url:location.href}).catch(()=>{});else if(navigator.clipboard){navigator.clipboard.writeText(text+" "+location.href).then(()=>toast("Challenge copied.")).catch(()=>toast(text))}else toast(text)}
el.start.addEventListener("click",startGame);el.restart.addEventListener("click",startGame);$("share-button").addEventListener("click",share);
$("close-panel").addEventListener("click",()=>el.panel.classList.add("hidden"));
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.open)));
el.sound.addEventListener("click",()=>{soundOn=!soundOn;el.sound.textContent=soundOn?"♫":"♪";toast(soundOn?"Sound on":"Sound off");if(soundOn)tone()});
$("temptation-button").addEventListener("click",()=>{el.temptation.classList.add("hidden");endGame("click")});
document.addEventListener("visibilitychange",()=>{if(state==="playing"&&document.hidden)endGame("move")});
window.addEventListener("beforeunload",()=>{if(state==="playing")state="over"});
best=data.best||0;updateBest();
})();