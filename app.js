import { db } from './firebase-config.js';
// Tambahan import: query, where, getDocs untuk mengambil riwayat transaksi
import { doc, getDoc, setDoc, runTransaction, collection, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let activeUserUID = "";

// --- Elemen DOM UI ---
const inputKartuID = document.getElementById("inputKartuID");
const btnCekID = document.getElementById("btnCekID");
const userName = document.getElementById("userName"); // Untuk nampilin Nama & ID
const saldoDisplay = document.getElementById("saldoAmmount");
const historyList = document.getElementById("historyList"); // Elemen riwayat

const btnTarik = document.getElementById("btnTarik");
const modalTarik = document.getElementById("modalTarik");
const btnBatal = document.getElementById("btnBatal");
const btnKonfirmasiTarik = document.getElementById("btnKonfirmasiTarik");
const inputNominal = document.getElementById("inputNominal");

const btnSetor = document.getElementById("btnSetor");
const modalSetor = document.getElementById("modalSetor");
const btnBatalSetor = document.getElementById("btnBatalSetor");
const btnKonfirmasiSetor = document.getElementById("btnKonfirmasiSetor");
const inputNominalSetor = document.getElementById("inputNominalSetor");
const btnScanNFC = document.getElementById("btnScanNFC");

// --- Fitur Scan NFC ---
btnScanNFC.addEventListener("click", async () => {
    try {
        if ("NDEFReader" in window) {
            const ndef = new NDEFReader();
            await ndef.scan();
            alert("Sip! Sekarang tempelkan KTP/KTS ke belakang HP...");
            
            ndef.addEventListener("reading", ({ serialNumber }) => {
                const idKartu = serialNumber.replace(/:/g, "").toUpperCase();
                inputKartuID.value = idKartu;
                btnCekID.click(); 
                alert("Kartu Terbaca: " + idKartu);
            });
        } else {
            alert("Yah, Browser/HP ini tidak support fitur Web NFC. Coba pakai Google Chrome di Android.");
        }
    } catch (error) {
        alert("Gagal mengaktifkan NFC: " + error);
    }
});

// --- Event 1: Tombol Cari ID Ditekan ---
btnCekID.addEventListener("click", () => {
    const idInput = inputKartuID.value.trim();
    if (!idInput) {
        alert("Masukkan ID KTP / KTS terlebih dahulu!");
        return;
    }
    
    activeUserUID = idInput;
    fetchDataUser(activeUserUID);
});

// --- Fungsi 2: Ambil Data User, Saldo, dan Riwayat ---
async function fetchDataUser(uid) {
    try {
        saldoDisplay.innerText = "Memuat...";
        userName.innerHTML = `Mencari data...`;
        historyList.innerHTML = "<li>Memuat riwayat...</li>";

        // Referensi ke koleksi users dan wallets
        const userRef = doc(db, "users", uid);
        const walletRef = doc(db, "wallets", uid);
        
        // Ambil data user dan wallet berbarengan
        const [userSnap, walletSnap] = await Promise.all([getDoc(userRef), getDoc(walletRef)]);
        
        // 1. Tampilkan Nama User
        if (userSnap.exists()) {
            const dataUser = userSnap.data();
            userName.innerHTML = `Halo, <strong>${dataUser.nama}</strong><br><small>ID: ${uid}</small>`;
        } else {
            // Buat data user dummy jika belum ada
            await setDoc(userRef, {
                uid: uid,
                nama: "Santri Baru",
                role: "siswa"
            });
            userName.innerHTML = `Halo, <strong>Santri Baru</strong><br><small>ID: ${uid}</small>`;
        }

        // 2. Tampilkan Saldo
        if (walletSnap.exists()) {
            const dataWallet = walletSnap.data();
            saldoDisplay.innerText = `Rp ${dataWallet.saldo.toLocaleString('id-ID')}`;
        } else {
            await setDoc(walletRef, {
                uid: uid,
                saldo: 0,
                updatedAt: new Date()
            });
            saldoDisplay.innerText = "Rp 0";
        }

        // 3. Panggil Riwayat Transaksi
        fetchRiwayat(uid);

    } catch (error) {
        console.error("Error ambil data:", error);
        saldoDisplay.innerText = "Error";
        userName.innerHTML = "Gagal memuat data.";
    }
}

// --- Fungsi 3: Ambil Riwayat Transaksi ---
async function fetchRiwayat(uid) {
    try {
        // Query ambil data transaksi berdasarkan UID
        const q = query(collection(db, "transactions"), where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            historyList.innerHTML = "<li>Belum ada transaksi.</li>";
            return;
        }

        const riwayatArray = [];
        querySnapshot.forEach((doc) => {
            riwayatArray.push(doc.data());
        });

        // Urutkan riwayat dari yang terbaru ke terlama
        riwayatArray.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);

        historyList.innerHTML = ""; // Bersihkan teks "Memuat riwayat..."

        riwayatArray.forEach((data) => {
            const li = document.createElement("li");
            const isSetor = data.type === "setor_tunai";
            const jenis = isSetor ? "⬆️ Setor Tunai" : "⬇️ Tarik Tunai";
            const warnaText = isSetor ? "#27ae60" : "#e74c3c"; // Hijau untuk setor, Merah untuk tarik
            
            // Format waktu ke format lokal
            let tanggalStr = "Baru saja";
            if (data.timestamp) {
                const date = new Date(data.timestamp.seconds * 1000);
                tanggalStr = date.toLocaleDateString("id-ID") + " " + date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
            }

            li.innerHTML = `
                <div>
                    <strong style="color: ${warnaText};">${jenis}</strong><br>
                    <small style="color: #7f8c8d;">${tanggalStr}</small>
                </div>
                <strong>Rp ${data.amount.toLocaleString('id-ID')}</strong>
            `;
            
            li.style.borderLeft = `4px solid ${warnaText}`;
            historyList.appendChild(li);
        });

    } catch (error) {
        console.error("Error ambil riwayat:", error);
        historyList.innerHTML = "<li>Gagal memuat riwayat.</li>";
    }
}

