// ── Lightbox ──────────────────────────────────────────────────
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev  = document.getElementById('lightbox-prev');
const lightboxNext  = document.getElementById('lightbox-next');

const albumSrcs = [...document.querySelectorAll('.album-foto')].map(el => el.dataset.src);
let lightboxIndex = 0;

function isLightboxOpen() {
  return !lightbox.classList.contains('hidden');
}

function showPhoto(index) {
  lightboxIndex = (index + albumSrcs.length) % albumSrcs.length;
  lightboxImg.src = albumSrcs[lightboxIndex];
}

function openLightbox(index) {
  showPhoto(index);
  lightbox.classList.remove('hidden');
  lightbox.classList.add('flex');
  document.documentElement.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('flex');
  lightbox.classList.add('hidden');
  document.documentElement.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 250);
}

document.querySelectorAll('.album-foto').forEach((el, i) => {
  el.addEventListener('click', () => openLightbox(i));
});

document.getElementById('lightbox-backdrop').addEventListener('click', closeLightbox);
lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => showPhoto(lightboxIndex - 1));
lightboxNext.addEventListener('click', () => showPhoto(lightboxIndex + 1));

document.addEventListener('keydown', e => {
  if (!isLightboxOpen()) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  showPhoto(lightboxIndex - 1);
  if (e.key === 'ArrowRight') showPhoto(lightboxIndex + 1);
});

// Swipe kiri/kanan di HP untuk ganti foto
let touchStartX = 0;
lightbox.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });
lightbox.addEventListener('touchend', e => {
  const deltaX = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) < 40) return;
  showPhoto(deltaX < 0 ? lightboxIndex + 1 : lightboxIndex - 1);
}, { passive: true });

// ──────────────────────────────────────────────────────────────

function copyRekening(btn, number) {
  navigator.clipboard.writeText(number).then(() => {
    const label = btn.querySelector('span') ?? btn;
    const original = label.textContent;
    label.textContent = 'Copied!';
    btn.disabled = true;
    setTimeout(() => {
      label.textContent = original;
      btn.disabled = false;
    }, 1500);
  });
}

const SUPABASE_URL = 'https://bcdukrmyktdvsorpzhfu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjZHVrcm15a3RkdnNvcnB6aGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTE3OTUsImV4cCI6MjA5MDk2Nzc5NX0.65_gtSQ1bfUsR1K5lCSHoFmJ1Z9Ko9HmkE7unTDx2T4'

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)


