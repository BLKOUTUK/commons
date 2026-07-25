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
  const SHARE_URL = 'https://commons.blkoutuk.com/sky.html';
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

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

    // data: { total, goldLine, archetype:{name,epithet}, rings:[{radius,short,count,angles[]}] }
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
      data.rings.forEach((ring) => {
        if(ring.count === 0) return;
        ctx.strokeStyle = 'rgba(212,175,55,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, ring.radius, 0, Math.PI*2); ctx.stroke();
      });

      const placed = [];
      data.rings.forEach((ring, ri) => {
        const r = rng(ri*131 + ring.count*7 + 3);
        const pts = [];
        for(let i=0;i<ring.count;i++){
          const ang = (ring.angles && ring.angles[i] != null)
            ? ring.angles[i] : (i * GOLDEN + ri * 1.3);
          const rad = ring.radius + (r()-0.5) * 22;
          pts.push([CX + Math.cos(ang)*rad, CY + Math.sin(ang)*rad]);
        }
        if(pts.length > 1){
          // connect in angular order for a clean web
          const order = pts.map((p,i)=>i).sort((a,b)=>
            Math.atan2(pts[a][1]-CY,pts[a][0]-CX) - Math.atan2(pts[b][1]-CY,pts[b][0]-CX));
          ctx.strokeStyle = ri === 3 ? 'rgba(255,215,0,0.28)' : 'rgba(212,175,55,0.16)';
          ctx.lineWidth = ri === 3 ? 1.4 : 1;
          ctx.beginPath();
          order.forEach((idx,k)=>{ const p=pts[idx]; k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]); });
          ctx.closePath(); ctx.stroke();
        }
        pts.forEach(p => placed.push({x:p[0], y:p[1], ri}));
      });

      placed.forEach(s => {
        const big = s.ri === 3;
        const baseR = big ? 4.4 : (3.0 - s.ri*0.22);
        const glow = big ? 'rgba(255,228,120,0.95)' : 'rgba(255,215,0,0.85)';
        const core = big ? '#FFF3C4' : INK;
        star(ctx, s.x, s.y, baseR, glow, core);
        if(big) sparkle(ctx, s.x, s.y, 15, 1.3);
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

      // ---- the two readings ----
      const a = data.archetype || { name:'The Navigator', epithet:'reader of the whole sky' };
      const f = data.friend    || { name:'The Open Door', epithet:'whatever it is, whenever' };

      const reading = (over, name, epithet, colour, y) => {
        ctx.fillStyle = 'rgba(212,175,55,0.7)';
        ctx.font = '400 15px ' + DISPLAY;
        ctx.fillText(over, CX, y);
        ctx.fillStyle = colour;
        ctx.font = '700 58px ' + DISPLAY;
        ctx.fillText(name.toUpperCase(), CX, y + 56);
        ctx.fillStyle = 'rgba(244,236,216,0.62)';
        ctx.font = 'italic 400 22px ' + SERIF;
        ctx.fillText('· ' + epithet + ' ·', CX, y + 92);
      };

      reading('T H E   S K Y   Y O U   K E E P', a.name, a.epithet, GOLD, 862);
      reading('T H E   F R I E N D   Y O U   A R E', f.name, f.epithet, '#BCD9F5', 1010);

      // gold-ring line
      if(data.goldLine && data.goldLine.trim()){
        ctx.fillStyle = INK;
        ctx.font = 'italic 400 24px ' + SERIF;
        const line = '“' + data.goldLine.trim() + '”';
        ctx.fillText(line.length > 48 ? line.slice(0,47)+'…”' : line, CX, 1168);
      }

      // carried → charted. Only when it reads as gain; a shared object never
      // carries a shortfall. (Spec 02 §4, from Spec 01 §1.3.)
      if(typeof data.carried === 'number' && typeof data.charted === 'number'
         && data.charted >= data.carried){
        ctx.fillStyle = 'rgba(212,175,55,0.9)';
        ctx.font = '500 19px ' + DISPLAY;
        ctx.fillText('carried ' + data.carried + '   →   charted ' + data.charted, CX, 1216);
      }

      // ---- footer ----
      ctx.fillStyle = 'rgba(244,236,216,0.45)';
      ctx.font = '400 16px ' + DISPLAY;
      ctx.fillText(data.total + (data.total===1?' star':' stars') + '  ·  no names, stars only', CX, H - 76);
      ctx.fillStyle = 'rgba(212,175,55,0.85)';
      ctx.font = '600 16px ' + DISPLAY;
      ctx.fillText('What kind of friend are you?  ·  commons.blkoutuk.com/sky.html', CX, H - 46);

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
