// ============================================================
//  BACKSOUND — nyambung antar halaman via sessionStorage
//  Posisi detik lagu disimpan sebelum pindah halaman,
//  lalu dilanjutkan (bukan diulang) di halaman berikutnya.
//
//  Catatan Safari/iOS: browser ini sering menolak play() yang
//  dipanggil otomatis oleh script (tanpa gesture tamu di halaman
//  itu sendiri) — jadi lagu "ga muncul"/"ga lanjut" setelah pindah
//  halaman. Untuk itu:
//   1. Retry play() didengarkan di beberapa jenis event sekaligus
//      (pointerdown/touchend/click/keydown), bukan cuma satu.
//   2. Disediakan tombol toggle manual sebagai fallback kalau
//      autoplay tetap diblokir.
// ============================================================
(() => {
  const bgMusic = document.getElementById('bgMusic');
  if (!bgMusic) return;

  const saveMusicState = () => {
    sessionStorage.setItem('musicTime', String(bgMusic.currentTime || 0));
    sessionStorage.setItem('musicPlaying', String(!bgMusic.paused));
  };

  // Simpan posisi saat halaman ditinggalkan / disembunyikan
  window.addEventListener('pagehide', saveMusicState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveMusicState();
  });

  // ── Lanjutkan dari posisi tersimpan (kalau sebelumnya sedang main) ──
  // Halaman dengan #openInvitationBtn (index.html) memang sengaja baru
  // mulai musik saat tombol itu diklik — jadi kalau belum ada riwayat sama
  // sekali, jangan dipaksa autoplay di situ.
  // Halaman TANPA tombol itu (mis. main.html dibuka langsung dari link WA,
  // atau di-refresh) tidak punya gesture khusus buat mulai musik — kalau
  // dibiarkan default "belum pernah main", musik jadi diam selamanya
  // sampai tamu ngeh harus tap ikon toggle-nya sendiri (sering kejadian di
  // iPhone). Makanya di halaman begini kita anggap "harusnya main" sejak
  // awal, supaya percobaan autoplay + fallback-nya langsung aktif dan
  // musik kepancing oleh interaksi APAPUN yang tamu lakukan duluan.
  const hasOpenBtn      = !!document.getElementById('openInvitationBtn');
  const savedPlayingRaw = sessionStorage.getItem('musicPlaying');
  const savedTime       = parseFloat(sessionStorage.getItem('musicTime') || '0');
  const wasPlaying      = savedPlayingRaw !== null ? savedPlayingRaw === 'true' : !hasOpenBtn;
  let timeApplied = false;

  // PENTING: kalau readyState masih 0 (metadata lagu belum kebaca), nge-set
  // currentTime SEKARANG tidak reliable — begitu metadata datang belakangan,
  // browser bisa reset balik currentTime ke 0 (terverifikasi: ini yang bikin
  // lagu "ngulang" alih-alih lanjut). Kalau ketemu kondisi itu, tunda diri
  // sendiri sampai event 'loadedmetadata', baru coba lagi.
  const applyTime = () => {
    if (timeApplied) return;
    if (bgMusic.readyState < 1) {
      bgMusic.addEventListener('loadedmetadata', applyTime, { once: true });
      return;
    }
    timeApplied = true;
    if (savedTime > 0 && savedTime < (bgMusic.duration || Infinity)) {
      bgMusic.currentTime = savedTime;
    }
  };

  // Coba lanjut otomatis. Kalau ditolak (khas Safari/iOS setelah pindah
  // halaman), tunggu interaksi pertama tamu di beberapa jenis event
  // sekaligus lalu coba lagi — sekali berhasil, semua listener dilepas.
  const tryResume = () => {
    if (!wasPlaying || !bgMusic.paused) return;
    // Sama seperti applyTime(): kalau metadata belum siap, tunda dulu diri
    // sendiri sampai 'loadedmetadata' — supaya applyTime() di bawah beneran
    // nempel SEBELUM play() dicoba, bukan cuma dipanggil duluan tapi hasilnya
    // ke-reset lagi begitu metadata datang.
    if (bgMusic.readyState < 1) {
      bgMusic.addEventListener('loadedmetadata', tryResume, { once: true });
      return;
    }
    applyTime();
    bgMusic.play().catch(() => {
      const events = ['pointerdown', 'touchend', 'click', 'keydown'];
      const resume = () => {
        events.forEach(evt => document.removeEventListener(evt, resume, true));
        applyTime();
        bgMusic.play().catch(() => {});
      };
      events.forEach(evt => document.addEventListener(evt, resume, { capture: true }));
    });
  };
  tryResume();

  // Tombol/area dengan user gesture asli: gambar amplop (#envelope — area tap
  // yang sebenarnya, jauh lebih besar dari #openInvitationBtn yang cuma teks
  // kecil "Open Invitation" di dalamnya), #openInvitationBtn itu sendiri, dan
  // "Buka Undangan" (yang memicu pindah ke main.html). Ketiganya dipastikan
  // panggil play() di dalam klik asli — klik = lolos kebijakan autoplay
  // browser selama masih di dokumen yang sama.
  ['envelope', 'openInvitationBtn', 'bukaUndanganBtn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (bgMusic.paused) bgMusic.play().catch(() => {});
    });
  });

  // ── Tombol toggle musik (fallback manual) ──
  // Selalu tampil mengambang di pojok layar. Kalau autoplay diblokir
  // browser (Safari sering begitu), tamu tetap punya cara memutar musik.
  const btn = document.createElement('button');
  btn.id = 'musicToggleBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Putar atau jeda musik');
  btn.innerHTML = `<img src="assets/img/simbol%20monogram%20M&R.webp" alt="" draggable="false">`;
  Object.assign(btn.style, {
    position: 'fixed',
    left: '16px',
    bottom: '16px',
    zIndex: '9998',
    width: '44px',
    height: '44px',
    padding: '0',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    transition: 'opacity 0.2s ease',
  });
  Object.assign(btn.querySelector('img').style, {
    width: '70%',
    height: '70%',
    objectFit: 'contain',
    pointerEvents: 'none',
  });

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    #musicToggleBtn.is-playing img { animation: musicSpin 3.5s linear infinite; }
    @keyframes musicSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(styleTag);

  const renderBtn = () => {
    const playing = !bgMusic.paused;
    btn.style.opacity = playing ? '1' : '0.55';
    btn.classList.toggle('is-playing', playing);
  };

  btn.addEventListener('click', () => {
    if (bgMusic.paused) {
      applyTime();
      bgMusic.play().catch(() => {});
    } else {
      bgMusic.pause();
    }
  });

  bgMusic.addEventListener('play', renderBtn);
  bgMusic.addEventListener('pause', renderBtn);

  const mount = () => { document.body.appendChild(btn); renderBtn(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
