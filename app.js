import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Fungsi 1: Ambil Saldo (Dengan Auto-Generate Dummy Data) ---
async function fetchSaldo() {
    try {
        const walletRef = doc(db, "wallets", currentUserUID);
        const walletSnap = await getDoc(walletRef);
        
        if (walletSnap.exists()) {
            // Jika data sudah ada, tampilkan saldo
            const data = walletSnap.data();
            saldoDisplay.innerText = `Rp ${data.saldo.toLocaleString('id-ID')}`;
        } else {
            // JIKA BELUM ADA (Baru pertama kali run di GitHub):
            console.log("Membuat data dummy saldo awal...");
            await setDoc(walletRef, {
                uid: currentUserUID,
                saldo: 500000, // Saldo awal Rp 500.000
                updatedAt: new Date()
            });
            saldoDisplay.innerText = "Rp 500.000";
            alert("Data dummy berhasil ditambahkan! Saldo awal Rp 500.000");
        }
    } catch (error) {
        console.error("Error ambil saldo:", error);
        saldoDisplay.innerText = "Error";
    }
}