// ============================================================
//  RSVP FORM + REALTIME WISHES WALL
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const nameInput       = document.getElementById('rsvpName');
  const messageInput    = document.getElementById('rsvpMessage');
  const attendingCb     = document.getElementById('attending');
  const notAttendingCb  = document.getElementById('not-attending');
  const submitBtn       = document.getElementById('rsvpSubmitBtn');
  const statusEl        = document.getElementById('rsvpStatus');
  const wishesList       = document.getElementById('wishesList');
  const wishesEmpty      = document.getElementById('wishesEmpty');

  if (!submitBtn || !wishesList) return;

  // ── Pilihan jumlah tamu (pill 1-4), tampil hanya saat Attending ──
  const guestCountWrap = document.getElementById('guestCountWrap');
  const guestCountBtns = [...document.querySelectorAll('.guest-count-btn')];
  let guestCount = null;

  const resetGuestCount = () => {
    guestCount = null;
    guestCountBtns.forEach(b => b.classList.remove('bg-[#5a5a2a]', 'text-white'));
  };

  const updateGuestCountVisibility = () => {
    const show = attendingCb?.checked;
    guestCountWrap?.classList.toggle('hidden', !show);
    if (!show) resetGuestCount();
  };

  guestCountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      resetGuestCount();
      guestCount = Number(btn.dataset.count);
      btn.classList.add('bg-[#5a5a2a]', 'text-white');
    });
  });

  // Attending / Not Attending act like a radio pair
  attendingCb?.addEventListener('change', () => {
    if (attendingCb.checked) notAttendingCb.checked = false;
    updateGuestCountVisibility();
  });
  notAttendingCb?.addEventListener('change', () => {
    if (notAttendingCb.checked) attendingCb.checked = false;
    updateGuestCountVisibility();
  });

  const setStatus = (text, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('text-red-600', isError);
    statusEl.classList.toggle('text-[#5a5a2a]', !isError);
  };

  const buildWishCard = ({ nama, pesan, keterangan, jumlah_tamu }) => {
    const card = document.createElement('div');
    card.className = 'flex gap-3 bg-[#f0ede8] rounded-xl px-4 py-3 border-l-4 border-[#c9a84c]';

    const avatar = document.createElement('div');
    avatar.className = 'shrink-0 w-8 h-8 rounded-full bg-[#808b45] text-white flex items-center justify-center font-glacial text-xs uppercase';
    avatar.textContent = (nama || 'T').trim().charAt(0) || 'T';

    const textWrap = document.createElement('div');
    textWrap.className = 'min-w-0';

    const nameRow = document.createElement('div');
    nameRow.className = 'flex items-center gap-2 flex-wrap';

    const nameEl = document.createElement('p');
    nameEl.className = 'font-anaktoria text-sm text-[#585f26]';
    nameEl.textContent = nama || 'Tamu';
    nameRow.append(nameEl);

    if (keterangan) {
      const badge = document.createElement('span');
      const hadir = keterangan === 'Hadir';
      badge.className = 'font-glacial text-[9px] tracking-wide px-2 py-0.5 rounded-full ' +
        (hadir ? 'bg-[#dfe3c0] text-[#585f26]' : 'bg-[#e8ddd8] text-[#9c6b5e]');
      badge.textContent = (hadir && jumlah_tamu) ? `${keterangan} · ${jumlah_tamu} orang` : keterangan;
      nameRow.append(badge);
    }

    const msgEl = document.createElement('p');
    msgEl.className = 'font-glacial text-xs text-[#7a7d35] mt-1 break-words';
    msgEl.textContent = pesan || '';

    textWrap.append(nameRow, msgEl);
    card.append(avatar, textWrap);
    return card;
  };

  // ── Load existing wishes — semua dirender, list-nya scroll internal ──
  db.from('rsvp')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
    .then(({ data, error }) => {
      if (error || !data || !data.length) return;
      wishesEmpty?.classList.add('hidden');
      data.forEach(row => wishesList.appendChild(buildWishCard(row)));
      // Tinggi list berubah (sampai mentok max-height) — sinkronkan scroll trigger
      window.ScrollTrigger?.refresh();
    });

  // ── Realtime: new wishes appear live for every visitor, including the sender ──
  db.channel('rsvp-wall')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rsvp' }, (payload) => {
      wishesEmpty?.classList.add('hidden');
      wishesList.prepend(buildWishCard(payload.new));
      window.ScrollTrigger?.refresh();
    })
    .subscribe();

  // ── Submit handler ──
  submitBtn.addEventListener('click', async () => {
    const nama  = nameInput?.value.trim();
    const pesan = messageInput?.value.trim();

    if (!nama || !pesan) {
      setStatus('Nama dan pesan wajib diisi.', true);
      return;
    }
    if (!attendingCb?.checked && !notAttendingCb?.checked) {
      setStatus('Pilih salah satu: Attending atau Not Attending.', true);
      return;
    }
    if (attendingCb.checked && !guestCount) {
      setStatus('Pilih jumlah tamu yang akan hadir.', true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const { error } = await db.from('rsvp').insert({
      nama,
      pesan,
      keterangan: attendingCb.checked ? 'Hadir' : 'Tidak Hadir',
      jumlah_tamu: attendingCb.checked ? guestCount : null,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Message';

    if (error) {
      setStatus('Gagal mengirim, coba lagi.', true);
      return;
    }

    setStatus('Terima kasih atas ucapannya!');
    nameInput.value = '';
    messageInput.value = '';
    attendingCb.checked = false;
    notAttendingCb.checked = false;
    updateGuestCountVisibility();
  });
});


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
  const secAlbum = document.querySelector('#detailSection > section:nth-of-type(1)');
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
  const secForm = document.querySelector('#detailSection > section:nth-of-type(2)');
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


  // ── Section 3: Wishes Wall ─────────────────────────────────
  // Hanya heading yang di-fade; kartu ucapan dibiarkan langsung muncul
  // (dimuat & realtime) supaya tidak ikut ganggu re-trigger scroll.
  const secWishes = document.querySelector('#detailSection > section:nth-of-type(3)');
  if (secWishes) {
    const heading = secWishes.querySelector('.text-center');
    fadeUpStagger([heading], secWishes);
  }


  // ── Section 4: Kado & Rekening ────────────────────────────
  const secKado = document.querySelector('#detailSection > section:nth-of-type(4)');
  if (secKado) {
    const kadoImg   = secKado.querySelector('.w-\\[45\\%\\]');
    const vivaldi   = secKado.querySelector('.font-vivaldi');
    const blobs     = [...secKado.querySelectorAll('.relative.w-full.flex')];
    const wpText    = secKado.querySelector('p.font-glacial');
    const wpBtn     = secKado.querySelector('a[href*="wa.me"]');
    fadeUpStagger([kadoImg, vivaldi, ...blobs, wpText, wpBtn], secKado, { stagger: 0.15 });
  }


  // ── Section 5: Closing (dekat dasar → pakai 'top bottom') ─
  const secClosing = document.querySelector('#detailSection > section:nth-of-type(5)');
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
