// What's in your sky? — flow + tap mechanic. Cool, dry, confident.
(function () {
  const $ = (s) => document.querySelector(s);
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const KEY = 'blkout_sky_v1';

  const RINGS = [
    { no:'Ring 01', sub:'Inner system', title:'The 3am people', short:'3AM',
      instr:"Who'd pick up at 3am, no questions. One tap each.", rf:0.30, cr:110 },
    { no:'Ring 02', sub:'Home belt', title:'The regulars', short:'REGULARS',
      instr:'Who you actually see or speak to most months — the calls, the brunch, the long ones. One tap each.', rf:0.50, cr:185 },
    { no:'Ring 03', sub:'Wide field', title:'The nods', short:'NODS',
      instr:'Who knows your face and wishes you well — the barber, the neighbour, the half-known names. They count.', rf:0.72, cr:255 },
    { no:'Ring 04', sub:'Uncharted space', title:'The gold ring', short:'GOLD',
      instr:'Not who’s here — who you’re reaching for. One tap for each.', rf:0.92, cr:320, gold:true },
  ];

  // The sky you keep — the reflection. Cool, dry, never consoling.
  function archetype(){
    const [r1,r2,r3,g] = state.starsByRing.map(r=>r.length);
    const t = r1+r2+r3;
    if(t<=4 && g>=1) return ['The Dawn','first light of a new system','A sky just lit — and already reaching. Every constellation that matters started exactly here.'];
    if(t<=4)         return ['The Dawn','first light of a new system','A sky just lit. Every constellation that matters started exactly here.'];
    if(g>=3 && g>=r1) return ['The Architect','commander of uncharted space','You’re drawing the next sky on purpose. The gold is doing the talking.'];
    if(r3>=10 && r3>=3*Math.max(r1,1)) return ['The Mayor','voice of the wide field','The scene knows your face and the street knows your name. Your outer light carries furthest.'];
    if(r1>=4 && r1>=r3) return ['The Hearth','keeper of the inner suns','Few stars, serious heat. People sleep easier knowing you’d pick up.'];
    if(r2>=r1 && r2>=r3) return ['The Anchor','steady orbit of the home belt','You keep the rhythm — the calls, the showing up. Constancy is the whole craft.'];
    return ['The Navigator','reader of the whole sky','Balanced across every ring — close heat, steady rhythm, far light. You read the whole sky.'];
  }

  const state = {
    screen:'s-intro', ring:0,
    starsByRing:[[],[],[],[]],
    goldLine:'', lifeStage:'',
  };

  // ---------- sky + card ----------
  const sky = new window.SkyGL($('#sky-gl'));
  window.__sky = sky;
  const card = new window.ShareCard($('#card-preview'));
  const starfield = $('#starfield');

  function total(){ return state.starsByRing.reduce((a,r)=>a+r.length,0); }

  function energy(){
    return Math.min(1, 0.12 + total()*0.028 + (state.ring*0.04));
  }
  function pushEnergy(){ if(sky.ok) sky.setEnergy(energy()); }

  // ---------- star layout ----------
  function center(){ return { x: innerWidth/2, y: innerHeight/2,
    R: Math.min(innerWidth, innerHeight)/2 * 0.86 }; }

  function layout(){
    const c = center();
    state.starsByRing.forEach((ring, ri) => {
      const cfg = RINGS[ri];
      ring.forEach((s) => {
        const rad = cfg.rf * c.R + s.jit;
        s.el.style.left = (c.x + Math.cos(s.ang) * rad) + 'px';
        s.el.style.top  = (c.y + Math.sin(s.ang) * rad) + 'px';
      });
    });
  }
  window.addEventListener('resize', layout);

  function placeStar(ri, animate, ang){
    const ring = state.starsByRing[ri];
    const cfg = RINGS[ri];
    const i = ring.length;
    if(ang == null) ang = i * GOLDEN + ri * 1.4;     // restore / fallback spacing
    const jit = (Math.sin(i*12.9898 + ri*7.0)*0.5) * 26;
    const el = document.createElement('div');
    el.className = 'star' + (cfg.gold ? ' gold' : '');
    el.style.animationDelay = '0s, ' + (Math.random()*3).toFixed(2) + 's';
    if(!animate) el.style.animationName = 'twinkle';
    starfield.appendChild(el);
    ring.push({ ang, jit, el });
    layout();
    pushEnergy();
  }

  function undoStar(ri){
    const ring = state.starsByRing[ri];
    const s = ring.pop();
    if(s){ s.el.remove(); pushEnergy(); }
  }

  // ---------- screens ----------
  function show(id, instant){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(instant){
      const t = el.style.transition; el.style.transition='none';
      el.classList.add('active'); el.offsetHeight; el.style.transition=t;
    } else el.classList.add('active');
    state.screen = id;
    updateHud();
    save();
  }

  function updateHud(){
    const st = $('#status');
    const t = total();
    if(state.screen === 's-play')
      st.innerHTML = '<span class="n">' + String(t).padStart(2,'0') + '</span> STARS';
    else if(state.screen === 's-nav' || state.screen === 's-debrief')
      st.innerHTML = '<span class="n">' + t + '</span> STARS CHARTED';
    else st.textContent = 'STELLAR CARTOGRAPHY';
  }

  // ---------- ring panel ----------
  function renderPips(){
    const pips = $('#pips'); pips.innerHTML='';
    RINGS.forEach((_, i) => {
      const p = document.createElement('div');
      p.className = 'pip' + (i < state.ring ? ' done' : i === state.ring ? ' on' : '');
      pips.appendChild(p);
    });
  }

  function renderRing(){
    const cfg = RINGS[state.ring];
    $('#ring-no').textContent = cfg.no + ' · ' + cfg.sub;
    $('#ring-title').textContent = cfg.title;
    $('#ring-instr').textContent = cfg.instr;
    $('#ring-count').textContent = state.starsByRing[state.ring].length;
    $('#goldname').classList.toggle('show', !!cfg.gold);
    $('#next').textContent = cfg.gold ? 'Run the deep scan ✦' : 'Next ring →';
    renderPips();
    updateHud();
  }

  function bumpCount(){ $('#ring-count').textContent = state.starsByRing[state.ring].length; updateHud(); }

  // ---------- tap to add a star ----------
  let hintGone = false;
  window.addEventListener('pointerdown', (e) => {
    if(state.screen !== 's-play') return;
    if(e.target.closest('.no-tap, button, input, a')) return;
    const ri = state.ring;
    const c = center();
    let ang = Math.atan2(e.clientY - c.y, e.clientX - c.x);
    ang += (Math.random() - 0.5) * 0.14;            // fan out repeated taps
    placeStar(ri, true, ang);
    bumpCount();
    if(sky.ok) sky.ripple(e.clientX/innerWidth, 1 - e.clientY/innerHeight);
    if(!hintGone){ $('#tap-hint').style.opacity = '0'; hintGone = true; }
    save();
  });

  // mouse parallax + sky light
  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX/innerWidth, ny = e.clientY/innerHeight;
    if(sky.ok) sky.setMouse(nx, 1 - ny);
    starfield.style.transform = `translate(${(nx-0.5)*-22}px, ${(ny-0.5)*-22}px)`;
  });

  // ---------- buttons ----------
  $('#begin').onclick = () => {
    state.ring = 0;
    show('s-play');
    renderRing();
    const h = $('#tap-hint');
    h.style.opacity = '1'; hintGone = false;
    setTimeout(()=>{ if(!hintGone) h.style.opacity='0'; }, 4200);
  };

  $('#undo').onclick = () => { undoStar(state.ring); bumpCount(); save(); };

  $('#next').onclick = () => {
    const cfg = RINGS[state.ring];
    if(cfg.gold){
      state.goldLine = $('#gold-input').value || '';
      runScan();
    } else {
      state.ring++;
      renderRing();
      if(state.ring === 3){ $('#gold-input').value = state.goldLine; }
    }
    save();
  };

  function runScan(){
    show('s-scan');
    if(sky.ok) sky.setEnergy(0.85);
    const texts = ['Charting your sky…','Reading the gold ring…','Plotting the navigator…'];
    let i=0; $('#scan-text').textContent = texts[0];
    const iv = setInterval(()=>{ i++; if(texts[i]) $('#scan-text').textContent = texts[i]; }, 720);
    setTimeout(()=>{ clearInterval(iv); openNavigator(); }, 2300);
  }

  function cardData(){
    const a = archetype();
    return {
      total: total(),
      goldLine: state.goldLine,
      archetype: { name:a[0], epithet:a[1], line:a[2] },
      rings: RINGS.map((c, i) => ({
        radius: c.cr, short: c.short, count: state.starsByRing[i].length,
        angles: state.starsByRing[i].map(s => s.ang),
      })),
    };
  }

  function openNavigator(){
    const d = cardData();
    $('#arch-epithet').textContent = '· ' + d.archetype.epithet + ' ·';
    $('#arch-name').textContent = d.archetype.name;
    $('#arch-line').textContent = d.archetype.line;
    card.render(d);
    show('s-nav');
    pushEnergy();
    const n = $('#arch-name'); n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
  }

  $('#share').onclick = () => card.share();
  $('#download').onclick = () => card.download();
  $('#to-transmit').onclick = () => show('s-transmit');

  // transmit chips
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if(!b) return;
    const sel = b.classList.contains('sel');
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('sel'));
    if(!sel){ b.classList.add('sel'); state.lifeStage = b.dataset.v; }
    else state.lifeStage = '';
  });
  // ---------- transmit to the mothership (anonymous counts only) ----------
  const SUPABASE_URL = 'https://bgjengudzfickgomjqmz.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnamVuZ3VkemZpY2tnb21qcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTI3NjcsImV4cCI6MjA3MTE4ODc2N30.kYQ2oFuQBGmu4V_dnj_1zDMDVsd-qpDZJwNvswzO6M0';

  $('#transmit').onclick = async () => {
    const [r1,r2,r3,gold] = state.starsByRing.map(r=>r.length);
    const btn = $('#transmit'); const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Transmitting…';
    $('#transmit-err').style.display = 'none';
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/constellations_cards', {
        method:'POST',
        headers:{ apikey:SUPABASE_ANON, Authorization:'Bearer '+SUPABASE_ANON,
          'Content-Type':'application/json', Prefer:'return=minimal' },
        body: JSON.stringify({
          ring1:r1, ring2:r2, ring3:r3, ring_gold:gold,
          life_stage: state.lifeStage || null,
          region: ($('#region-input').value||'').trim().toUpperCase().split(/\s+/)[0].slice(0,4) || null,
          wish: (state.goldLine||'').trim() || null,
          source:'web-sky',
        }),
      });
      if(!r.ok) throw new Error(r.status);
      show('s-debrief');
    } catch(e){
      btn.disabled = false; btn.textContent = orig;
      $('#transmit-err').style.display = 'block';
    }
  };
  $('#skip-transmit').onclick = () => show('s-debrief');

  $('#restart').onclick = () => {
    state.starsByRing.forEach(r => r.forEach(s => s.el.remove()));
    state.starsByRing = [[],[],[],[]];
    state.ring = 0; state.goldLine=''; state.lifeStage='';
    $('#gold-input').value=''; if($('#region-input')) $('#region-input').value='';
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('sel'));
    localStorage.removeItem(KEY);
    if(sky.ok) sky.setEnergy(0.12);
    show('s-intro');
  };

  // ---------- persistence ----------
  function save(){
    try{
      localStorage.setItem(KEY, JSON.stringify({
        screen: state.screen, ring: state.ring,
        counts: state.starsByRing.map(r=>r.length),
        goldLine: state.goldLine, lifeStage: state.lifeStage,
      }));
    }catch(e){}
  }

  function restore(){
    let d; try{ d = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
    if(!d || !d.counts) { pushEnergy(); return; }
    d.counts.forEach((n, ri) => { for(let i=0;i<n;i++) placeStar(ri, false); });
    state.ring = d.ring || 0;
    state.goldLine = d.goldLine || '';
    state.lifeStage = d.lifeStage || '';
    if(state.goldLine) $('#gold-input').value = state.goldLine;
    if(state.lifeStage){
      const c = [...document.querySelectorAll('.chip')].find(c=>c.dataset.v===state.lifeStage);
      if(c) c.classList.add('sel');
    }
    let screen = d.screen || 's-intro';
    if(screen === 's-scan') screen = 's-nav';
    if(screen === 's-play') renderRing();
    if(screen === 's-nav'){
      const dd = cardData();
      $('#arch-epithet').textContent = '· ' + dd.archetype.epithet + ' ·';
      $('#arch-name').textContent = dd.archetype.name;
      $('#arch-line').textContent = dd.archetype.line;
      card.render(dd);
    }
    show(screen, true);
  }

  // fonts ready → re-render card crisply if shown
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>{ if(state.screen==='s-nav') card.render(cardData()); });
  }

  restore();
})();
