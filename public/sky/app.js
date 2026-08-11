// Constellations — role cards, played in pairs. Spec 02, 25 Jul 2026.
// Two sides: who holds you, and who you hold. The balance between them is the point.
(function () {
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const KEY = 'blkout_roles_v1';

  // ---------------------------------------------------------------- THE DECK
  // Wording is data. Nathan + Jean-Eric rewrite these strings and nothing else
  // in this file changes — that is what lets the build run through sign-off.
  // side: held | give | gold        band: 0 close · 1 steady · 2 wide · 3 gold
  const CARDS = [
    { q: "Who'd pick up at 3am?",                              side: 'held', band: 0 },
    { q: "Who'd lend you £200 and not mention it again?",      side: 'held', band: 0 },
    { q: "Who knew you before you came out?",                  side: 'held', band: 1 },
    { q: "Who'd come with you so you don't walk in alone?",    side: 'held', band: 1 },
    { q: "Whose face do you know at the function?",            side: 'held', band: 2 },

    { q: "Who'd you get out of bed at 3am for?",               side: 'give', band: 0 },
    { q: "Who tells you what they don't tell other people?",   side: 'give', band: 0 },
    { q: "Who'd you go with, so they don't walk in alone?",    side: 'give', band: 1 },
    { q: "Who do you check in on for no reason?",              side: 'give', band: 1 },

    // Two distinct asks, deliberately not a binary. Known people are countable;
    // an unmet connection is a shape of absence, not a number. r10 = the cheap
    // population (one introduction away), wish = the one needing building.
    { q: "Who do you already know that you'd want closer?",    side: 'gold', band: 3,
      noGuess: true, wish: true },
  ];

  const SIDE_LABEL = {
    held: 'Part one — who holds you',
    give: 'Part two — who you hold',
    gold: 'The gold ring',
  };

  const BANDS = [
    { rf: 0.30, cr: 110, short: 'CLOSE'  },
    { rf: 0.52, cr: 185, short: 'STEADY' },
    { rf: 0.74, cr: 255, short: 'WIDE'   },
    { rf: 0.92, cr: 320, short: 'GOLD'   },
  ];

  const idxOf   = (side) => CARDS.map((c, i) => c.side === side ? i : -1).filter(i => i >= 0);
  const HELD    = idxOf('held');
  const GIVE    = idxOf('give');
  const atPicnic = new URLSearchParams(location.search).get('at') === 'picnic';
  // Preview deploys write to the same table. Tag them so test runs never get
  // counted as research data. Allow-list the one real host rather than
  // block-listing preview hosts — an unknown host must fail towards 'preview',
  // never towards polluting the dataset.
  const isPreview = location.hostname !== 'commons.blkoutuk.com';

  // --------------------------------------------------------------- STATE
  const state = {
    screen: 's-intro',
    mode: null,                        // 'pairs' | 'solo'
    i: 0,
    guess: new Array(CARDS.length).fill(null),
    count: new Array(CARDS.length).fill(null),
    wish: '', lifeStage: '',
  };

  const n  = (i) => state.count[i] || 0;
  const sum = (list) => list.reduce((a, i) => a + n(i), 0);

  // --------------------------------------------------------------- THE READING
  // The balance. Describes, never scores — a man who receives more than he gives
  // may be ill, grieving, new to a city, newly out. This is a season, not a verdict.
  function balance() {
    const held = sum(HELD), give = sum(GIVE);
    if (held <= 3 && give <= 3)
      return 'Both skies still filling. Early is a place everyone starts.';
    if (give > held * 1.4)
      return 'More people steer by you than you steer by. That is a gift you give — and worth asking who gives it to you.';
    if (held > give * 1.4)
      return 'Well held right now. Skies turn — the people holding you today are ones you will hold for someone later.';
    return 'It runs both ways. You are held by the people you hold — which is the rarest shape a sky comes in.';
  }

  // ------------------------------------------------------------- SKY + CARD
  const sky = new window.SkyGL($('#sky-gl'));
  window.__sky = sky;
  const card = new window.ShareCard($('#card-preview'));
  const starfield = $('#starfield');
  const starsByCard = CARDS.map(() => []);

  const total = () => state.count.reduce((a, v) => a + (v || 0), 0);
  const carried = () => CARDS.reduce((a, c, i) => a + (c.noGuess ? 0 : (state.guess[i] || 0)), 0);
  const charted = () => CARDS.reduce((a, c, i) => a + (c.noGuess ? 0 : (state.count[i] || 0)), 0);

  function pushEnergy() {
    if (sky.ok) sky.setEnergy(Math.min(1, 0.12 + total() * 0.028 + state.i * 0.03));
  }

  function center() {
    return { x: innerWidth / 2, y: innerHeight / 2,
             R: Math.min(innerWidth, innerHeight) / 2 * 0.86 };
  }

  function layout() {
    const c = center();
    starsByCard.forEach((list, ci) => {
      const b = BANDS[CARDS[ci].band];
      list.forEach((s) => {
        const rad = b.rf * c.R + s.jit;
        s.el.style.left = (c.x + Math.cos(s.ang) * rad) + 'px';
        s.el.style.top  = (c.y + Math.sin(s.ang) * rad) + 'px';
      });
    });
  }
  window.addEventListener('resize', layout);

  function renderStars(ci, animate) {
    starsByCard[ci].forEach(s => s.el.remove());
    starsByCard[ci] = [];
    const gold = CARDS[ci].side === 'gold';
    const give = CARDS[ci].side === 'give';
    for (let i = 0; i < n(ci); i++) {
      const ang = i * GOLDEN + ci * 1.4;
      const jit = (Math.sin(i * 12.9898 + ci * 7.0) * 0.5) * 26;
      const el = document.createElement('div');
      el.className = 'star' + (gold ? ' gold' : give ? ' give' : '');
      el.style.animationDelay = '0s, ' + (Math.random() * 3).toFixed(2) + 's';
      if (!animate) el.style.animationName = 'twinkle';
      starfield.appendChild(el);
      starsByCard[ci].push({ ang, jit, el });
    }
    layout();
    pushEnergy();
  }

  // ------------------------------------------------------------------ SCREENS
  function show(id, instant) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (instant) {
      const t = el.style.transition; el.style.transition = 'none';
      el.classList.add('active'); el.offsetHeight; el.style.transition = t;
    } else el.classList.add('active');
    state.screen = id;
    updateHud();
    save();
  }

  function updateHud() {
    const st = $('#status');
    if (state.screen === 's-card')
      st.innerHTML = '<span class="n">' + (state.i + 1) + '</span> / ' + CARDS.length;
    else if (state.screen === 's-reveal' || state.screen === 's-debrief')
      st.innerHTML = '<span class="n">' + total() + '</span> STARS CHARTED';
    else st.textContent = '';
  }

  // ------------------------------------------------------------ NUMBER PICKER
  // Chips beat steppers here: one thumb, no keyboard, readable in sunlight.
  function picker(host, value, onPick) {
    host.innerHTML = '';
    const chips = document.createElement('div');
    chips.className = 'numrow';
    const step = document.createElement('div');
    step.className = 'stepper';
    step.style.display = 'none';

    for (let v = 0; v <= 9; v++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'num' + (value === v ? ' sel' : '');
      b.textContent = v;
      b.onclick = () => {
        chips.querySelectorAll('.num').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        onPick(v);
      };
      chips.appendChild(b);
    }
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'num more' + (value != null && value > 9 ? ' sel' : '');
    more.textContent = '10+';
    chips.appendChild(more);

    let big = (value != null && value > 9) ? value : 10;
    const minus = document.createElement('button');
    const val   = document.createElement('span');
    const plus  = document.createElement('button');
    const back  = document.createElement('button');
    minus.type = plus.type = back.type = 'button';
    minus.className = plus.className = 'num';
    back.className = 'link';
    minus.textContent = '−'; plus.textContent = '+'; back.textContent = '‹ fewer than 10';
    val.className = 'stepval';
    const paint = () => { val.textContent = big; };
    minus.onclick = () => { big = Math.max(10, big - 1); paint(); onPick(big); };
    plus.onclick  = () => { big = Math.min(200, big + 1); paint(); onPick(big); };
    back.onclick  = () => { step.style.display = 'none'; chips.style.display = ''; };
    step.append(minus, val, plus, back);
    paint();

    more.onclick = () => {
      chips.style.display = 'none';
      step.style.display = '';
      more.classList.add('sel');
      onPick(big);
    };

    host.append(chips, step);
    if (value != null && value > 9) { chips.style.display = 'none'; step.style.display = ''; }
  }

  // --------------------------------------------------------------- CARD SCREEN
  function renderCard() {
    const c = CARDS[state.i];
    $('#card-side').textContent = SIDE_LABEL[c.side];
    $('#card-no').textContent = String(state.i + 1).padStart(2, '0') + ' / ' +
                                String(CARDS.length).padStart(2, '0');
    $('#card-q').innerHTML = c.q;

    const gb = $('#guess-block');
    if (c.noGuess) {
      gb.style.display = 'none';
    } else {
      gb.style.display = '';
      $('#guess-label').textContent = state.mode === 'pairs' ? 'His guess' : 'Your guess';
      $('#guess-hint').textContent = state.mode === 'pairs'
        ? 'Ask him out loud, before you answer.'
        : 'From your head, quickly. Then count.';
      picker($('#guess-picker'), state.guess[state.i], (v) => {
        state.guess[state.i] = v; save();
      });
    }

    picker($('#answer-picker'), state.count[state.i], (v) => {
      state.count[state.i] = v;
      renderStars(state.i, true);
      save(); refreshNext();
    });

    $('#wish-block').style.display = c.wish ? '' : 'none';
    if (c.wish) $('#wish-input').value = state.wish;

    $('#next').textContent = state.i === CARDS.length - 1 ? 'Read my sky ✦' : 'Next card →';
    renderPips();
    refreshNext();
    updateHud();
  }

  // The answer is required; the guess never is. Don't block a man on a guess.
  function refreshNext() { $('#next').disabled = state.count[state.i] == null; }

  function renderPips() {
    const pips = $('#pips'); pips.innerHTML = '';
    CARDS.forEach((c, i) => {
      const p = document.createElement('div');
      p.className = 'pip ' + c.side + (i < state.i ? ' done' : i === state.i ? ' on' : '');
      pips.appendChild(p);
    });
  }

  // ------------------------------------------------------------------- REVEAL
  // Spec 01 §1.3 rules, carried over intact:
  //   never a signed difference · never "fewer/less/only/missing/short"
  //   charted > carried -> name it · equal -> name it · under -> say nothing
  function buildReveal() {
    $('#held-num').textContent = sum(HELD);
    $('#give-num').textContent = sum(GIVE);
    $('#balance-line').textContent = balance();
  }

  function cardData() {
    return {
      held: sum(HELD), give: sum(GIVE), total: total(),
      balance: balance(), goldLine: state.wish,
      rings: BANDS.map((b, bi) => ({
        radius: b.cr,
        held: CARDS.reduce((a, c, i) => a + (c.band === bi && c.side === 'held' ? n(i) : 0), 0),
        give: CARDS.reduce((a, c, i) => a + (c.band === bi && c.side === 'give' ? n(i) : 0), 0),
        gold: CARDS.reduce((a, c, i) => a + (c.band === bi && c.side === 'gold' ? n(i) : 0), 0),
      })),
    };
  }

  function openReveal() {
    buildReveal();
    card.render(cardData());
    show('s-reveal');
    pushEnergy();
  }

  function runScan() {
    show('s-scan');
    if (sky.ok) sky.setEnergy(0.85);
    const texts = state.mode === 'pairs'
      ? ['Charting your sky…', 'Reading what he saw…', 'Weighing what you give…']
      : ['Charting your sky…', 'Reading the gold…', 'Weighing what you give…'];
    let i = 0; $('#scan-text').textContent = texts[0];
    const iv = setInterval(() => { i++; if (texts[i]) $('#scan-text').textContent = texts[i]; }, 720);
    setTimeout(() => { clearInterval(iv); openReveal(); }, 2300);
  }

  // ------------------------------------------------------------------ CONTROLS
  function begin(mode) { state.mode = mode; state.i = 0; show('s-card'); renderCard(); }
  $('#go-pairs').onclick = () => begin('pairs');
  $('#go-solo').onclick  = () => begin('solo');

  $('#back').onclick = () => {
    if (state.i === 0) { show('s-intro'); return; }
    state.i--; renderCard(); save();
  };

  $('#next').onclick = () => {
    if (CARDS[state.i].wish) state.wish = $('#wish-input').value || '';
    if (state.i === CARDS.length - 1) runScan();
    else { state.i++; renderCard(); }
    save();
  };

  $('#share').onclick       = () => card.share();
  $('#download').onclick    = () => card.download();
  $('#to-transmit').onclick = () => show('s-transmit');

  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const was = b.classList.contains('sel');
    $$('.chip').forEach(c => c.classList.remove('sel'));
    if (!was) { b.classList.add('sel'); state.lifeStage = b.dataset.v; }
    else state.lifeStage = '';
  });

  // ------------------------------------------------- TRANSMIT (counts only)
  const SUPABASE_URL  = 'https://bgjengudzfickgomjqmz.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_cpUwnfcJuvnjrJjmLdZpXw_jJIOa8aB';

  $('#transmit').onclick = async () => {
    const btn = $('#transmit'); const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Transmitting…';
    $('#transmit-err').style.display = 'none';

    const payload = {
      life_stage: state.lifeStage || null,
      region: ($('#region-input').value || '').trim().toUpperCase().split(/\s+/)[0].slice(0, 4) || null,
      wish: (state.wish || '').trim() || null,
      source: state.mode + '-' + (atPicnic ? 'picnic' : 'web') + (isPreview ? '-preview' : ''),
    };
    state.count.forEach((v, i) => { payload['r' + (i + 1)] = v == null ? null : v; });
    // Partner guesses and self guesses are different measurements — never merged.
    const key = state.mode === 'pairs' ? 'g' : 's';
    CARDS.forEach((c, i) => {
      if (c.noGuess) return;
      payload[key + (i + 1)] = state.guess[i] == null ? null : state.guess[i];
    });

    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/constellations_roles', {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(r.status);
      show('s-debrief');
    } catch (e) {
      // The run survives a bad signal in the park — retry, never lose it.
      btn.disabled = false; btn.textContent = orig;
      $('#transmit-err').style.display = 'block';
    }
  };
  $('#skip-transmit').onclick = () => show('s-debrief');

  $('#restart').onclick = () => {
    starsByCard.forEach((l, i) => { l.forEach(s => s.el.remove()); starsByCard[i] = []; });
    state.mode = null; state.i = 0;
    state.guess = new Array(CARDS.length).fill(null);
    state.count = new Array(CARDS.length).fill(null);
    state.wish = ''; state.lifeStage = '';
    if ($('#region-input')) $('#region-input').value = '';
    $$('.chip').forEach(c => c.classList.remove('sel'));
    localStorage.removeItem(KEY);
    if (sky.ok) sky.setEnergy(0.12);
    show('s-intro');
  };

  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth, ny = e.clientY / innerHeight;
    if (sky.ok) sky.setMouse(nx, 1 - ny);
    starfield.style.transform = `translate(${(nx - 0.5) * -22}px, ${(ny - 0.5) * -22}px)`;
  });

  // --------------------------------------------------------------- PERSISTENCE
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        screen: state.screen, mode: state.mode, i: state.i,
        guess: state.guess, count: state.count,
        wish: state.wish, lifeStage: state.lifeStage,
      }));
    } catch (e) {}
  }

  function restore() {
    let d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    // A fresh visitor has no saved state — still show a screen, or the page is blank.
    if (!d || !d.count) { pushEnergy(); show('s-intro', true); return; }
    state.mode  = d.mode || null;
    state.i     = Math.min(d.i || 0, CARDS.length - 1);
    state.guess = Array.isArray(d.guess) && d.guess.length === CARDS.length ? d.guess : state.guess;
    state.count = Array.isArray(d.count) && d.count.length === CARDS.length ? d.count : state.count;
    state.wish  = d.wish || '';
    state.lifeStage = d.lifeStage || '';
    state.count.forEach((v, i) => { if (v) renderStars(i, false); });
    if (state.lifeStage) {
      const c = $$('.chip').find(x => x.dataset.v === state.lifeStage);
      if (c) c.classList.add('sel');
    }
    let screen = d.screen || 's-intro';
    if (screen === 's-scan') screen = 's-reveal';
    if (!state.mode && screen !== 's-intro') screen = 's-intro';
    if (screen === 's-card')   renderCard();
    if (screen === 's-reveal') { buildReveal(); card.render(cardData()); }
    show(screen, true);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (state.screen === 's-reveal') card.render(cardData()); });
  }

  restore();
})();
