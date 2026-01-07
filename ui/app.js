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
  // normalize steps into { text: '...' } objects
  steps = normalizeSteps(steps);
  // convert model output into friendly, conversational imperatives (keep natural casing)
  steps = steps.map(s => ({ text: conciseText(s.text, name) }));

  if(!steps.length){
    panel.innerHTML = `<div class="card"><h3>No guide available</h3><p class="notice">The assistant couldn't produce step-by-step instructions.</p><div class="row"><button class="btn" onclick="window.open('${escapeAttr(url)}','_blank')">Open ${escapeHtml(name)}</button></div></div>`;
    return;
  }

  let idx = 0;
  function render(){
    const step = steps[idx];
    panel.innerHTML = `
      <div class="card">
        <div class="assistant">A</div>
        <div class="bubble">
          <h3>Guide for ${escapeHtml(name)}</h3>
          <div class="notice">Step ${idx+1} of ${steps.length}</div>
          <p>${escapeHtml(step.text)}</p>
          <div class="guide-controls">
            <button class="btn" id="openSite">Open site</button>
            <button class="btn read" id="readAloud">🔊 Read</button>
            <button class="btn secondary" id="nextStep">I've navigated</button>
            <button class="btn secondary" id="prevStep">Prev</button>
          </div>
        </div>
      </div>`;

    const next = el('nextStep');
    const prev = el('prevStep');
    const openBtn = el('openSite');
    const readBtn = el('readAloud');

    if(openBtn) openBtn.addEventListener('click', ()=> window.open(url, '_blank'));
    if(readBtn) readBtn.addEventListener('click', ()=> speak(step.text));
    if(next) next.addEventListener('click', ()=>{ if(idx < steps.length-1) { idx++; render(); } else { panel.innerHTML = `<div class="card"><div class="assistant">A</div><div class="bubble"><h3>Completed</h3><p class="notice">You've finished the guide. Good job!</p></div></div>`; } });
    if(prev) prev.addEventListener('click', ()=>{ if(idx>0){ idx--; render(); }});
  }
  render();
}

function speak(text){
  try{
    if('speechSynthesis' in window){
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'en-US';
      window.speechSynthesis.speak(ut);
    }
  }catch(e){ /* ignore */ }
}

function conciseText(text, name){
  const raw = String(text||'').trim();
  const n = String(name||'').trim();
  // remove any URLs
  const noUrl = raw.replace(/https?:\/\/\S+/gi, '').trim();

  // If the step already starts with an imperative verbs like "Go", "Click", "Search", keep it but normalize spacing and punctuation
  if(/^\s*(go|click|open|navigate|search|select|choose|fill|enter|click on)\b/i.test(noUrl)){
    return capitalizeSentence(noUrl.replace(/^\d+\.|^\d+\)|^[\-•\*]\s*/,'').trim());
  }

  // If it mentions the site name, prefer "Go to {Site}."
  if(n && new RegExp(n.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(noUrl)){
    return `Go to ${capitalizeEachWord(n)}.`;
  }

  // Strip numbering/bullets and capitalize into an imperative-style sentence
  const clean = noUrl.replace(/^\d+\.|^\d+\)|^[\-•\*]\s*/,'').trim();
  return capitalizeSentence(clean);
}

function capitalizeSentence(s){
  if(!s) return '';
  const trimmed = s.trim();
  const out = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return out.endsWith('.') || out.endsWith('!') || out.endsWith('?') ? out : out + '.';
}

function capitalizeEachWord(s){
  return String(s||'').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function normalizeSteps(steps){
  if(!steps) return [];
  // accept string, array of strings, array of objects
  if(typeof steps === 'string'){
    // try split on newlines
    steps = steps.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  }
  if(!Array.isArray(steps)) return [];

  return steps.map(s => {
    // if simple string
    if(typeof s === 'string'){
      const trimmed = s.trim();
      // try parse JSON inside string
      try{
        const parsed = JSON.parse(trimmed);
        return { text: objectToSentence(parsed) };
      }catch(e){
        // remove leading numbering like "1.", "-"
        const clean = trimmed.replace(/^\d+\.|^\d+\)|^[-•\*]\s*/,'').trim();
        return { text: clean };
      }
    }

    if(typeof s === 'object' && s !== null){
      if(s.text && typeof s.text === 'string') return { text: s.text };
      if(s.step && typeof s.step === 'string') return { text: s.step };
      if(s.instruction && typeof s.instruction === 'string') return { text: s.instruction };
      return { text: objectToSentence(s) };
    }

    return { text: String(s) };
  });
}

function objectToSentence(obj){
  if(obj === null) return '';
  if(typeof obj === 'string') return obj;
  if(Array.isArray(obj)) return obj.map(o=>objectToSentence(o)).join(' — ');
  const entries = Object.entries(obj).filter(([k,v])=>v !== undefined && v !== null && String(v).trim() !== '');
  if(entries.length === 0) return '';
  if(entries.length === 1) return String(entries[0][1]);
  // multiple entries: join as "Key: value" sentences
  // Heuristic: try to produce imperative, conversational sentences
  // Recognize common keys
  const map = Object.fromEntries(entries);
  if(map.url || map.link || map.href) return `Go to the website: ${map.url||map.link||map.href}`;
  if(map.button || map.btn || map.action) return `Click the ${map.button||map.btn||map.action}`;
  if(map.field || map.input) return `Fill the ${map.field||map.input}`;
  // Fallback: describe entries in a natural way
  return entries.map(([k,v])=>`${capitalize(k)}: ${String(v)}`).join('. ');
}

function capitalize(s){ if(!s) return ''; return String(s).charAt(0).toUpperCase()+String(s).slice(1); }

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