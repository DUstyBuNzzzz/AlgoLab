/* PATHLAB enhancement layer: interactivity */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];

/* Toasts */
const box=document.createElement('div');box.id='toastBox';document.body.appendChild(box);
window.toast=function(msg,type='',ms=3600){const t=document.createElement('div');t.className='toast '+type;t.innerHTML=msg;box.appendChild(t);
 setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),320)},ms)};

/* Animated background: drifting graph of nodes (a search-graph motif) */
const cv=document.createElement('canvas');cv.id='bgCanvas';document.body.prepend(cv);
const cx=cv.getContext('2d');let W,H,N=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;N=Array.from({length:Math.min(60,W/22|0)},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3}))}
size();addEventListener('resize',size);
(function loop(){cx.clearRect(0,0,W,H);
 const light=document.documentElement.getAttribute('data-theme')==='light';
 const col=light?'59,130,246':'34,211,238';
 for(const a of N){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
  cx.fillStyle=`rgba(${col},.7)`;cx.beginPath();cx.arc(a.x,a.y,1.8,0,7);cx.fill();
  for(const b of N){const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<130){cx.strokeStyle=`rgba(${col},${.16*(1-d/130)})`;cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke()}}}
 requestAnimationFrame(loop)})();

/* Ripple + card glow + scroll reveal */
document.addEventListener('click',e=>{const b=e.target.closest('.btn,.btn-launch-hub');if(!b)return;
 const r=b.getBoundingClientRect(),s=document.createElement('span');s.className='ripple';
 const d=Math.max(r.width,r.height);s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
 b.appendChild(s);setTimeout(()=>s.remove(),600)});
const cards=qa('.hub-card,.app-card,.guide-card,.stat-card,.hub-concept-section article,.hub-concept-section .card');
cards.forEach(c=>{c.classList.add('glow-card','reveal');c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')})});
const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.1});
qa('.reveal').forEach(el=>io.observe(el));
setTimeout(()=>qa('.reveal').forEach(el=>el.classList.add('in')),1800); // safety net

/* Command palette (Ctrl/Cmd+K) */
const click=id=>()=>{const el=document.getElementById(id);el&&el.click()};
const setAlgo=(v,name)=>()=>{click('btnNavPathlab')();const s=document.getElementById('algo');if(s){s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));toast('Algorithm set to <b>'+name+'</b>')}};
const CMDS=[
 ['🏠 Go to Home Hub','btnNavHome'],['🗺️ Open Path Finder','btnNavPathlab'],['🧩 Open Sudoku Solver','btnNavSudoku'],['📂 My Projects','btnNavProjects'],
 ['🌗 Toggle theme','btnThemeToggle'],['▶ Run visualization','run'],['⚖️ Run benchmark comparison','btnRunCompare'],
 ['🎲 Generate Sudoku puzzle','btnSudokuGenerate'],['🧠 Solve Sudoku (backtracking)','btnSudokuSolve'],['💡 Sudoku Smart Hint','btnSmartHint']
].map(([l,id])=>({l,run:click(id)}))
.concat([['Use A* Search','astar'],['Use Dijkstra','dijkstra'],['Use Greedy Best-First','greedy'],['Use BFS','bfs'],['Use DFS','dfs'],['Use Bidirectional BFS','bibfs']].map(([l,v])=>({l:'🧭 '+l,run:setAlgo(v,l.replace('Use ',''))})));
const ov=document.createElement('div');ov.id='cmdk';ov.innerHTML='<div id="cmdkBox"><input id="cmdkInput" placeholder="Type a command… (try “sudoku”, “dijkstra”, “theme”)" autocomplete="off"><div id="cmdkList"></div></div>';document.body.appendChild(ov);
const inp=q('#cmdkInput'),list=q('#cmdkList');let sel=0,shown=[];
function draw(){const t=inp.value.toLowerCase();shown=CMDS.filter(c=>c.l.toLowerCase().includes(t));sel=Math.min(sel,Math.max(shown.length-1,0));
 list.innerHTML=shown.map((c,i)=>`<div class="cmd-item${i===sel?' sel':''}" data-i="${i}"><span>${c.l}</span>${i===sel?'<kbd>↵</kbd>':''}</div>`).join('')||'<div class="cmd-item">No matches</div>'}
