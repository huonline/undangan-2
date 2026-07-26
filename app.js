import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, runTransaction, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Variabel penampung ID (Awalnya kosong)
let activeUserUID = "";

// --- Elemen DOM UI ---
const inputKartuID = document.getElementById("inputKartuID");
const btnCekID = document.getElementById("btnCekID");
const displayID = document.getElementById("displayID");
const saldoDisplay = document.getElementById("saldoAmmount");

const btnTarik = document.getElementById("btnTarik");
const modalTarik = document.getElementById("modalTarik");
const btnBatal = document.getElementById("btnBatal");
const btnKonfirmasiTarik = document.getElementById("btnKonfirmasiTarik");
const inputNominal = document.getElementById("inputNominal");

// --- Event 1: Tombol Cari ID Ditekan ---
btnCekID.addEventListener("click", () => {
    const idInput = inputKartuID.value.trim();
    if (!idInput) {
        alert("Masukkan ID KTP / KTS terlebih dahulu!");
        return;
    }
    
    activeUserUID = idInput;
    displayID.innerText = activeUserUID;
    fetchSaldo(activeUserUID);
});

// --- Fungsi 2: Ambil Saldo berdasarkan ID ---
async function fetchSaldo(uid) {
    try {
        saldoDisplay.innerText = "Memuat...";
        const walletRef = doc(db, "wallets", uid);
        const walletSnap = await getDoc(walletRef);
        
        if (walletSnap.exists()) {
            const data = walletSnap.data();
            saldoDisplay.innerText = `Rp ${data.saldo.toLocaleString('id-ID')}`;
        } else {
            // Jika ID KTP ini belum pernah ada di database, buatkan akun saldo baru (Rp 0)
            await setDoc(walletRef, {
                uid: uid,
                saldo: 0,
                updatedAt: new Date()
            });
            saldoDisplay.innerText = "Rp 0";
            alert(`ID ${uid} belum terdaftar. Akun baru telah dibuat dengan saldo Rp 0.`);
        }
    } catch (error) {
        console.error("Error ambil saldo:", error);
        saldoDisplay.innerText = "Error";
    }
}

// --- Fungsi 3: Tarik Tunai ---
async function prosesTarikTunai(nominal) {
    if (!activeUserUID) {
        alert("Pilih atau masukkan ID terlebih dahulu!");
        return;
    }

    const walletRef = doc(db, "wallets", activeUserUID);
    
    try {
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists()) {
                throw "Data akun tidak ditemukan!";
            }

            const saldoSekarang = walletDoc.data().saldo;
            if (saldoSekarang < nominal) {
                throw "Saldo tidak mencukupi!";
            }

            // Kurangi Saldo
            const saldoBaru = saldoSekarang - nominal;
            transaction.update(walletRef, { saldo: saldoBaru, updatedAt: serverTimestamp() });

            // Catat Transaksi
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
        fetchSaldo(activeUserUID); // Refresh saldo

    } catch (error) {
        alert("Gagal: " + error);
    }
}

// --- Event Listeners Modal ---
btnTarik.addEventListener("click", () => {
    if (!activeUserUID) {
        alert("Silakan masukkan ID KTP/KTS dan klik Cari dulu!");
        return;
    }
    modalTarik.classList.remove("hidden");
});

btnBatal.addEventListener("click", () => modalTarik.classList.add("hidden"));

btnKonfirmasiTarik.addEventListener("click", () => {
    const nominal = parseInt(inputNominal.value);
    if (!nominal || nominal <= 0) {
        alert("Masukkan nominal yang benar!");
        return;
    }
    prosesTarikTunai(nominal);
});
