// The share card — the player's own constellation as a postable art object.
// BLKOUT-branded. No names, ever. Stars, counts, and the sky they keep.
(function () {
  const W = 1080, H = 1350;
  const GOLD = '#FFD700';
  const INK = '#F4ECD8';
  const CX = W/2, CY = 470;
  const DISPLAY = '"Work Sans", system-ui, sans-serif';
  const SERIF   = '"Fraunces", Georgia, serif';
  // NOT /sky — that 301s to the asset directory and 403s. Verified 25 Jul 2026.
  // On a preview host, share the preview: otherwise a tester sends a friend to
  // the old production build and the loop can't be tested at all.
  const CANONICAL = 'https://commons.blkoutuk.com/sky.html';
  const SHARE_URL = location.hostname === 'commons.blkoutuk.com'
    ? CANONICAL
    : location.origin + '/sky.html';
  const SHARE_LABEL = SHARE_URL.replace(/^https?:\/\//, '');

  function rng(seed){
    let s = (seed * 2654435761) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function star(ctx, x, y, r, glow, core){
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
    g.addColorStop(0, glow);
    g.addColorStop(0.5, 'rgba(255,215,0,0.10)');
    g.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }

  function sparkle(ctx, x, y, len, w){
    ctx.save(); ctx.translate(x, y);
    const grad = ctx.createLinearGradient(-len, 0, len, 0);
    grad.addColorStop(0, 'rgba(255,215,0,0)');
    grad.addColorStop(0.5, 'rgba(255,239,170,0.9)');
    grad.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-len, -w/2, len*2, w);
    ctx.fillRect(-w/2, -len, w, len*2);
    ctx.restore();
  }

  class ShareCard {
    constructor(canvas){
      this.canvas = canvas;
      canvas.width = W; canvas.height = H;
      this.ctx = canvas.getContext('2d');
    }

    // data: { held, give, total, balance, rings:[{radius, held, give, gold}] }
    render(data){
      const ctx = this.ctx;
      ctx.clearRect(0,0,W,H);

      // ---- cosmic background ----
      ctx.fillStyle = '#06030f';
      ctx.fillRect(0,0,W,H);
      [
        [330, 470, 560, 'rgba(72,28,122,0.55)'],
        [820, 320, 460, 'rgba(150,60,30,0.26)'],
        [560, 880, 640, 'rgba(40,20,80,0.50)'],
        [540, 500, 380, 'rgba(120,90,20,0.20)'],
      ].forEach(([x,y,r,c])=>{
        const g = ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      });

      const dr = rng(99);
      ctx.fillStyle = 'rgba(244,236,216,0.5)';
      for(let i=0;i<340;i++){
        const x = dr()*W, y = dr()*H, s = dr()*1.3 + 0.2;
        ctx.globalAlpha = 0.14 + dr()*0.5;
        ctx.beginPath(); ctx.arc(x,y,s,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ---- constellation ----
      ctx.textAlign = 'center';
      // Gold on the left of the sky, cool blue on the right: the picture itself
      // is the balance, so the image reads without the numbers.
      const placed = [];
      data.rings.forEach((ring, ri) => {
        const total = (ring.held||0) + (ring.give||0) + (ring.gold||0);
        if(total === 0) return;
        ctx.strokeStyle = 'rgba(212,175,55,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, ring.radius, 0, Math.PI*2); ctx.stroke();

        const r = rng(ri*131 + total*7 + 3);
        const put = (kind, count, from, span) => {
          for(let i=0;i<count;i++){
            const ang = from + (count === 1 ? span/2 : span * (i/(count-1 || 1)));
            const rad = ring.radius + (r()-0.5) * 22;
            placed.push({ x: CX + Math.cos(ang)*rad, y: CY + Math.sin(ang)*rad, kind, ri });
          }
        };
        put('held', ring.held||0, Math.PI/2,  Math.PI);       // left arc
        put('give', ring.give||0, -Math.PI/2, Math.PI);       // right arc
        put('gold', ring.gold||0, -Math.PI/2, Math.PI*2);     // all round
      });

      placed.forEach(p => {
        const gold = p.kind === 'gold', give = p.kind === 'give';
        const glow = gold ? 'rgba(255,228,120,0.95)'
                   : give ? 'rgba(180,214,245,0.90)' : 'rgba(255,215,0,0.85)';
        const core = gold ? '#FFF3C4' : give ? '#EAF4FF' : INK;
        star(ctx, p.x, p.y, gold ? 4.4 : 3.0, glow, core);
        if(gold) sparkle(ctx, p.x, p.y, 15, 1.3);
      });

      // central sigil — you
      const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 54);
      cg.addColorStop(0, 'rgba(255,239,170,0.85)');
      cg.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(CX, CY, 54, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.font = '600 40px ' + DISPLAY;
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', CX, CY + 2);
      ctx.textBaseline = 'alphabetic';

      // ---- header ----
      ctx.fillStyle = GOLD;
      ctx.font = '600 30px ' + DISPLAY;
      ctx.fillText('B L K O U T', CX, 92);
      ctx.fillStyle = 'rgba(212,175,55,0.75)';
      ctx.font = '400 14px ' + DISPLAY;
      ctx.fillText('S T E L L A R   C A R T O G R A P H Y', CX, 120);

      // ---- the one payoff ----
      const pan = (label, value, colour, x) => {
        ctx.fillStyle = 'rgba(212,175,55,0.7)';
        ctx.font = '400 15px ' + DISPLAY;
        ctx.fillText(label, x, 906);
        ctx.fillStyle = colour;
        ctx.font = '700 96px ' + DISPLAY;
        ctx.fillText(String(value), x, 1000);
      };
      pan('H O L D   Y O U', data.held || 0, GOLD,      CX - 190);
      pan('Y O U   H O L D', data.give || 0, '#BCD9F5', CX + 190);

      ctx.strokeStyle = 'rgba(212,175,55,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX, 886); ctx.lineTo(CX, 1004); ctx.stroke();

      if(data.balance){
        ctx.fillStyle = INK;
        ctx.font = 'italic 400 31px ' + SERIF;
        let line = '', y = 1082;
        String(data.balance).split(' ').forEach(w => {
          if(ctx.measureText(line + w).width > 830){ ctx.fillText(line.trim(), CX, y); line = ''; y += 42; }
          line += w + ' ';
        });
        if(line.trim()) ctx.fillText(line.trim(), CX, y);
      }

      // ---- footer ----
      ctx.fillStyle = 'rgba(244,236,216,0.45)';
      ctx.font = '400 16px ' + DISPLAY;
      ctx.fillText(data.total + (data.total===1?' star':' stars') + '  ·  no names, stars only', CX, H - 76);
      ctx.fillStyle = 'rgba(212,175,55,0.85)';
      ctx.font = '600 16px ' + DISPLAY;
      ctx.fillText('What kind of friend are you?  ·  ' + SHARE_LABEL, CX, H - 46);

      // vignette
      const vg = ctx.createRadialGradient(CX, H/2, 320, CX, H/2, 840);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
    }

    download(){
      this.canvas.toBlob(b => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url; a.download = 'my-sky-blkout.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    }

    async share(){
      return new Promise((res) => {
        this.canvas.toBlob(async (b) => {
          const file = new File([b], 'my-sky-blkout.png', { type: 'image/png' });
          // The link travels in the TEXT. Baked into the image it is pixels,
          // and a recipient has no way in — which is how the loop died before.
          const text = 'My sky — who holds me, and who I hold. No names, stars only.\n'
                     + 'Chart yours: ' + SHARE_URL;
          if(navigator.canShare && navigator.canShare({ files:[file] })){
            try {
              await navigator.share({ files:[file], title: 'What kind of friend are you?', text });
              res('shared');
            } catch(e){ res('cancel'); }
          } else if(navigator.share){
            try { await navigator.share({ title: 'What kind of friend are you?', text, url: SHARE_URL });
                  res('shared'); } catch(e){ res('cancel'); }
          } else { this.download(); res('download'); }
        }, 'image/png');
      });
    }
  }

  window.ShareCard = ShareCard;
})();