// --- Fungsi 4: Tarik Tunai ---
async function prosesTarikTunai(nominal) {
    if (!activeUserUID) return alert("Pilih atau masukkan ID terlebih dahulu!");
    const walletRef = doc(db, "wallets", activeUserUID);
    
    try {
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists()) throw "Data akun tidak ditemukan!";
            const saldoSekarang = walletDoc.data().saldo;
            if (saldoSekarang < nominal) throw "Saldo tidak mencukupi!";

            transaction.update(walletRef, { saldo: saldoSekarang - nominal, updatedAt: serverTimestamp() });
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
                uid: activeUserUID,
                type: "tarik_tunai",
                amount: nominal,
                timestamp: serverTimestamp(),
                status: "berhasil"
            });
        });

        alert("Tarik tunai berhasil!");
        modalTarik.classList.add("hidden");
        inputNominal.value = "";
        fetchDataUser(activeUserUID); // Langsung refresh UI saldo & riwayat
    } catch (error) {
        alert("Gagal: " + error);
    }
}

// --- Fungsi 5: Setor Tunai ---
async function prosesSetorTunai(nominal) {
    if (!activeUserUID) return alert("Pilih atau masukkan ID terlebih dahulu!");
    const walletRef = doc(db, "wallets", activeUserUID);
    
    try {
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists()) throw "Data akun tidak ditemukan!";
            
            transaction.update(walletRef, { saldo: walletDoc.data().saldo + nominal, updatedAt: serverTimestamp() });
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
                uid: activeUserUID,
                type: "setor_tunai",
                amount: nominal,
                timestamp: serverTimestamp(),
                status: "berhasil"
            });
        });

        alert("Setor tunai berhasil!");
        modalSetor.classList.add("hidden");
        inputNominalSetor.value = "";
        fetchDataUser(activeUserUID); // Langsung refresh UI saldo & riwayat
    } catch (error) {
        alert("Gagal Setor: " + error);
    }
}

// --- Event Listeners Modal ---
btnTarik.addEventListener("click", () => {
    if (!activeUserUID) return alert("Silakan cari ID dulu!");
    modalTarik.classList.remove("hidden");
});
btnBatal.addEventListener("click", () => modalTarik.classList.add("hidden"));
btnKonfirmasiTarik.addEventListener("click", () => {
    const nominal = parseInt(inputNominal.value);
    if (!nominal || nominal <= 0) return alert("Masukkan nominal yang benar!");
    prosesTarikTunai(nominal);
});

btnSetor.addEventListener("click", () => {
    if (!activeUserUID) return alert("Silakan cari ID dulu!");
    modalSetor.classList.remove("hidden");
});
btnBatalSetor.addEventListener("click", () => modalSetor.classList.add("hidden"));
btnKonfirmasiSetor.addEventListener("click", () => {
    const nominal = parseInt(inputNominalSetor.value);
    if (!nominal || nominal <= 0) return alert("Masukkan nominal yang benar!");
    prosesSetorTunai(nominal);
});
