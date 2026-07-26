// End-to-end flow test for constellations role cards, in jsdom.
// No browser in this environment, so this is the "is it actually wired" check.
import { JSDOM, VirtualConsole } from '/home/robbe/blkout/platform/node_modules/jsdom/lib/api.js';
import fs from 'node:fs';

const ROOT = '/home/robbe/blkout/repos/blkout-commons/public';
const html = fs.readFileSync(`${ROOT}/sky.html`, 'utf8');

let pass = 0, fail = 0;
const ok  = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const eq  = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}  (got ${JSON.stringify(a)})`);

// Canvas has no 2d context in jsdom — stub every call so ShareCard runs.
function stubCanvas(win) {
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 40 });
      if (k === 'canvas') return { width: 1080, height: 1350 };
      return () => {};
    },
    set: () => true,
  });
  win.HTMLCanvasElement.prototype.getContext = function (t) { return t === '2d' ? ctx : null; };
  win.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new win.Blob([''])); };
}

async function run(mode, plan, label, query = '', origin = 'https://commons.blkoutuk.com') {
  console.log(`\n── ${label} ──`);
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(html, {
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc,
    url: origin + '/sky.html' + query,
  });
  const { window } = dom;
  stubCanvas(window);
  window.localStorage.clear();

  let sent = null;
  window.fetch = async (url, opt) => {
    sent = { url, body: JSON.parse(opt.body) };
    return { ok: true, status: 201 };
  };

  for (const f of ['sky/sky-gl.js', 'sky/sharecard.js', 'sky/app.js']) {
    window.eval(fs.readFileSync(`${ROOT}/${f}`, 'utf8'));
  }
  const $ = s => window.document.querySelector(s);
  const vis = s => { const e = $(s); return e && e.offsetParent !== null || (e && e.style.display !== 'none'); };
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  ok(errors.length === 0, `no script errors${errors.length ? ': ' + errors[0] : ''}`);
  ok($('#s-intro').classList.contains('active'), 'starts on intro');

  click($(mode === 'pairs' ? '#go-pairs' : '#go-solo'));
  ok($('#s-card').classList.contains('active'), 'entered the deck');
  eq($('#guess-label').textContent, mode === 'pairs' ? 'His guess' : 'Your guess', 'guess label matches mode');
  ok($('#next').disabled, 'Next is blocked before an answer');

  const pick = (host, v) => {
    const btns = [...$(host).querySelectorAll('.num')];
    const b = btns.find(x => x.textContent === String(v));
    if (!b) throw new Error(`no chip ${v} in ${host}`);
    click(b);
  };

  const seenSides = new Set();
  for (let i = 0; i < plan.length; i++) {
    seenSides.add($('#card-side').textContent);
    const step = plan[i];
    if (step.guess != null && $('#guess-block').style.display !== 'none') pick('#guess-picker', step.guess);
    pick('#answer-picker', step.count);
    ok(!$('#next').disabled, `card ${i + 1}: Next unblocked after answer`);
    if (i === plan.length - 1) {
      ok($('#guess-block').style.display === 'none', 'last card has no guess block');
      ok($('#wish-block').style.display !== 'none', 'last card shows the wish field');
      $('#wish-input').value = 'someone to go to things with';
    }
    click($('#next'));
  }

  ok(seenSides.has('Part one — who holds you'), 'saw the held side');
  ok(seenSides.has('Part two — who you hold'), 'saw the give side');
  ok(seenSides.has('The gold ring'), 'saw the gold ring');
  ok($('#s-scan').classList.contains('active'), 'ran the scan');

  await new Promise(r => setTimeout(r, 2600));
  ok($('#s-reveal').classList.contains('active'), 'reached the reveal');

  const res = {
    held: $('#held-num').textContent,
    give: $('#give-num').textContent,
    balance: $('#balance-line').textContent,
  };

  click($('#to-transmit'));
  click($('#chips').querySelector('[data-v="35-49"]'));
  $('#region-input').value = 'se15';
  click($('#transmit'));
  await new Promise(r => setTimeout(r, 60));

  return { res, sent, window, $ };
}

// ── 1. pairs, counts ABOVE guesses (the joyful path) ────────────────────────
{
  const plan = [
    { guess: 2, count: 4 }, { guess: 1, count: 3 }, { guess: 2, count: 5 },
    { guess: 1, count: 2 }, { guess: 5, count: 9 },
    { guess: 2, count: 3 }, { guess: 1, count: 2 }, { guess: 2, count: 4 },
    { guess: 1, count: 3 }, { count: 2 },
  ];
  const { res, sent } = await run('pairs', plan, 'PAIRS · a full sky, both sides');
  eq(res.held, '23', 'held total = cards 1-5');
  eq(res.give, '12', 'give total = cards 6-9');
  ok(res.balance.length > 0, 'balance line is the single payoff');
  ok(!/\bcards?\b|archetype/i.test(res.balance), 'no archetype survives in the reveal');
  ok(sent && sent.url.endsWith('/constellations_roles'), 'posts to the new table');
  const b = sent.body;
  eq([b.r1, b.r5, b.r10], [4, 9, 2], 'r1..r10 populated incl. gold');
  ok('g1' in b && 'g9' in b && !('s1' in b), 'pairs mode writes g1..g9, never s*');
  eq(b.g9, 1, 'g9 carries the last guessable card');
  eq([b.life_stage, b.region, b.source], ['35-49', 'SE15', 'pairs-web'], 'meta fields');
  eq(b.wish, 'someone to go to things with', 'wish captured from card 10');
}

// ── 2. solo, counts BELOW guesses (the anti-deficit path) ───────────────────
{
  // Genuinely sparse — the man this design most has to not wound.
  // held = 2, give = 1, so both sides fall in the sparse branch.
  const plan = [
    { guess: 6, count: 1 }, { guess: 5, count: 0 }, { guess: 4, count: 1 },
    { guess: 5, count: 0 }, { guess: 9, count: 0 },
    { guess: 4, count: 0 }, { guess: 3, count: 1 }, { guess: 4, count: 0 },
    { guess: 3, count: 0 }, { count: 0 },
  ];
  const { res, sent } = await run('solo', plan, 'SOLO · a sparse sky (anti-deficit)');
  const banned = /\b(fewer|less|only|missing|short)\b|−|-\d/i;
  ok(!banned.test(res.balance), 'no banned words and no signed difference in the reveal');
  ok(/still filling|everyone starts/i.test(res.balance), 'sparse reads as beginning, not deficit');
  ok('s1' in sent.body && !('g1' in sent.body), 'solo mode writes s1..s9, never g*');
  eq(sent.body.source, 'solo-web', 'solo source');
}

// ── 3. the reciprocity flip — gives much more than he gets ──────────────────
{
  const plan = [
    { guess: 1, count: 0 }, { guess: 1, count: 0 }, { guess: 1, count: 1 },
    { guess: 1, count: 0 }, { guess: 2, count: 1 },
    { guess: 2, count: 6 }, { guess: 2, count: 5 }, { guess: 2, count: 4 },
    { guess: 2, count: 5 }, { count: 1 },
  ];
  const { res } = await run('solo', plan, 'RECIPROCITY · gives far more than he receives');
  console.log(`     held=${res.held} give=${res.give}`);
  console.log(`     balance="${res.balance}"`);
  ok(/steer by you/.test(res.balance), 'balance names him as load-bearing, not isolated');
}

// ── 4. the station QR carries ?at=picnic into the source ────────────────────
{
  const plan = Array.from({ length: 10 }, (_, i) => ({ guess: 1, count: i === 9 ? 1 : 2 }));
  const { sent } = await run('pairs', plan, 'QR · ?at=picnic tags the source', '?at=picnic');
  eq(sent.body.source, 'pairs-picnic', 'picnic QR tags the row as picnic-day data');
}

// ── 5. preview hosts must never write untagged research data ────────────────
// Regression guard: if this check is ever loosened, test runs silently enter
// the dataset as real respondents and nothing surfaces the error.
{
  const plan = Array.from({ length: 10 }, () => ({ guess: 1, count: 2 }));
  const hosts = [
    ['https://sky.blkoutuk.cloud',                       'solo-web-preview', 'named preview host'],
    ['http://u79azo6sk44zm4ogs6ak0f6s.72.61.201.5.sslip.io', 'solo-web-preview', 'sslip.io host'],
    ['https://some-host-nobody-anticipated.example',     'solo-web-preview', 'unknown host fails safe'],
    ['https://commons.blkoutuk.com',                     'solo-web',         'production stays untagged'],
  ];
  for (const [origin, expect, why] of hosts) {
    const { sent } = await run('solo', plan, `HOST · ${why}`, '', origin);
    eq(sent.body.source, expect, why);
  }
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
