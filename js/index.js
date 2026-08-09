/**
 * ============================================================
 *  Rama & Mia — Wedding Invitation
 *  Handles: page transition (cover → invitation) + scratch coins + kupu-kupu
 * ============================================================
 */

// ============================================
//  CONFIG
// ============================================
const CONFIG = {
  // Path ke foil image (kalau ga ada → fallback ke gradient silver)
  FOIL_SRC: 'assets/img/halamanSatu/coin.webp',

  // Brush size scratch (% dari width coin)
  BRUSH_RATIO: 0.12,

  // Timing animasi page transition (ms)
  SHAKE_DURATION: 350,
  PAGE_TRANSITION_DURATION: 900,

  // Wedding date untuk live countdown (uncomment di bawah untuk enable)
  WEDDING_DATE: new Date('2026-09-06T08:00:00+07:00'),
};


// ============================================
//  GUEST NAME — baca dari ?to= di URL
// ============================================
function getGuestName() {
  const params = new URLSearchParams(window.location.search);
  return params.get('to') || '';
}

function setGuestNames() {
  const name = getGuestName();
  if (!name) return;

  document.querySelectorAll('.guest-name').forEach(el => {
    el.textContent = name;
  });

  const bukaBtn = document.getElementById('bukaUndanganBtn');
  if (bukaBtn) bukaBtn.href = `main.html?to=${encodeURIComponent(name)}`;
}


// ============================================
//  INTRO ANIMATION (GSAP)
//  Pop-in bertahap saat awal load stateSatu:
//   1. layer pohon + layer bg
//   2. layer dekorasi (pot/batu/bunga)
//   3. amplop + teks "You're Invited!" + "#foRAverMIne" (bareng)
// ============================================
class IntroAnimation {
  constructor() {
    this.cover = document.getElementById('stateSatu');
    if (!this.cover) return;

    // Tiga layer absolute langsung di bawah #stateSatu (urut DOM)
    const layers = this.cover.querySelectorAll(':scope > div.absolute');
    this.layerTrees = layers[0]; // pohon kanan/kiri/tengah
    this.layerBg    = layers[1]; // bgPutih + bg
    this.layerDeco  = layers[2]; // pot, batu, bunga

    this.envelope    = document.getElementById('envelope');
    this.title       = document.getElementById('titleGroup') || this.cover.querySelector('h1');
    this.hashtag     = this.cover.querySelector('h2');
    this.bungaKiriImg  = this.cover.querySelector('img[src*="bungaKiri"]');
    this.bungaKananImg = this.cover.querySelector('img[src*="bungaKanan"]');

    this.play();
  }

