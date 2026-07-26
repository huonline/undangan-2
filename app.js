import { db } from './firebase-config.js';
import { doc, getDoc, runTransaction, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Dummy UID untuk testing (Nanti diganti dengan sistem login)
const currentUserUID = "UID_SANTRI_001"; 

// --- Elemen DOM UI ---
const saldoDisplay = document.getElementById("saldoAmmount");
const btnTarik = document.getElementById("btnTarik");
const modalTarik = document.getElementById("modalTarik");
const btnBatal = document.getElementById("btnBatal");
const btnKonfirmasiTarik = document.getElementById("btnKonfirmasiTarik");
const inputNominal = document.getElementById("inputNominal");

// --- Fungsi 1: Ambil Saldo Saat Ini ---
async function fetchSaldo() {
    try {
        const walletRef = doc(db, "wallets", currentUserUID);
        const walletSnap = await getDoc(walletRef);
        
        if (walletSnap.exists()) {
            const data = walletSnap.data();
            saldoDisplay.innerText = `Rp ${data.saldo.toLocaleString('id-ID')}`;
        } else {
            saldoDisplay.innerText = "Rp 0";
            console.log("Wallet belum dibuat!");
        }
    } catch (error) {
        console.error("Error ambil saldo:", error);
    }
}

// --- Fungsi 2: Tarik Tunai (Pakai Firestore Transaction biar aman) ---
async function prosesTarikTunai(nominal) {
    const walletRef = doc(db, "wallets", currentUserUID);
    
    try {
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists()) {
                throw "Data wallet tidak ditemukan!";
            }

            const saldoSekarang = walletDoc.data().saldo;
            if (saldoSekarang < nominal) {
                throw "Saldo tidak mencukupi!";
            }

            // 1. Kurangi Saldo
            const saldoBaru = saldoSekarang - nominal;
            transaction.update(walletRef, { saldo: saldoBaru, updatedAt: serverTimestamp() });

            // 2. Catat Riwayat Transaksi
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
                uid: currentUserUID,
                type: "tarik_tunai",
                amount: nominal,
                timestamp: serverTimestamp(),
                status: "berhasil"
            });
        });

        alert("Tarik tunai berhasil!");
        modalTarik.classList.add("hidden");
        inputNominal.value = "";
        fetchSaldo(); // Refresh tampilan saldo

    } catch (error) {
        alert("Gagal: " + error);
    }
}

// --- Event Listeners UI ---
btnTarik.addEventListener("click", () => modalTarik.classList.remove("hidden"));
btnBatal.addEventListener("click", () => modalTarik.classList.add("hidden"));

btnKonfirmasiTarik.addEventListener("click", () => {
    const nominal = parseInt(inputNominal.value);
    if (!nominal || nominal <= 0) {
        alert("Masukkan nominal yang benar!");
        return;
    }
    prosesTarikTunai(nominal);
});

// Panggil fungsi saat aplikasi pertama dibuka
fetchSaldo();
