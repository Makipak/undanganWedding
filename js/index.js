/**
 * ============================================================
 *  Rama & Mia — Wedding Invitation
 *  Handles: page transition (cover → invitation) + scratch coins
 * ============================================================
 */

// ============================================
//  CONFIG
// ============================================
const CONFIG = {
  // Path ke foil image (kalau ga ada → fallback ke gradient silver)
  FOIL_SRC: 'assets/img/coin.png',

  // Brush size scratch (% dari width coin)
  BRUSH_RATIO: 0.12,

  // Timing animasi page transition (ms)
  SHAKE_DURATION: 350,
  PAGE_TRANSITION_DURATION: 900,

  // Wedding date untuk live countdown (uncomment di bawah untuk enable)
  WEDDING_DATE: new Date('2026-09-06T08:00:00+07:00'),
};


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

    this.envelope = document.getElementById('envelope');
    this.title    = this.cover.querySelector('h1'); // You're Invited!
    this.hashtag  = this.cover.querySelector('h2'); // #foRAverMIne

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
  }

  // Loop: bunga kiri/kanan tertiup angin
  // Kombinasi 2 efek:
  //   a) SVG filter feTurbulence + feDisplacementMap → distorsi bergelombang
  //      (riak "daun bergetar" — animasi baseFrequency + scale)
  //   b) Rotation sway halus → ilusi tangkai ikut tertiup
  playWindSway() {
    const bungaKiri  = this.cover.querySelector('img[src*="bungaKiri"]');
    const bungaKanan = this.cover.querySelector('img[src*="bungaKanan"]');

    // Pasang filter ke kedua bunga
    [bungaKiri, bungaKanan].forEach(el => {
      if (el) el.style.filter = 'url(#wind)';
    });

    // Animasi parameter filter — alirkan riak terus menerus
    const turb = document.querySelector('#wind feTurbulence');
    const disp = document.querySelector('#wind feDisplacementMap');

    if (turb) {
      const freqProxy = { fx: 0.015, fy: 0.02 };
      gsap.to(freqProxy, {
        fx: 0.03, fy: 0.045,
        duration: 4, ease: 'sine.inOut', repeat: -1, yoyo: true,
        onUpdate: () => turb.setAttribute('baseFrequency', `${freqProxy.fx} ${freqProxy.fy}`)
      });
    }

    if (disp) {
      const scaleProxy = { s: 4 };
      gsap.to(scaleProxy, {
        s: 11,
        duration: 3.2, ease: 'sine.inOut', repeat: -1, yoyo: true,
        onUpdate: () => disp.setAttribute('scale', scaleProxy.s)
      });
    }

    // Sway tangkai — halus saja (filter sudah jadi efek utama)
    if (bungaKiri) {
      gsap.set(bungaKiri, { transformOrigin: '50% 100%' });
      gsap.fromTo(bungaKiri,
        { rotation: -2 },
        { rotation: 3, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true }
      );
    }
    if (bungaKanan) {
      gsap.set(bungaKanan, { transformOrigin: '50% 100%' });
      gsap.fromTo(bungaKanan,
        { rotation: 2 },
        { rotation: -3, duration: 2.7, ease: 'sine.inOut', repeat: -1, yoyo: true }
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
    // Sembunyikan stateDua dan kunci scroll
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

    const tl = gsap.timeline({
      onComplete: () => {
        window.dispatchEvent(new Event('resize'));
      }
    });

    // 1. Shake amplop tertutup
    tl.to(this.envelope, {
      x: '+=8',
      duration: 0.05,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut'
    });

    // 2. Cover (stateSatu) fade out + scale down
    tl.to(this.cover, {
      autoAlpha: 0,
      scale: 0.9,
      duration: 0.5,
      ease: 'power2.in'
    }, '+=0.1');

    // 3. Switch ke invitation (stateDua)
    tl.set(this.cover,      { display: 'none' });
    tl.set(this.invitation, { display: 'block' });
    tl.to(this.invitation, {
      autoAlpha: 1,
      duration: 0.4
    });

    // 4. Amplop terbuka muncul di tengah dengan efek pop
    if (this.amplopWrapper) {
      tl.from(this.amplopWrapper, {
        scale: 0.6,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(1.4)'
      }, '<');
    }

    // 5. Unlock scroll
    tl.call(() => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }, null, '+=0.4');

    // 6. Animate scroll ke bawah → semua isi hero naik bareng
    const scrollObj = { y: 0 };
    tl.to(scrollObj, {
      y: window.innerHeight,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: () => window.scrollTo(0, scrollObj.y)
    });
  }
}


// ============================================
//  SCRATCH COIN
//  Real-scratch interactive (touch + mouse)
// ============================================
class ScratchCoin {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.isDrawing = false;
    this.hasScratched = false;
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
    const end   = () => { this.isDrawing = false; };

    this.canvas.addEventListener('mousedown',  start);
    this.canvas.addEventListener('mousemove',  move);
    this.canvas.addEventListener('mouseup',    end);
    this.canvas.addEventListener('mouseleave', end);
    this.canvas.addEventListener('touchstart', start, { passive: true });
    this.canvas.addEventListener('touchmove',  move,  { passive: false });
    this.canvas.addEventListener('touchend',   end);
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
//  INIT — jalankan setelah DOM ready
// ============================================
function init() {
  // Intro pop-in animation untuk stateSatu
  new IntroAnimation();

  // Page transition (cover → invitation)
  new PageTransition();

  // Scratch coins (semua element dengan [data-coin])
  document.querySelectorAll('[data-coin]').forEach(el => new ScratchCoin(el));

  // Live countdown menuju 6 September 2026
  new Countdown(CONFIG.WEDDING_DATE);
}

// Run init setelah DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}