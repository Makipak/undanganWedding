// ============================================================
//  BACKSOUND — nyambung antar halaman via sessionStorage
//  Posisi detik lagu disimpan sebelum pindah halaman,
//  lalu dilanjutkan (bukan diulang) di halaman berikutnya.
// ============================================================
(() => {
  const bgMusic = document.getElementById('bgMusic');
  if (!bgMusic) return;

  const saveMusicState = () => {
    sessionStorage.setItem('musicTime', String(bgMusic.currentTime));
    sessionStorage.setItem('musicPlaying', String(!bgMusic.paused));
  };

  // Simpan posisi saat halaman ditinggalkan / disembunyikan
  window.addEventListener('pagehide', saveMusicState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveMusicState();
  });

  // Lanjutkan dari posisi tersimpan (kalau sebelumnya sedang main)
  const savedTime = parseFloat(sessionStorage.getItem('musicTime') || '0');
  const wasPlaying = sessionStorage.getItem('musicPlaying') === 'true';

  const applyTime = () => {
    if (savedTime > 0 && savedTime < (bgMusic.duration || Infinity)) {
      bgMusic.currentTime = savedTime;
    }
  };
  if (bgMusic.readyState >= 1) applyTime();
  else bgMusic.addEventListener('loadedmetadata', applyTime, { once: true });

  if (wasPlaying) {
    bgMusic.play().catch(() => {
      // Autoplay diblokir browser — lanjutkan pada interaksi pertama tamu
      const resume = () => bgMusic.play();
      document.addEventListener('pointerdown', resume, { once: true });
    });
  }

  // Halaman pembuka: musik mulai saat tamu menekan "Open Invitation"
  // (klik = user gesture, jadi lolos kebijakan autoplay browser)
  document.getElementById('openInvitationBtn')?.addEventListener('click', () => {
    if (bgMusic.paused) bgMusic.play();
  });
})();
