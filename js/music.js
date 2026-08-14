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

  // ── DEBUG SEMENTARA — HAPUS SETELAH SELESAI DIAGNOSIS ──
  // Aktifkan sekali lewat URL ?musicdebug=1 (atau &musicdebug=1) — begitu
  // aktif, nempel terus (via sessionStorage) sepanjang sesi tab ini, ikut
  // kebawa walau pindah ke main.html (yang href-nya di-generate ulang oleh
  // index.js tanpa query string ini). Nampilin kotak log kecil transparan
  // di atas layar biar kelihatan langsung di HP tanpa Safari Web Inspector.
  if (/[?&]musicdebug=1\b/.test(location.search)) sessionStorage.setItem('musicdebug', '1');
  const DEBUG = sessionStorage.getItem('musicdebug') === '1';
  let debugBox = null;
  const debugLog = (label) => {
    if (!DEBUG) return;
    const line = `[${new Date().toISOString().slice(11, 23)}] ${label} | rs=${bgMusic.readyState} t=${bgMusic.currentTime.toFixed(2)} dur=${(bgMusic.duration || 0).toFixed(1)} paused=${bgMusic.paused}\n`;
    if (!debugBox) {
      debugBox = document.createElement('div');
      Object.assign(debugBox.style, {
        position: 'fixed', top: '0', left: '0', right: '0', zIndex: '999999',
        background: 'rgba(0,0,0,0.88)', color: '#5f5', fontSize: '9px',
        fontFamily: 'monospace', padding: '4px', maxHeight: '42vh',
        overflowY: 'auto', whiteSpace: 'pre-wrap', pointerEvents: 'none',
      });
      const attach = () => document.body.appendChild(debugBox);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
      else attach();
    }
    debugBox.textContent += line;
    debugBox.scrollTop = debugBox.scrollHeight;
  };
  debugLog('script-start');

  // Angka detik BERJALAN REAL-TIME (bukan snapshot log) — biar bisa dicocokkan
  // LANGSUNG sambil dengar: "layar bilang 0:41, tapi yang kedengaran kok kayak
  // awal lagu?" — kalau memang beda, itu bukti currentTime JS vs audio yang
  // benar-benar kedengaran di hardware iPhone tidak sinkron.
  let liveClock = null;
  if (DEBUG) {
    liveClock = document.createElement('div');
    Object.assign(liveClock.style, {
      position: 'fixed', top: '0', right: '0', zIndex: '999999',
      background: '#c00', color: '#fff', fontSize: '13px', fontWeight: 'bold',
      fontFamily: 'monospace', padding: '3px 8px', pointerEvents: 'none',
    });
    liveClock.textContent = '--:--';
    const attachClock = () => document.body.appendChild(liveClock);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachClock);
    else attachClock();
    const fmt = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    setInterval(() => {
      if (!liveClock) return;
      liveClock.textContent = (bgMusic.paused ? '⏸ ' : '▶ ') + fmt(bgMusic.currentTime);
    }, 200);
    bgMusic.addEventListener('seeking', () => debugLog('event: seeking -> ' + bgMusic.currentTime.toFixed(2)));
    bgMusic.addEventListener('seeked', () => debugLog('event: seeked -> ' + bgMusic.currentTime.toFixed(2)));
  }

  const saveMusicState = () => {
    sessionStorage.setItem('musicTime', String(bgMusic.currentTime || 0));
    sessionStorage.setItem('musicPlaying', String(!bgMusic.paused));
    debugLog('saveMusicState saved=' + bgMusic.currentTime.toFixed(2));
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
  debugLog(`init hasOpenBtn=${hasOpenBtn} savedPlayingRaw=${savedPlayingRaw} savedTime=${savedTime} wasPlaying=${wasPlaying}`);

  // PENTING (revisi ke-2): sebelumnya kita seek DULU baru play(). Ternyata di
  // iPhone urutan itu yang bikin "ngulang" — kebuktian dari log: currentTime
  // ke-set ke angka yang benar TAPI freeze di situ (event 'timeupdate' tidak
  // jalan), sementara suara yang kedengaran mulai dari awal file. Ini karena
  // saat di-seek, elemen masih "dingin" (baru readyState HAVE_METADATA, belum
  // ada data ke-buffer di posisi yang dituju) — iOS diam-diam main dari data
  // yang sudah ke-buffer (awal file) alih-alih benar-benar pindah ke situ.
  // Fix: play() DULU (elemen jadi aktif & mulai buffering nyata), BARU seek
  // setelah play() resolve — browser jauh lebih taat pindah posisi saat
  // elemen sedang aktif memutar dibanding saat masih diam/dingin.
  const applyTime = () => {
    if (timeApplied) return;
    if (bgMusic.readyState < 1) {
      debugLog('applyTime DEFER (readyState<1)');
      bgMusic.addEventListener('loadedmetadata', applyTime, { once: true });
      return;
    }
    timeApplied = true;
    if (savedTime > 0 && savedTime < (bgMusic.duration || Infinity)) {
      bgMusic.currentTime = savedTime;
      debugLog('applyTime SEEK -> ' + savedTime);
    } else {
      debugLog('applyTime NOOP (savedTime out of range)');
    }
  };

  // Coba lanjut otomatis. Kalau ditolak (khas Safari/iOS setelah pindah
  // halaman), tunggu interaksi pertama tamu di beberapa jenis event
  // sekaligus lalu coba lagi — sekali berhasil, semua listener dilepas.
  const tryResume = () => {
    debugLog('tryResume enter');
    if (!wasPlaying || !bgMusic.paused) { debugLog('tryResume SKIP'); return; }
    debugLog('tryResume calling play() (seek nanti setelah resolve)');
    bgMusic.play().then(() => {
      debugLog('tryResume play() RESOLVED, seeking now');
      applyTime();
    }).catch((err) => {
      debugLog('tryResume play() REJECTED: ' + (err && err.name));
      const events = ['pointerdown', 'touchend', 'click', 'keydown'];
      const resume = () => {
        events.forEach(evt => document.removeEventListener(evt, resume, true));
        debugLog('fallback resume() fired, calling play()');
        bgMusic.play().then(() => {
          debugLog('fallback play() RESOLVED, seeking now t=' + bgMusic.currentTime.toFixed(2));
          applyTime();
        }).catch((e2) => debugLog('fallback play() REJECTED: ' + (e2 && e2.name)));
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
      debugLog(`click #${id} paused=${bgMusic.paused}`);
      if (bgMusic.paused) bgMusic.play().then(() => {
        debugLog(`click #${id} play() RESOLVED t=` + bgMusic.currentTime.toFixed(2));
      }).catch((e) => debugLog(`click #${id} play() REJECTED: ` + (e && e.name)));
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
      // Sama seperti tryResume(): play() dulu, seek belakangan setelah aktif
      // memutar — supaya tidak kena bug "freeze di posisi lama, suara dari 0".
      bgMusic.play().then(() => applyTime()).catch(() => {});
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