  play() {
    // Sembunyikan dulu semua target sebelum animasi mulai (cegah flash)
    // h2 punya CSS translate-y-31 → animasi opacity saja biar posisi tetap
    gsap.set(
      [this.layerTrees, this.layerBg, this.layerDeco, this.envelope, this.title],
      { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' }
    );
    gsap.set(this.hashtag, { autoAlpha: 0 });
    gsap.set([this.bungaKiriImg, this.bungaKananImg], { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 100%' });

    const tl = gsap.timeline({
      defaults: { ease: 'back.out(1.7)' },
      onComplete: () => this.playWindSway(),
    });

    // Stage 1: pohon + bg pop bareng (satu kesatuan)
    tl.to([this.layerTrees, this.layerBg], { autoAlpha: 1, scale: 1, duration: 0.7 });

    // Stage 2: dekorasi
    tl.to(this.layerDeco, { autoAlpha: 1, scale: 1, duration: 0.7 }, '+=0.05');

    // Stage 3: amplop + dua teks bareng
    tl.to(this.envelope, { autoAlpha: 1, scale: 1, duration: 0.7 }, '+=0.05')
      .to(this.title,    { autoAlpha: 1, scale: 1, duration: 0.7 }, '<')
      .to(this.hashtag,  { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, '<');

    // Stage 4: bunga kiri & kanan pop in terakhir (stagger supaya natural)
    tl.to([this.bungaKiriImg, this.bungaKananImg], {
      autoAlpha: 1, scale: 1, duration: 0.65, ease: 'back.out(2)', stagger: 0.12
    }, '+=0.05');
  }

  // Loop: bunga kiri/kanan tertiup angin
  // Kombinasi 2 efek:
  //   a) SVG filter feTurbulence + feDisplacementMap → distorsi bergelombang
  //      (riak "daun bergetar" — animasi baseFrequency + scale)
  //   b) Rotation sway halus → ilusi tangkai ikut tertiup
  playWindSway() {
    const bungaKiri  = this.cover.querySelector('img[src*="bungaKiri"]');
    const bungaKanan = this.cover.querySelector('img[src*="bungaKanan"]');

    if (bungaKiri) {
      gsap.set(bungaKiri, { transformOrigin: '50% 100%' });
      gsap.fromTo(bungaKiri,
        { rotation: -3 },
        { rotation: 4, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true }
      );
    }
    if (bungaKanan) {
      gsap.set(bungaKanan, { transformOrigin: '50% 100%' });
      gsap.fromTo(bungaKanan,
        { rotation: 3 },
        { rotation: -4, duration: 2.7, ease: 'sine.inOut', repeat: -1, yoyo: true }
      );
    }
  }
}


// ============================================
//  PAGE TRANSITION (GSAP)
//  cover (state 1) → invitation (state 2)
// ============================================
class PageTransition {
  constructor() {
    this.cover         = document.getElementById('stateSatu');
    this.invitation    = document.getElementById('stateDua');
    this.envelope      = document.getElementById('envelope');
    this.openBtn       = document.getElementById('openInvitationBtn');
    this.amplopWrapper = document.getElementById('amplopBukaWrapper');

    this.isTransitioning = false;

    this.init();
    this.bindEvents();
  }

  init() {
    if (this.invitation) {
      gsap.set(this.invitation, { autoAlpha: 0, display: 'none' });
    }

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    if (this.envelope) this.envelope.style.cursor = 'pointer';
  }

  bindEvents() {
    if (!this.envelope || !this.openBtn) return;
    this.envelope.addEventListener('click', (e) => this.open(e));
    this.openBtn.addEventListener('click',  (e) => this.open(e));
  }

  open(e) {
    if (e) e.preventDefault();
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const pin            = document.getElementById('pinImg');
    const amplopTutupImg = document.getElementById('amplopTutupImg');
    const hero           = this.invitation ? this.invitation.querySelector('section') : null;

    const tl = gsap.timeline({
      onComplete: () => window.dispatchEvent(new Event('resize'))
    });

    // 1. Kamera zoom in ke seluruh scene; di tengah zoom, pin terbang & tutup amplop memudar
    tl.set('#openInvitationBtn', { autoAlpha: 0 });
    tl.to(this.cover, { scale: 2.3, transformOrigin: '50% 50%', duration: 0.9, ease: 'power2.in' });
    tl.to(pin, { y: -80, x: 10, rotate: 45, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, '<+=0.3');
    tl.to(amplopTutupImg, { autoAlpha: 0, duration: 0.4, ease: 'power2.inOut' }, '<+=0.1');
    tl.to(this.cover, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, '<');

    // 2. stateDua muncul — set elemen tersembunyi SEBELUM fade in
    //    agar GSAP bisa baca dimensi asli (display:block tapi masih opacity:0)
    tl.set(this.cover,      { display: 'none' });
    tl.set(this.invitation, { display: 'block' });
    // Seluruh hero (background, dekorasi, amplop) mulai dalam keadaan masih
    // zoom in, nanti di-zoom out bersamaan perlahan — persis efek kamera mundur
    tl.set(hero, { scale: 2.3, transformOrigin: '50% 40%' });

    // Sembunyikan elemen dalam timeline (bukan init) supaya dimensi sudah tersedia
    const janurKiriImg  = document.querySelector('#s2JanurKiri  img');
    const janurKananImg = document.querySelector('#s2JanurKanan img');
    const bungaKiriImg  = document.querySelector('#s2BungaKiri  img');
    const bungaKananImg = document.querySelector('#s2BungaKanan img');

    tl.set([janurKiriImg, janurKananImg, bungaKiriImg, bungaKananImg],
      { autoAlpha: 0 });
    // objekKiri punya class scale-80 → end animasi harus 0.8 bukan 1
    // y awal menaruh tiap objek di mulut amplop, supaya terlihat keluar dari dalamnya
    tl.set('#objekKiri',   { autoAlpha: 0, scale: 0, y: 130, transformOrigin: '50% 100%' });
    tl.set('#objekKanan',  { autoAlpha: 0, scale: 0, y: 60,  transformOrigin: '50% 100%' });
    tl.set('#objekTengah', { autoAlpha: 0, scale: 0, y: 100, transformOrigin: '50% 100%' });
    tl.set('#bungaPink',   { autoAlpha: 0, scale: 0, y: 40,  transformOrigin: '50% 100%' });
    tl.set('#bungIjo',     { autoAlpha: 0 });
    // Reveal disembunyikan SEBELUM stateDua fade-in, biar tidak sempat kelihatan
    tl.set('#revealSection', { autoAlpha: 0, y: 40 });

    // Lukis foil koin sekarang — invitation sudah display:block tapi masih invisible,
    // sehingga getBoundingClientRect() sudah punya dimensi nyata.
    // Tanpa ini, angka muncul sebentar sebelum foil terlukis.
    tl.call(() => window.dispatchEvent(new Event('resize')));

    // Amplop terbuka muncul menggantikan amplop tertutup (kamera masih zoom in)
    tl.to(this.invitation, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' });

    // 3. Zoom out perlahan — scene terungkap pelan-pelan (efek Ken Burns)
    tl.to(hero, { scale: 1, duration: 3.4, ease: 'power2.inOut' }, '+=0.35');

    // Dekorasi (janur, bunga, bungIjo) ikut muncul saat kamera mundur, lalu sway
    tl.to([janurKiriImg, janurKananImg, bungaKiriImg, bungaKananImg, '#bungIjo'],
      { autoAlpha: 1, duration: 0.8, ease: 'power1.out' }, '<+=0.8');

    // 4. Isi amplop keluar SATU PER SATU dari dalam amplop
    const isiAmplop = [
      ['#objekTengah', 1],
      ['#objekKiri',   0.8], // class scale-80 → end 0.8 bukan 1
      ['#objekKanan',  1],
      ['#bungaPink',   1],
    ];
    isiAmplop.forEach(([sel, endScale], i) => {
      tl.to(sel, {
        autoAlpha: 1, scale: endScale, y: 0,
        duration: 0.75, ease: 'back.out(1.5)',
      }, i === 0 ? '<+=0.6' : '<+=0.4');
    });

    // 5. Sway loop setelah pop selesai
    tl.call(() => {
      const sway = (el, from, to, dur, origin) => {
        if (!el) return;
        gsap.set(el, { transformOrigin: origin });
        gsap.fromTo(el, { rotation: from }, { rotation: to, duration: dur, ease: 'sine.inOut', repeat: -1, yoyo: true });
      };
      sway(janurKiriImg,  -4,  4, 3.8, '50% 100%');
      sway(janurKananImg,  4, -4, 3.5, '50% 100%');
      sway(bungaKiriImg,  -3,  3, 2.4, '50% 100%');
      sway(bungaKananImg,  3, -3, 2.7, '50% 100%');
    });

    // 6. Kupu-kupu keluar dari amplop lalu beterbangan di hero
    tl.call(() => new Butterflies(hero, this.amplopWrapper).release(), null, '+=0.1');

    // 7. Unlock scroll
    tl.call(() => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }, null, '+=0.3');

    // 8. Reveal section disembunyikan dulu, dan triggernya baru didaftarkan
    //    setelah tamu benar-benar scroll — supaya di layar tinggi (section
    //    sudah terlihat sejak awal) dia tidak langsung muncul otomatis.
    tl.call(() => {
      if (!window.ScrollTrigger) return;
      gsap.registerPlugin(ScrollTrigger);

      window.addEventListener('scroll', () => {
        gsap.to('#revealSection', {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '#revealSection', start: 'top 80%' },
        });
        ScrollTrigger.refresh();
      }, { once: true, passive: true });
    });
  }
}


// ============================================
//  BUTTERFLIES
//  Kupu-kupu SVG keluar dari amplop lalu
//  beterbangan acak di area hero (loop terus)
// ============================================
class Butterflies {
  constructor(hero, anchor, count = 5) {
    this.hero = hero;
    this.anchor = anchor || hero; // titik keluar kupu-kupu (amplop)
    this.count = count;
  }

  release() {
    if (!this.hero) return;

    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;';
    this.hero.appendChild(layer);

    const heroRect = this.hero.getBoundingClientRect();
    const aRect = this.anchor.getBoundingClientRect();
    const startX = aRect.left - heroRect.left + aRect.width / 2;
    const startY = aRect.top - heroRect.top + aRect.height / 2;

    // [warna sayap, warna badan] — dari palet undangan
    const palettes = [
      ['#a8b44a', '#585f26'],
      ['#f9c4c4', '#b76e6e'],
      ['#d4af37', '#8a6d1f'],
      ['#c9d17b', '#7a7d35'],
      ['#f0e3c8', '#b79b5a'],
    ];

    for (let i = 0; i < this.count; i++) {
      const size = gsap.utils.random(20, 32);
      const el = this.build(size, palettes[i % palettes.length]);
      el.style.left = `${startX - size / 2}px`;
      el.style.top  = `${startY - size / 2}px`;
      layer.appendChild(el);

      this.flap(el, gsap.utils.random(0.13, 0.2));

      gsap.set(el, { autoAlpha: 0, scale: 0.3 });
      gsap.to(el, {
        autoAlpha: 1, scale: 1,
        duration: 0.5, ease: 'back.out(1.7)', delay: 0.35 * i,
        onComplete: () => this.wander(el, heroRect, startX, startY),
      });
    }
  }

  build(size, [wingColor, bodyColor]) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;width:${size}px;height:${size}px;will-change:transform;`;
    el.innerHTML = `
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <g class="wing"><path d="M48 52 C 20 10, 0 26, 13 46 C 1 58, 18 86, 48 58 Z" fill="${wingColor}" opacity="0.9"/></g>
        <g class="wing"><path d="M52 52 C 80 10, 100 26, 87 46 C 99 58, 82 86, 52 58 Z" fill="${wingColor}" opacity="0.9"/></g>
        <ellipse cx="50" cy="54" rx="3" ry="12" fill="${bodyColor}"/>
        <path d="M47 44 Q 42 34 38 30 M53 44 Q 58 34 62 30" stroke="${bodyColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
    return el;
  }

  // Kepak sayap: scaleX bolak-balik dengan poros di sisi badan
  flap(el, dur) {
    const [kiri, kanan] = el.querySelectorAll('.wing');
    gsap.to(kiri,  { scaleX: 0.3, transformOrigin: '100% 50%', duration: dur, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(kanan, { scaleX: 0.3, transformOrigin: '0% 50%',   duration: dur, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  // Terbang ke titik acak dalam hero, rekursif tanpa henti
  wander(el, heroRect, ox, oy) {
    gsap.to(el, {
      x: gsap.utils.random(heroRect.width * 0.08, heroRect.width * 0.92) - ox,
      y: gsap.utils.random(heroRect.height * 0.06, heroRect.height * 0.62) - oy,
      rotation: gsap.utils.random(-18, 18),
      duration: gsap.utils.random(2.5, 4.5),
      ease: 'sine.inOut',
      onComplete: () => this.wander(el, heroRect, ox, oy),
    });
  }
}


// ============================================
//  SCRATCH COIN
//  Real-scratch interactive (touch + mouse)
// ============================================
class ScratchCoin {
  constructor(container, onComplete) {
    this.container = container;
    this.canvas = container.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.isDrawing = false;
    this.hasScratched = false;
    this.isComplete = false;
    this.onComplete = onComplete;
    this.foilImage = null;

    this.setupCanvas();
    this.tryLoadFoil();
    this.bindEvents();

    window.addEventListener('resize', () => this.setupCanvas());
  }

  setupCanvas() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0) return; // page belum visible, nanti di-trigger ulang

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = rect.width  * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width  = rect.width  + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.brushRadius = rect.width * CONFIG.BRUSH_RATIO;

    if (!this.hasScratched) this.paintFoil(rect.width, rect.height);
  }

  paintFoil(w, h) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, w, h);

    if (this.foilImage) {
      // Draw user's foil PNG, fitted to coin
      this.ctx.drawImage(this.foilImage, 0, 0, w, h);
    } else {
      // Fallback: CSS-style silver gradient
      const g = this.ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0,    '#a8a8a8');
      g.addColorStop(0.3,  '#e8e8e8');
      g.addColorStop(0.5,  '#ffffff');
      g.addColorStop(0.7,  '#c8c8c8');
      g.addColorStop(1,    '#888888');
      this.ctx.fillStyle = g;
      this.ctx.beginPath();
      this.ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      this.ctx.fill();

      // tiny noise specks for texture
      for (let i = 0; i < 80; i++) {
        this.ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.18})`;
        this.ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    }
  }

  tryLoadFoil() {
    const img = new Image();
    img.onload = () => {
      this.foilImage = img;
      if (!this.hasScratched) {
        const rect = this.container.getBoundingClientRect();
        if (rect.width > 0) this.paintFoil(rect.width, rect.height);
      }
    };
    img.onerror = () => {
      console.info('[ScratchCoin] foil asset tidak ditemukan, pakai fallback gradient.');
    };
    img.src = CONFIG.FOIL_SRC;
  }

  pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
  }

  bindEvents() {
    const start = (e) => { this.isDrawing = true; this.scratch(e); };
    const move  = (e) => {
      if (!this.isDrawing) return;
      if (e.touches) e.preventDefault();
      this.scratch(e);
    };
    const end   = () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.checkComplete();
    };

    this.canvas.addEventListener('mousedown',  start);
    this.canvas.addEventListener('mousemove',  move);
    this.canvas.addEventListener('mouseup',    end);
    this.canvas.addEventListener('mouseleave', end);
    this.canvas.addEventListener('touchstart', start, { passive: true });
    this.canvas.addEventListener('touchmove',  move,  { passive: false });
    this.canvas.addEventListener('touchend',   end);
  }

  checkComplete() {
    if (this.isComplete) return;
    const { width, height } = this.canvas;
    const data = this.ctx.getImageData(0, 0, width, height).data;
    let transparent = 0;
    // sample setiap 4 pixel supaya tidak berat
    const step = 4 * 4;
    const total = Math.floor(data.length / step);
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 10) transparent++;
    }
    if (transparent / total >= 0.6) {
      this.isComplete = true;
      this.onComplete?.();
    }
  }

  scratch(e) {
    this.hasScratched = true;
    const { x, y } = this.pos(e);
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brushRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}


// ============================================
//  COUNTDOWN (live timer)
//  Uncomment baris init di paling bawah untuk enable
// ============================================
class Countdown {
  constructor(targetDate) {
    this.target = targetDate;
    this.containers = {
      days:    document.getElementById('cd-days'),
      hours:   document.getElementById('cd-hours'),
      minutes: document.getElementById('cd-minutes'),
      seconds: document.getElementById('cd-seconds'),
    };

    if (!this.containers.days) return;

    // Inisialisasi digit slot per container (days = 3 digit, lainnya = 2)
    this.slots = {};
    Object.entries(this.containers).forEach(([key, el]) => {
      const len = key === 'days' ? 3 : 2;
      this.slots[key] = this.initSlots(el, len);
    });

    this.tick();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  // Buat struktur DOM untuk tiap digit: slot (overflow hidden) > stack > digit
  initSlots(container, len) {
    container.innerHTML = '';
    container.style.display = 'inline-flex';
    container.style.lineHeight = '1';

    const slots = [];
    for (let i = 0; i < len; i++) {
      const slot = document.createElement('span');
      slot.style.display = 'inline-block';
      slot.style.overflow = 'hidden';
      slot.style.height = '1em';
      slot.style.verticalAlign = 'top';

      const stack = document.createElement('span');
      stack.style.display = 'block';

      const digit = document.createElement('span');
      digit.style.display = 'block';
      digit.style.height = '1em';
      digit.textContent = '0';

      stack.appendChild(digit);
      slot.appendChild(stack);
      container.appendChild(slot);

      slots.push({ stack, current: '0' });
    }
    return slots;
  }

  pad(n, len = 2) {
    return String(n).padStart(len, '0');
  }

  // Update value: hanya digit yang berubah yang dianimasikan dengan scroll-up
  setValue(slots, value) {
    const digits = value.split('');
    digits.forEach((newDigit, i) => {
      const slot = slots[i];
      if (!slot || slot.current === newDigit) return;

      // Tambahkan digit baru di bawah, lalu translate stack ke atas 1em
      const newEl = document.createElement('span');
      newEl.style.display = 'block';
      newEl.style.height = '1em';
      newEl.textContent = newDigit;
      slot.stack.appendChild(newEl);

      gsap.to(slot.stack, {
        y: '-1em',
        duration: 0.45,
        ease: 'power2.inOut',
        onComplete: () => {
          // Hapus digit lama (paling atas) dan reset translate
          slot.stack.firstChild.remove();
          gsap.set(slot.stack, { y: 0 });
          slot.current = newDigit;
        }
      });
    });
  }

  tick() {
    const diff = this.target - new Date();

    if (diff <= 0) {
      this.setValue(this.slots.days,    '000');
      this.setValue(this.slots.hours,   '00');
      this.setValue(this.slots.minutes, '00');
      this.setValue(this.slots.seconds, '00');
      clearInterval(this.intervalId);
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff / 3600000) % 24);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);

    this.setValue(this.slots.days,    this.pad(d, 3));
    this.setValue(this.slots.hours,   this.pad(h, 2));
    this.setValue(this.slots.minutes, this.pad(m, 2));
    this.setValue(this.slots.seconds, this.pad(s, 2));
  }
}


// ============================================
//  CONFETTI — meledak dari tengah saat semua koin selesai
// ============================================
function launchConfetti() {
  // Warna dari palet undangan
  const colors = ['#585f26', '#a8b44a', '#d4af37', '#f9c4c4', '#ffffff'];

  const burst = (opts) => confetti({
    particleCount: 60,
    spread: 70,
    colors,
    ...opts,
  });

  // Salvo pertama dari tengah
  burst({ origin: { x: 0.5, y: 0.6 }, angle: 90 });

  // Salvo kiri & kanan 300ms kemudian
  setTimeout(() => {
    burst({ origin: { x: 0.2, y: 0.65 }, angle: 60 });
    burst({ origin: { x: 0.8, y: 0.65 }, angle: 120 });
  }, 300);
}


// ============================================
//  INIT — jalankan setelah DOM ready
// ============================================
function init() {
  // Isi nama tamu dari query ?to=
  setGuestNames();

  // Intro pop-in animation untuk stateSatu
  new IntroAnimation();

  // Page transition (cover → invitation)
  new PageTransition();

  // Sembunyikan countdown + tombol + save the date sampai semua koin selesai di-scratch
  const countdownSection    = document.getElementById('countdownSection');
  const bukaUndanganSection = document.getElementById('bukaUndanganSection');
  const saveTheDateText     = document.getElementById('saveTheDateText');
  if (countdownSection)    gsap.set(countdownSection,    { autoAlpha: 0, y: 24 });
  if (bukaUndanganSection) gsap.set(bukaUndanganSection, { autoAlpha: 0, y: 24 });
  if (saveTheDateText)     gsap.set(saveTheDateText,     { autoAlpha: 0, y: 16 });

  // Scratch coins — reveal setelah semua 3 koin selesai
  const coinEls = document.querySelectorAll('[data-coin]');
  let doneCount = 0;
  const onCoinComplete = () => {
    doneCount++;
    if (doneCount < coinEls.length) return;

    // Semua koin selesai → confetti + tampilkan save the date + countdown + tombol
    launchConfetti();
    if (saveTheDateText) {
      gsap.to(saveTheDateText, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    }
    if (countdownSection) {
      gsap.to(countdownSection, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 });
    }
    if (bukaUndanganSection) {
      gsap.to(bukaUndanganSection, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.35 });
    }
  };
  coinEls.forEach(el => new ScratchCoin(el, onCoinComplete));

  // Live countdown menuju 6 September 2026
  new Countdown(CONFIG.WEDDING_DATE);
}

// Run init setelah DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}