function open(o){ov.classList.toggle('open',o);if(o){inp.value='';sel=0;draw();inp.focus()}}
function exec(i){const c=shown[i];if(c){open(false);c.run()}}
inp.addEventListener('input',()=>{sel=0;draw()});
list.addEventListener('click',e=>{const it=e.target.closest('.cmd-item[data-i]');it&&exec(+it.dataset.i)});
ov.addEventListener('mousedown',e=>{if(e.target===ov)open(false)});
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open(!ov.classList.contains('open'));return}
 if(!ov.classList.contains('open'))return;
 if(e.key==='Escape')open(false);
 else if(e.key==='ArrowDown'){e.preventDefault();sel=(sel+1)%shown.length;draw()}
 else if(e.key==='ArrowUp'){e.preventDefault();sel=(sel-1+shown.length)%shown.length;draw()}
 else if(e.key==='Enter'){e.preventDefault();exec(sel)}});
const fab=document.createElement('button');fab.id='cmdkFab';fab.className='btn btn-sm';fab.innerHTML='⌘ Commands <span class="kbd-hint">Ctrl K</span>';fab.onclick=()=>open(true);document.body.appendChild(fab);

/* Sudoku Smart Hint: explains WHY a move is forced (constraint propagation) */
const solveBtn=document.getElementById('btnSudokuSolve');
if(solveBtn&&typeof sudoku!=='undefined'){
 const hb=document.createElement('button');hb.className='btn';hb.id='btnSmartHint';hb.innerHTML='<span>💡</span> Smart Hint';
 solveBtn.parentElement.appendChild(hb);
 const panel=document.createElement('div');panel.id='hintPanel';
 const tbl=document.getElementById('sudokuTable');tbl.parentElement.appendChild(panel);
 const cand=(r,c)=>{const used=new Set();for(let i=0;i<9;i++){used.add(sudoku.board[r][i]);used.add(sudoku.board[i][c])}
  const br=r-r%3,bc=c-c%3;for(let i=0;i<3;i++)for(let j=0;j<3;j++)used.add(sudoku.board[br+i][bc+j]);
  return[1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n))};
 function findHint(){
  for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!sudoku.board[r][c]){const k=cand(r,c);
   if(k.length===1)return{r,c,v:k[0],why:`<b>Naked single.</b> Row ${r+1}, column ${c+1} sees every digit except <b>${k[0]}</b> in its row, column and 3×3 box, so only ${k[0]} survives constraint pruning.`}}
  for(let n=1;n<=9;n++){
   for(let r=0;r<9;r++){const cs=[];for(let c=0;c<9;c++)if(!sudoku.board[r][c]&&cand(r,c).includes(n))cs.push(c);
    if(cs.length===1&&!sudoku.board[r].includes(n))return{r,c:cs[0],v:n,why:`<b>Hidden single (row).</b> In row ${r+1}, digit <b>${n}</b> can only go in column ${cs[0]+1}.`}}
   for(let c=0;c<9;c++){const rs=[];for(let r=0;r<9;r++)if(!sudoku.board[r][c]&&cand(r,c).includes(n))rs.push(r);
    if(rs.length===1&&!sudoku.board.some(row=>row[c]===n))return{r:rs[0],c,v:n,why:`<b>Hidden single (column).</b> In column ${c+1}, digit <b>${n}</b> can only go in row ${rs[0]+1}.`}}}
  return null}
 hb.onclick=()=>{
  qa('.cell-hint,.cell-hint-peer').forEach(e=>e.classList.remove('cell-hint','cell-hint-peer'));
  if(qa('.cell-conflict,.conflict').length){toast('Fix the highlighted conflicts first.','warn');return}
  const h=findHint();
  if(!h){panel.style.display='block';panel.innerHTML='🤔 <b>No simple logical move.</b> The puzzle needs guessing, which is exactly what <b>backtracking</b> does. Press Solve to watch it.';return}
  for(let i=0;i<9;i++){[[h.r,i],[i,h.c]].forEach(([r,c])=>{const e=document.getElementById(`sc_${r}_${c}`);e&&e.classList.add('cell-hint-peer')})}
  const cell=document.getElementById(`sc_${h.r}_${h.c}`);cell.classList.add('cell-hint');
  panel.style.display='block';
  panel.innerHTML=`💡 ${h.why}<div style="margin-top:8px"><button class="btn btn-sm btn-primary" id="applyHint">Place ${h.v}</button></div>`;
  q('#applyHint').onclick=()=>{sudoku.board[h.r][h.c]=h.v;renderSudokuBoardUI();panel.style.display='none';toast(`Placed <b>${h.v}</b> at R${h.r+1}C${h.c+1}`,'good')}};
}

/* Celebrate Sudoku/Path success via status text changes */
const st=document.getElementById('sudokuStatusText');
if(st)new MutationObserver(()=>{if(/solved|complete/i.test(st.textContent))toast('🎉 '+st.textContent.slice(0,80),'good')}).observe(st,{childList:true,subtree:true,characterData:true});
toast('Press <span class="kbd-hint">Ctrl K</span> for the command palette ✨','',4500);
})();
