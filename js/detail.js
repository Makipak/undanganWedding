// ── Lightbox ──────────────────────────────────────────────────
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

function openLightbox(src) {
  lightboxImg.src = src;
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

document.querySelectorAll('.album-foto').forEach(el => {
  el.addEventListener('click', () => openLightbox(el.dataset.src));
});

document.getElementById('lightbox-backdrop').addEventListener('click', closeLightbox);
lightboxClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

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
  const loadMoreBtn      = document.getElementById('wishesLoadMoreBtn');

  if (!submitBtn || !wishesList) return;

  // Attending / Not Attending act like a radio pair
  attendingCb?.addEventListener('change', () => {
    if (attendingCb.checked) notAttendingCb.checked = false;
  });
  notAttendingCb?.addEventListener('change', () => {
    if (notAttendingCb.checked) attendingCb.checked = false;
  });

  const setStatus = (text, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('text-red-600', isError);
    statusEl.classList.toggle('text-[#5a5a2a]', !isError);
  };

  const buildWishCard = ({ nama, pesan }) => {
    const card = document.createElement('div');
    card.className = 'flex gap-3 bg-[#f0ede8] rounded-xl px-4 py-3 border-l-4 border-[#c9a84c]';

    const avatar = document.createElement('div');
    avatar.className = 'shrink-0 w-8 h-8 rounded-full bg-[#808b45] text-white flex items-center justify-center font-glacial text-xs uppercase';
    avatar.textContent = (nama || 'T').trim().charAt(0) || 'T';

    const textWrap = document.createElement('div');
    textWrap.className = 'min-w-0';

    const nameEl = document.createElement('p');
    nameEl.className = 'font-anaktoria text-sm text-[#585f26]';
    nameEl.textContent = nama || 'Tamu';

    const msgEl = document.createElement('p');
    msgEl.className = 'font-glacial text-xs text-[#7a7d35] mt-1 break-words';
    msgEl.textContent = pesan || '';

    textWrap.append(nameEl, msgEl);
    card.append(avatar, textWrap);
    return card;
  };

  // ── Load existing wishes, paginated so the page never forces an inner scroll ──
  const WISHES_PAGE_SIZE = 5;
  let pendingWishes = [];

  const renderNextWishesPage = () => {
    const batch = pendingWishes.splice(0, WISHES_PAGE_SIZE);
    batch.forEach(row => wishesList.appendChild(buildWishCard(row)));
    loadMoreBtn?.classList.toggle('hidden', pendingWishes.length === 0);
    // List height just changed — keep sections below in sync with their scroll triggers
    window.ScrollTrigger?.refresh();
  };

  loadMoreBtn?.addEventListener('click', renderNextWishesPage);

  db.from('rsvp')
    .select('nama, pesan, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
    .then(({ data, error }) => {
      if (error || !data || !data.length) return;
      wishesEmpty?.classList.add('hidden');
      pendingWishes = data;
      renderNextWishesPage();
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

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const { error } = await db.from('rsvp').insert({
      nama,
      pesan,
      keterangan: attendingCb.checked ? 'Hadir' : 'Tidak Hadir',
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
