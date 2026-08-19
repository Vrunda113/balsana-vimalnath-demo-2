(() => {
  const root = document.documentElement;
  const body = document.body;
  const hero = document.querySelector('.reveal-stage');
  const nav = document.getElementById('nav');
  const scrollLabel = document.getElementById('scrollLabel');

  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const map = (n, a, b) => clamp((n - a) / (b - a));

  // Hero is controlled by a virtual scroll gate, not by document scrollY.
  // This means a fast mouse-wheel / trackpad flick cannot skip the reveal.
  let current = 0;
  let target = 0;
  let released = false;
  let releasePending = false;

  function render(p) {
    const breakProgress = map(p, 0.12, 0.80);
    const shellFade = map(p, 0.10, 0.22);
    const rockFade = map(p, 0.76, 0.98);
    const crackGrow = map(p, 0.045, 0.24);
    const crackFade = 1 - map(p, 0.58, 0.80);
    const introOpacity = 1 - map(p, 0.08, 0.24);
    const navOpacity = map(p, 0.91, 0.995);

    root.style.setProperty('--p', p.toFixed(5));
    root.style.setProperty('--break', breakProgress.toFixed(5));
    root.style.setProperty('--shell-opacity', (1 - shellFade).toFixed(5));
    root.style.setProperty('--rock-opacity', (1 - rockFade).toFixed(5));
    root.style.setProperty('--crack-opacity', (crackGrow * crackFade).toFixed(5));
    root.style.setProperty('--crack-scale', (0.10 + crackGrow * 0.90).toFixed(5));
    root.style.setProperty('--intro-opacity', introOpacity.toFixed(5));
    root.style.setProperty('--nav-opacity', navOpacity.toFixed(5));
    root.style.setProperty('--glow', map(p, 0.24, 1).toFixed(5));

    if (p > .78) scrollLabel.textContent = 'Almost revealed';
    else if (p > .32) scrollLabel.textContent = 'Keep scrolling';
    else scrollLabel.textContent = 'Scroll to reveal';
  }

  function finishHero() {
    if (releasePending || released) return;
    releasePending = true;
    current = 1;
    target = 1;
    render(1);
    body.classList.add('hero-complete');

    // Tiny hold at the completed frame so the reveal lands before page movement starts.
    setTimeout(() => {
      released = true;
      releasePending = false;
      body.classList.remove('hero-locked');
      nav.classList.toggle('scrolled', window.scrollY > 55);
    }, 420);
  }

  function loop() {
    // Slow, cinematic interpolation. Even if target jumps to 1 instantly,
    // the actual animation still travels through every frame.
    const ease = target > current ? 0.055 : 0.075;
    current += (target - current) * ease;
    if (Math.abs(target - current) < 0.00025) current = target;
    render(current);

    if (!released && target >= 1 && current >= 0.995) finishHero();
    requestAnimationFrame(loop);
  }
  loop();

  function progressByWheel(deltaY) {
    const direction = Math.sign(deltaY);
    const magnitude = Math.abs(deltaY);
    // Normalize mouse wheels, trackpads, and very large flicks.
    const step = Math.min(.44, Math.max(.025, magnitude / 760));
    target = clamp(target + direction * step);
  }

  window.addEventListener('wheel', (e) => {
    if (!released) {
      e.preventDefault();
      progressByWheel(e.deltaY);
    }
  }, { passive: false });

  // Keyboard users get the same non-skippable cinematic progression.
  window.addEventListener('keydown', (e) => {
    if (released) return;
    const forward = ['ArrowDown','PageDown',' ','Enter'];
    const backward = ['ArrowUp','PageUp'];
    if (forward.includes(e.key)) { e.preventDefault(); target = clamp(target + .14); }
    if (backward.includes(e.key)) { e.preventDefault(); target = clamp(target - .14); }
    if (e.key === 'End') { e.preventDefault(); target = 1; }
  });

  // Touch swipe support while hero is locked.
  let lastTouchY = null;
  window.addEventListener('touchstart', e => {
    if (!released && e.touches[0]) lastTouchY = e.touches[0].clientY;
  }, {passive:true});
  window.addEventListener('touchmove', e => {
    if (released || lastTouchY == null || !e.touches[0]) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const delta = lastTouchY - y;
    lastTouchY = y;
    target = clamp(target + delta / 900);
  }, {passive:false});
  window.addEventListener('touchend', () => { lastTouchY = null; }, {passive:true});

  // Once the reveal is complete the navbar behaves normally and only compresses
  // after the user actually leaves the hero.
  window.addEventListener('scroll', () => {
    if (!released) return;
    nav.classList.toggle('scrolled', window.scrollY > 55);
  }, {passive:true});

  // Smooth anchor movement after the hero has released.
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const dest = id && document.querySelector(id);
      if (!dest) return;
      if (!released) {
        e.preventDefault();
        target = 1;
        return;
      }
      e.preventDefault();
      dest.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, {threshold:.16});
  document.querySelectorAll('.reveal-on-scroll').forEach(el => io.observe(el));

  // Dust particles: deliberately subtle so the movement reads as atmosphere, not VFX clutter.
  const canvas = document.getElementById('dust');
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(2, devicePixelRatio || 1), W = 0, H = 0, particles = [];
  const pointer = {x:.5,y:.5};
  function resizeCanvas(){
    W=innerWidth;H=innerHeight;dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.round(Math.min(90,Math.max(42,W/19)));
    particles=Array.from({length:count},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.25+.18,s:Math.random()*.15+.025,a:Math.random()*.38+.06,drift:(Math.random()-.5)*.09}));
  }
  addEventListener('resize',resizeCanvas);resizeCanvas();
  addEventListener('pointermove',e=>{pointer.x=e.clientX/W;pointer.y=e.clientY/H},{passive:true});
  function draw(){
    ctx.clearRect(0,0,W,H);
    const active = !released || window.scrollY < innerHeight;
    if(active){
      const revealBoost = .25 + current * .75;
      for(const p of particles){
        p.y-=p.s; p.x+=p.drift+(pointer.x-.5)*.012;
        if(p.y<-5){p.y=H+5;p.x=Math.random()*W}
        if(p.x<0)p.x=W;if(p.x>W)p.x=0;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(229,183,99,${p.a*revealBoost})`;ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  // Gentle camera parallax; rock and sacred figure remain visually stable.
  const layer=document.querySelector('.image-layer');
  addEventListener('pointermove',e=>{
    if(innerWidth<900) return;
    const x=(e.clientX/innerWidth-.5)*5, y=(e.clientY/innerHeight-.5)*3;
    layer.style.marginLeft=x+'px'; layer.style.marginTop=y+'px';
  },{passive:true});
})();
