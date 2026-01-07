function el(id){return document.getElementById(id)}

async function resolve(){
  const wishEl = el('wish');
  const output = el('output');
  const wish = wishEl.value.trim();
  if(!wish){
    output.innerHTML = `<div class="card notice">Please enter a wish to continue.</div>`;
    return;
  }

  setLoading(true);
  output.innerHTML = `<div class="card"><div class="row"><div class="spinner"></div><div style="margin-left:10px">Understanding your request...</div></div></div>`;

  try{
    const res = await fetch('/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wish})});
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json().catch(()=>null) || { intent:'UNKNOWN', domain:'unknown', options:[], guidance:'No guidance returned.' };

    renderResult(data);
    addToHistory(wish);
  }catch(err){
    output.innerHTML = `<div class="card"><strong>Error:</strong> ${err.message}</div>`;
  }finally{
    setLoading(false);
  }
}

function setLoading(on){
  const btn = el('resolveBtn');
  if(on){ btn.disabled = true; btn.innerHTML = 'Working... <span class="spinner"></span>'; }
  else { btn.disabled=false; btn.innerHTML='Find Options'; }
}

function renderResult(data){
  const out = el('output');
  const intent = data.intent || 'UNKNOWN';
  const domain = data.domain || 'general';
  const guidance = data.guidance || '';
  const options = Array.isArray(data.options) ? data.options : [];

  let html = `<div class="card"><h3>Intent: ${escapeHtml(intent)}</h3><div class="notice">Domain: ${escapeHtml(domain)}</div><p>${escapeHtml(guidance)}</p></div>`;

  if(options.length){
    html += '<div class="card"><h3>Suggested websites</h3><div class="options">';
    options.forEach(o=>{
      const name = escapeHtml(o.name||o.title||o.site||'Website');
      const url = o.url || o.link || o.href || '#';
      html += `<button class="option" onclick="startGuide('${escapeAttr(url)}','${escapeAttr(name)}')">Guide: ${name}</button>`;
    });
    html += '</div></div>';
  }

  out.innerHTML = html;
}

async function startGuide(url, name){
  const wish = el('wish').value || '';
  const guidePanel = el('guidePanel') || createGuidePanel();
  guidePanel.innerHTML = `<div class="card"><h3>Preparing guide for ${escapeHtml(name)}</h3><div class="notice">Fetching step-by-step guidance...</div></div>`;

  try{
    const res = await fetch('/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wish, option:{name, url}})});
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json().catch(()=>({steps:[]}));
    renderGuidePanel(name, url, data.steps || []);
  }catch(err){
    guidePanel.innerHTML = `<div class="card"><strong>Error:</strong> ${escapeHtml(err.message)}</div>`;
  }
}

function createGuidePanel(){
  const panel = document.createElement('div');
  panel.id = 'guidePanel';
  document.querySelector('.container').appendChild(panel);
  return panel;
}

function renderGuidePanel(name, url, steps){
  const panel = el('guidePanel') || createGuidePanel();
  if(!steps.length){
    panel.innerHTML = `<div class="card"><h3>No guide available</h3><p class="notice">The assistant couldn't produce step-by-step instructions.</p><div class="row"><button class="btn" onclick="window.open('${escapeAttr(url)}','_blank')">Open ${escapeHtml(name)}</button></div></div>`;
    return;
  }

  let idx = 0;
  function render(){
    const step = steps[idx];
    panel.innerHTML = `
      <div class="card">
        <h3>Guide for ${escapeHtml(name)}</h3>
        <div class="notice">Step ${idx+1} of ${steps.length}</div>
        <p>${escapeHtml(step.text)}</p>
        <div class="row">
          <button class="btn" onclick="window.open('${escapeAttr(url)}','_blank')">Open site</button>
          <button class="btn secondary" id="nextStep">I've navigated</button>
          <button class="btn secondary" id="prevStep">Prev</button>
        </div>
      </div>`;

    const next = el('nextStep');
    const prev = el('prevStep');
    if(next) next.addEventListener('click', ()=>{ if(idx < steps.length-1) { idx++; render(); } else { panel.innerHTML = `<div class="card"><h3>Completed</h3><p class="notice">You've finished the guide. Good job!</p></div>`; } });
    if(prev) prev.addEventListener('click', ()=>{ if(idx>0){ idx--; render(); }});
  }
  render();
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'%22').replace(/'/g,'%27'); }

function addToHistory(wish){
  try{
    const key='intent_agent_history_v1';
    const arr = JSON.parse(localStorage.getItem(key)||'[]');
    arr.unshift({wish,at:new Date().toISOString()});
    const trimmed = arr.slice(0,10);
    localStorage.setItem(key,JSON.stringify(trimmed));
    renderHistory();
  }catch(e){}
}

function renderHistory(){
  const container = el('history');
  const key='intent_agent_history_v1';
  const arr = JSON.parse(localStorage.getItem(key)||'[]');
  if(!arr.length){ container.innerHTML = '<div class="notice">No recent queries</div>'; return; }
  container.innerHTML = arr.map(a=>`<button onclick="fillQuick('${escapeAttr(a.wish)}')">${escapeHtml(a.wish)}</button>`).join(' ');
}

function fillQuick(v){ el('wish').value = v; }

document.addEventListener('DOMContentLoaded', ()=>{
  renderHistory();
  el('resolveBtn').addEventListener('click', resolve);
  Array.from(document.querySelectorAll('.quick-btn')).forEach(b=>{
    b.addEventListener('click', ()=>{ el('wish').value = b.dataset.wish; });
  });
});

window.resolve = resolve; // expose for inline handlers if any
window.fillQuick = fillQuick;