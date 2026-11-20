/* PATHLAB Game Arena: Tic-Tac-Toe & Connect-4 with Minimax + Alpha-Beta */
(function(root){
'use strict';
function mkLines(R,C,N){const L=[];const D=[[0,1],[1,0],[1,1],[1,-1]];
 for(let r=0;r<R;r++)for(let c=0;c<C;c++)for(const[dr,dc]of D){const e=[];for(let k=0;k<N;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=R||cc<0||cc>=C)break;e.push(rr*C+cc)}if(e.length===N)L.push(e)}return L}
const GAMES={
 ttt:{name:'Tic-Tac-Toe',R:3,C:3,N:3,moves:b=>b.map((v,i)=>v?-1:i).filter(i=>i>=0),play:(b,m,p)=>{const n=b.slice();n[m]=p;return n},maxDepth:9,defDepth:9},
 c4:{name:'Connect-4',R:6,C:7,N:4,order:[3,2,4,1,5,0,6],
  moves(b){return this.order.filter(c=>!b[c])},
  play(b,c,p){const n=b.slice();for(let r=5;r>=0;r--)if(!n[r*7+c]){n[r*7+c]=p;break}return n},maxDepth:8,defDepth:5}};
for(const g of Object.values(GAMES))g.lines=mkLines(g.R,g.C,g.N);
const winLine=(g,b)=>{for(const l of g.lines){const v=b[l[0]];if(v&&l.every(i=>b[i]===v))return l}return null};
const isFull=(g,b)=>g.moves(b).length===0;
function evalB(g,b,ai){let s=0;for(const l of g.lines){let a=0,o=0;for(const i of l){if(b[i]===ai)a++;else if(b[i])o++}
 if(a&&!o)s+=Math.pow(10,a-1);else if(o&&!a)s-=1.2*Math.pow(10,o-1)}
 if(g.C===7)for(let r=0;r<6;r++){const v=b[r*7+3];if(v===ai)s+=3;else if(v)s-=3}return s}
function search(g,b,d,al,be,max,ai,st,ab){st.nodes++;
 const w=winLine(g,b);if(w)return b[w[0]]===ai?100000+d:-100000-d;
 if(d===0)return evalB(g,b,ai);const mv=g.moves(b);if(!mv.length)return 0;
 const me=max?ai:-ai;let best=max?-Infinity:Infinity;
 for(const m of mv){const v=search(g,g.play(b,m,me),d-1,al,be,!max,ai,st,ab);
  if(max){if(v>best)best=v;if(v>al)al=v}else{if(v<best)best=v;if(v<be)be=v}
  if(ab&&be<=al){st.cuts++;break}}return best}
/* Choose a move. Returns scores per candidate, node counts, and (if cheap) plain-minimax node count for comparison */
function think(g,b,ai,depth,ab){const st={nodes:0,cuts:0},sc=[];let al=-Infinity,best=null,bv=-Infinity;
 for(const m of g.moves(b)){const v=search(g,g.play(b,m,ai),depth-1,al,Infinity,false,ai,st,ab);
  sc.push({m,v,bound:ab&&v<=al&&best!==null});if(v>bv){bv=v;best=m}if(v>al)al=v}
 let plain=null;if(ab&&(g===GAMES.ttt||depth<=6)){const p={nodes:0,cuts:0};
  for(const m of g.moves(b))search(g,g.play(b,m,ai),depth-1,-Infinity,Infinity,false,ai,p,false);plain=p.nodes}
 return{move:best,scores:sc,nodes:st.nodes,cuts:st.cuts,plain}}
root.GameAI={GAMES,winLine,isFull,think,search};
if(typeof document==='undefined'||!document.querySelector('.app-container'))return;

/* ---------- UI ---------- */
const $=s=>document.querySelector(s);
const nav=$('#btnNavSudoku'),cont=$('.app-container');
const tab=document.createElement('button');tab.className='nav-tab';tab.id='btnNavGames';tab.setAttribute('role','tab');
tab.innerHTML='<span class="nav-icon">🎮</span><span>Game Arena</span><span class="nav-badge">Minimax</span>';
nav.after(tab);
const view=document.createElement('main');view.id='viewGames';view.className='view-panel';view.style.display='none';
view.innerHTML=`<section class="control-dashboard"><div class="toolbar-row">
<div class="toolbar-group"><span class="group-label">Game:</span><div class="select-wrapper"><select id="gmGame" class="custom-select"><option value="ttt">Tic-Tac-Toe</option><option value="c4">Connect-4</option></select><span class="select-arrow">▼</span></div></div>
<div class="toolbar-group"><span class="group-label">AI depth: <b id="gmDepthV">5</b></span><input type="range" id="gmDepth" min="1" max="8" value="5"></div>
<div class="toolbar-group"><label style="cursor:pointer"><input type="checkbox" id="gmAB" checked> Alpha-Beta pruning</label></div>
<div class="toolbar-group"><label style="cursor:pointer"><input type="checkbox" id="gmAIFirst"> AI moves first</label></div>
<button class="btn btn-primary" id="gmNew">🔄 New Game</button></div></section>
<div class="gm-wrap"><section class="gm-board-card"><div id="gmStatus" class="gm-status"></div><div id="gmBoard"></div></section>
<aside class="gm-side"><h3>🧠 AI Thinking</h3><div id="gmStats" class="gm-chips"></div><div id="gmBars"></div>
<p class="gm-note">Each bar is the minimax score of a candidate move (higher = better for the AI). <b>≈</b> marks moves whose branch was cut off by alpha-beta, so the score is only a bound.</p></aside></div>`;
cont.appendChild(view);
let g=GAMES.ttt,b,over,busy;const HUMAN=1,AI=-1;
const $g=id=>document.getElementById(id);
function render(line){const el=$g('gmBoard');el.className='gm-'+(g===GAMES.c4?'c4':'ttt');el.innerHTML='';
 b.forEach((v,i)=>{const d=document.createElement('button');d.className='gm-cell'+(v===HUMAN?' h':v===AI?' a':'')+(line&&line.includes(i)?' win':'');
  d.dataset.i=i;d.textContent=g===GAMES.ttt?(v===HUMAN?'X':v===AI?'O':''):'';d.setAttribute('aria-label','cell '+i);el.appendChild(d)})}
const status=(t,c)=>{const s=$g('gmStatus');s.innerHTML=t;s.dataset.k=c||''};
function finish(){const w=winLine(g,b);if(w){over=true;render(w);const h=b[w[0]]===HUMAN;status(h?'🎉 You win!':'🤖 The AI wins!',h?'good':'bad');if(window.toast)toast(h?'You beat the minimax AI!':'Minimax AI wins this round','good'?(h?'good':'warn'):'');return true}
 if(isFull(g,b)){over=true;status('🤝 Draw!','');return true}return false}
function aiMove(){busy=true;status('🤖 AI is searching the game tree…','think');
 setTimeout(()=>{const d=+$g('gmDepth').value,ab=$g('gmAB').checked,r=think(g,b,AI,d,ab);
  b=g.play(b,r.move,AI);render();showThink(r,ab);busy=false;if(!finish())status('Your turn ('+(g===GAMES.ttt?'X':'🔴')+')','')},60)}
function showThink(r,ab){const sv=r.plain?Math.round(100*(1-r.nodes/r.plain)):null;
 $g('gmStats').innerHTML=`<span>Nodes: <b>${r.nodes.toLocaleString()}</b></span><span>Cut-offs: <b>${r.cuts.toLocaleString()}</b></span>`+(r.plain?`<span>Plain minimax: <b>${r.plain.toLocaleString()}</b></span><span class="gm-save">Saved ${sv}%</span>`:'');
 const mx=Math.max(...r.scores.map(s=>Math.abs(s.v)),1);
 $g('gmBars').innerHTML=r.scores.map(s=>{const w=Math.max(4,Math.round(Math.abs(s.v)/mx*100));const lab=g===GAMES.c4?'Col '+(s.m+1):'Cell '+(s.m+1);
  return`<div class="gm-bar${s.m===r.move?' best':''}"><span>${lab}</span><div><i class="${s.v<0?'neg':''}" style="width:${w}%"></i></div><em>${s.bound?'≈':''}${Math.abs(s.v)>=1e5?(s.v>0?'WIN':'LOSS'):s.v.toFixed(1)}</em></div>`}).join('')}
function newGame(){g=GAMES[$g('gmGame').value];const dEl=$g('gmDepth');dEl.max=g.maxDepth;
 if(+dEl.value>g.maxDepth)dEl.value=g.maxDepth;$g('gmDepthV').textContent=dEl.value;
 b=Array(g.R*g.C).fill(0);over=false;busy=false;$g('gmBars').innerHTML='';$g('gmStats').innerHTML='';render();
 if($g('gmAIFirst').checked)aiMove();else status('Your turn ('+(g===GAMES.ttt?'X':'🔴')+')','')}
$g('gmBoard').addEventListener('click',e=>{const c=e.target.closest('.gm-cell');if(!c||over||busy)return;const i=+c.dataset.i;
 const m=g===GAMES.c4?i%7:i;if(!g.moves(b).includes(m))return;b=g.play(b,m,HUMAN);render();if(!finish())aiMove()});
$g('gmNew').onclick=newGame;$g('gmGame').onchange=()=>{const d=$g('gmDepth');d.value=GAMES[$g('gmGame').value].defDepth;newGame()};
$g('gmDepth').oninput=e=>$g('gmDepthV').textContent=e.target.value;
/* Navigation integration */
const _sw=window.switchAppMode;
window.switchAppMode=function(){view.style.display='none';tab.classList.remove('active');return _sw.apply(this,arguments)};
tab.onclick=()=>{document.querySelectorAll('.view-panel').forEach(v=>{v.style.display='none';v.classList.remove('active')});
 document.querySelectorAll('.nav-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false')});
 view.style.display='block';view.classList.add('active');tab.classList.add('active');tab.setAttribute('aria-selected','true');
 try{currentAppMode='games'}catch(e){}if(!b)newGame()};
})(typeof window!=='undefined'?window:module.exports);
