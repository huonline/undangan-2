// Ambil elemen tombol dan elemen target (section ayat)
const btnOpen = document.querySelector('.btn-open-invitation');
const sectionAyat = document.getElementById('ayat');
const coverContainer = document.querySelector('.cover-container');

// Fungsi ketika tombol diklik
btnOpen.addEventListener('click', function() {
    // 1. Gulir layar secara halus (smooth scroll) ke section id="ayat"
    sectionAyat.scrollIntoView({ behavior: 'smooth' });
    
    // 2. Mengaktifkan kembali scroll pada halaman web
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
});
