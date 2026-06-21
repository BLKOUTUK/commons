// Living cosmic sky — a cheap, beautiful WebGL nebula that reacts to mouse + taps.
// Afrofuturist palette: deep cosmic violet/black, sovereignty gold.
(function () {
  const VERT = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;   // 0..1, y up, smoothed
    uniform float u_energy;  // 0..1 — builds across the journey
    uniform vec3  u_ripple[8];

    const vec3 BG    = vec3(0.020, 0.012, 0.052);
    const vec3 GOLD  = vec3(1.000, 0.843, 0.150);
    const vec3 AMBER = vec3(0.95,  0.45,  0.16);
    const vec3 VIOLET= vec3(0.16,  0.06,  0.26);

    float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
    }
    float fbm(vec2 p){
      float v=0.0, a=0.5;
      for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p  = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;
      vec2 m  = (u_mouse - 0.5) * vec2(u_res.x/u_res.y, 1.0);
      vec2 drift = (u_mouse - 0.5) * 0.18;
      float t = u_time * 0.018;

      // domain-warped nebula
      vec2 q = vec2(fbm(p*1.15 + drift + t), fbm(p*1.15 + drift + vec2(3.1,1.7) - t));
      float f = fbm(p*1.35 + 1.7*q - drift*0.4 + vec2(0.0, t*0.6));

      vec3 col = BG;
      col = mix(col, VIOLET, smoothstep(0.16, 0.82, f));
      col = mix(col, AMBER*0.40, smoothstep(0.66, 1.0, f) * (0.20 + 0.32*u_energy));
      col += GOLD * smoothstep(0.86, 1.12, f) * (0.05 + 0.24*u_energy);

      // distant star dust
      vec2 g = floor(uv * vec2(u_res.x/2.4, u_res.y/2.4));
      float dust = smoothstep(0.985, 1.0, hash(g));
      float tw = 0.6 + 0.4*sin(u_time*2.0 + hash(g)*40.0);
      col += vec3(0.95,0.9,0.78) * dust * tw * 0.55;

      // soft gold light following the cursor — restrained, an accent not a spotlight
      float md = length(p - m);
      col += GOLD * 0.022 / (md*md + 0.08);

      // tap ripples
      for(int i=0;i<8;i++){
        vec3 rp = u_ripple[i];
        float age = u_time - rp.z;
        if(rp.z > 0.0 && age < 2.4){
          vec2 rc = (rp.xy - 0.5) * vec2(u_res.x/u_res.y, 1.0);
          float rd = length(p - rc);
          col += GOLD * sin(rd*46.0 - age*15.0) * exp(-rd*6.5) * exp(-age*3.0) * 0.34;
        }
      }

      // vignette + gentle filmic curve
      col *= 1.0 - 0.42*dot(p,p);
      col = pow(max(col, 0.0), vec3(0.92));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }

  class SkyGL {
    constructor(canvas){
      this.canvas = canvas;
      const gl = canvas.getContext('webgl', { antialias:false, alpha:true, premultipliedAlpha:true, powerPreference:'low-power' });
      this.gl = gl;
      this.ok = !!gl;
      if(!gl){ return; }

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      this.linked = gl.getProgramParameter(prog, gl.LINK_STATUS);
      this.progLog = gl.getProgramInfoLog(prog);
      gl.useProgram(prog);
      this.prog = prog;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this.u = {
        res:    gl.getUniformLocation(prog, 'u_res'),
        time:   gl.getUniformLocation(prog, 'u_time'),
        mouse:  gl.getUniformLocation(prog, 'u_mouse'),
        energy: gl.getUniformLocation(prog, 'u_energy'),
        ripple: gl.getUniformLocation(prog, 'u_ripple[0]'),
      };

      this.mouse = [0.5, 0.5];
      this.mTarget = [0.5, 0.5];
      this.energy = 0.0;
      this.energyTarget = 0.0;
      this.ripples = new Float32Array(24); // 8 * vec3
      this.rIndex = 0;
      this.start = performance.now();
      // keep GPU load modest: cap at 1x device pixels, then a light downscale.
      // the nebula is soft, so sub-native resolution is imperceptible but much cheaper.
      this.dpr = Math.min(window.devicePixelRatio || 1, 1) * 0.85;

      // if the GPU drops the context, let the browser try to restore it instead of
      // leaving a dead black canvas on screen.
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); }, false);

      this._resize = this.resize.bind(this);
      window.addEventListener('resize', this._resize);
      this.resize();
      this._loop = this.frame.bind(this);
      requestAnimationFrame(this._loop);
    }

    resize(){
      const w = Math.floor(innerWidth * this.dpr);
      const h = Math.floor(innerHeight * this.dpr);
      this.canvas.width = w; this.canvas.height = h;
      this.canvas.style.width = innerWidth + 'px';
      this.canvas.style.height = innerHeight + 'px';
      this.gl.viewport(0, 0, w, h);
    }

    setMouse(nx, ny){ this.mTarget[0] = nx; this.mTarget[1] = ny; }
    setEnergy(e){ this.energyTarget = Math.max(0, Math.min(1, e)); }

    ripple(nx, ny){
      const t = (performance.now() - this.start) / 1000;
      const i = (this.rIndex % 8) * 3;
      this.ripples[i] = nx; this.ripples[i+1] = ny; this.ripples[i+2] = t;
      this.rIndex++;
    }

    frame(){
      try {
        const gl = this.gl;
        const t = (performance.now() - this.start) / 1000;
        this.mouse[0] += (this.mTarget[0] - this.mouse[0]) * 0.06;
        this.mouse[1] += (this.mTarget[1] - this.mouse[1]) * 0.06;
        this.energy   += (this.energyTarget - this.energy) * 0.03;
        gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.u.time, t);
        gl.uniform2f(this.u.mouse, this.mouse[0], this.mouse[1]);
        gl.uniform1f(this.u.energy, this.energy);
        gl.uniform3fv(this.u.ripple, this.ripples);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } catch(e) { /* never let one bad frame kill the loop */ }
      requestAnimationFrame(this._loop);
    }
  }

  window.SkyGL = SkyGL;
})();
