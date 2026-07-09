/**
 * main.js — Animasi header dekorasi (pop-in → sway loop) + scroll fade-up
 */

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  const lampuKiri  = document.getElementById('lampuKiri');
  const lampuKanan = document.getElementById('lampuKanan');
  const daunKiri   = document.getElementById('daunKiri');
  const daunKanan  = document.getElementById('daunKanan');
  const daunAtas   = document.getElementById('daunAtas');
  const bungaKiri  = document.getElementById('bungaKiri');
  const bungaKanan = document.getElementById('bungaKanan');
  const mainCircle = document.getElementById('mainCircle');

  // ── Sembunyikan semua sebelum pop-in ──
  gsap.set([lampuKiri, lampuKanan], { autoAlpha: 0, y: -24 });
  gsap.set([daunKiri],              { autoAlpha: 0, x: -20 });
  gsap.set([daunKanan],             { autoAlpha: 0, x:  20 });
  gsap.set([daunAtas],              { autoAlpha: 0, y: -18 });
  gsap.set([bungaKiri, bungaKanan], { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 100%' });
  gsap.set([mainCircle],            { autoAlpha: 0, scale: 0.5, transformOrigin: '50% 50%' });

  // ── Timeline pop-in (urutan: daunAtas → lampu → daun sisi → bunga → mainCircle) ──
  const tl = gsap.timeline({
    defaults: { ease: 'back.out(1.7)', duration: 0.55 },
    onComplete: startSway,
  });

  tl.to(daunAtas,              { autoAlpha: 1, y: 0 })
    .to([lampuKiri, lampuKanan], { autoAlpha: 1, y: 0 },              '+=0.05')
    .to([daunKiri, daunKanan],   { autoAlpha: 1, x: 0 },              '+=0.05')
    .to([bungaKiri, bungaKanan], { autoAlpha: 1, scale: 1, stagger: 0.12 }, '+=0.05')
    .to(mainCircle,              { autoAlpha: 1, scale: 1, duration: 0.65, ease: 'back.out(2)' }, '+=0.08');

  // ── Sway loop dimulai setelah pop-in selesai ──
  function startSway() {
    // Helper: set pivot lalu jalankan oscillasi rotasi tanpa henti
    const sway = (wrapper, fromRot, toRot, duration, origin) => {
      if (!wrapper) return;
      const img = wrapper.querySelector('img') ?? wrapper;
      gsap.set(img, { transformOrigin: origin });
      gsap.fromTo(img,
        { rotation: fromRot },
        { rotation: toRot, duration, ease: 'sine.inOut', repeat: -1, yoyo: true }
      );
    };

    // daunAtas: pivot atas-tengah, goyang kiri-kanan pelan
    sway(daunAtas,   -2,  2,  4.2, '50% 0%');

    // daunKiri: pivot sudut kanan-atas (titik lekat ke gerbang)
    sway(daunKiri,   -4,  3,  3.6, '100% 0%');

    // daunKanan: pivot sudut kiri-atas
    sway(daunKanan,   3, -4,  4.0, '0% 0%');

    // lampuKiri & kanan: pendulum dari titik gantung atas
    sway(lampuKiri,  -5,  5,  2.6, '50% 0%');
    sway(lampuKanan,  5, -5,  2.9, '50% 0%');

    // bungaKiri & kanan: goyang dari pangkal bawah (batang)
    sway(bungaKiri,  -3,  3,  2.4, '50% 100%');
    sway(bungaKanan,  3, -3,  2.7, '50% 100%');
  }


  // ============================================================
  //  SCROLL FADE-UP
  // ============================================================

  // Shorthand: fade up satu elemen saat masuk viewport
  const fadeUp = (el, delay = 0) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 40,
      duration: 0.7,
      ease: 'power2.out',
      delay,
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
      },
    });
  };

  // Shorthand: stagger sekumpulan elemen dari bawah
  const fadeUpStagger = (els, triggerEl, staggerDelay = 0.15) => {
    gsap.from(els, {
      autoAlpha: 0,
      y: 35,
      duration: 0.65,
      ease: 'power2.out',
      stagger: staggerDelay,
      scrollTrigger: {
        trigger: triggerEl ?? els[0],
        start: 'top 88%',
      },
    });
  };

  // ── Section 1: Mempelai ──
  const sectionMempelai = document.querySelector('#pageMain > section:nth-of-type(1)');
  if (sectionMempelai) {
    const rows = sectionMempelai.querySelectorAll(':scope > div');
    fadeUpStagger([...rows], sectionMempelai, 0.18);
  }

  // ── Section 2: Tanggal & Jadwal ──
  const sectionTanggal = document.querySelector('#pageMain > section:nth-of-type(2)');
  if (sectionTanggal) fadeUp(sectionTanggal);

  // ── Section 3: Location ──
  const sectionLocation = document.querySelector('#pageMain > section:nth-of-type(3)');
  if (sectionLocation) {
    const groups = sectionLocation.querySelectorAll(':scope > div');
    fadeUpStagger([...groups], sectionLocation, 0.2);
  }

  // ── Section 4: Our Story ──
  const sectionStory = document.querySelector('#pageMain > section:nth-of-type(4)');
  if (sectionStory) {
    // Heading dulu
    const heading = sectionStory.querySelector('.flex.justify-center');
    if (heading) fadeUp(heading);

    // Setiap item timeline muncul sendiri-sendiri saat di-scroll
    sectionStory.querySelectorAll('[data-story-item]').forEach(item => fadeUp(item));
  }

  // ── Section 5: Penutup (bg + ayat) ──
  // Elemen dekat bawah halaman → stagger children pakai 'top bottom'
  const sectionPenutup = document.querySelector('#pageMain > section:nth-of-type(5)');
  if (sectionPenutup) {
    const [bgImg, bungaImg] = sectionPenutup.querySelectorAll('img');
    const textOverlay = sectionPenutup.querySelector('.flex.flex-col');

    gsap.from([bgImg, bungaImg, textOverlay].filter(Boolean), {
      autoAlpha: 0,
      y: 35,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.15,
      scrollTrigger: {
        trigger: sectionPenutup,
        start: 'top bottom',
      },
    });
  }
});
