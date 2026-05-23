const SUPABASE_URL = 'https://bcdukrmyktdvsorpzhfu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjZHVrcm15a3RkdnNvcnB6aGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTE3OTUsImV4cCI6MjA5MDk2Nzc5NX0.65_gtSQ1bfUsR1K5lCSHoFmJ1Z9Ko9HmkE7unTDx2T4'

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)


// ============================================================
//  SCROLL ANIMATIONS
// ============================================================
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {

  // Shorthand stagger sekumpulan elemen
  const fadeUpStagger = (els, trigger, { stagger = 0.13, start = 'top 88%' } = {}) => {
    const targets = [...els].filter(Boolean);
    if (!targets.length) return;
    gsap.from(targets, {
      autoAlpha: 0, y: 36,
      duration: 0.65, ease: 'power2.out', stagger,
      scrollTrigger: { trigger: trigger ?? targets[0], start },
    });
  };


  // ── Section 1: Album ─────────────────────────────────────
  const secAlbum = document.querySelector('main > section:nth-of-type(1)');
  if (secAlbum) {
    // Teks dekoratif "Album / Of / Us" — masing-masing fade dari sisi
    const [txtAlbum, txtOf, txtUs] = secAlbum.querySelectorAll('span.font-blosta');
    if (txtAlbum) gsap.from(txtAlbum, {
      autoAlpha: 0, x: -30, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: secAlbum, start: 'top 88%' },
    });
    if (txtOf) gsap.from(txtOf, {
      autoAlpha: 0, x: 30, duration: 0.7, ease: 'power2.out', delay: 0.15,
      scrollTrigger: { trigger: secAlbum, start: 'top 88%' },
    });
    if (txtUs) gsap.from(txtUs, {
      autoAlpha: 0, x: -30, duration: 0.7, ease: 'power2.out', delay: 0.28,
      scrollTrigger: { trigger: secAlbum, start: 'top 88%' },
    });

    // Kotak-kotak foto grid
    const gridItems = secAlbum.querySelectorAll('.grid > div');
    fadeUpStagger(gridItems, secAlbum, { stagger: 0.07 });
  }


  // ── Section 2: Reservation (form) ────────────────────────
  const secForm = document.querySelector('main > section:nth-of-type(2)');
  if (secForm) {
    // Header div (h1 + p subtitle) sebagai satu blok
    const headerDiv = secForm.querySelector('.px-6.py-5');

    // Field-field form
    const formEls = [
      secForm.querySelector('input[type="text"]')?.closest('.mb-4'),
      secForm.querySelector('textarea')?.closest('.mb-4'),
      secForm.querySelector('#attending')?.closest('.rounded-lg'),
      secForm.querySelector('#not-attending')?.closest('.rounded-lg'),
      secForm.querySelector('button'),
    ];

    // Semua elemen section ini stagger dari atas ke bawah
    // start 'top 75%' agar animasi baru muncul saat user benar-benar scroll ke sini
    fadeUpStagger(
      [headerDiv, ...formEls],
      secForm,
      { stagger: 0.13, start: 'top 75%' }
    );
  }


  // ── Section 3: Kado & Rekening ────────────────────────────
  const secKado = document.querySelector('main > section:nth-of-type(3)');
  if (secKado) {
    const kadoImg   = secKado.querySelector('.w-\\[45\\%\\]');
    const vivaldi   = secKado.querySelector('.font-vivaldi');
    const blob      = secKado.querySelector('.relative.w-full.flex');
    const wpText    = secKado.querySelector('p.font-glacial');
    const wpBtn     = secKado.querySelector('button');
    fadeUpStagger([kadoImg, vivaldi, blob, wpText, wpBtn], secKado, { stagger: 0.15 });
  }


  // ── Section 4: Closing (dekat dasar → pakai 'top bottom') ─
  const secClosing = document.querySelector('main > section:nth-of-type(4)');
  if (secClosing) {
    const bungaBesar  = secClosing.querySelector('img');
    const textContent = secClosing.querySelector('.flex.flex-col.items-end');
    const hashtag     = secClosing.querySelector('p.font-anaktoria');

    // Bunga masuk dari kiri
    if (bungaBesar) gsap.from(bungaBesar, {
      autoAlpha: 0, x: -50,
      duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: secClosing, start: 'top bottom' },
    });

    // Teks tanggal masuk dari kanan
    if (textContent) gsap.from(textContent, {
      autoAlpha: 0, x: 40,
      duration: 0.8, ease: 'power2.out', delay: 0.2,
      scrollTrigger: { trigger: secClosing, start: 'top bottom' },
    });

    // Hashtag fade-up
    if (hashtag) gsap.from(hashtag, {
      autoAlpha: 0, y: 20,
      duration: 0.6, ease: 'power2.out', delay: 0.4,
      scrollTrigger: { trigger: secClosing, start: 'top bottom' },
    });
  }

});
