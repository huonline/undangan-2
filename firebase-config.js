import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Konfigurasi dari Boss
const firebaseConfig = {
    apiKey: "AIzaSyCvzxy8uB0n5PuYxly9jSKOSgw6Y4mUVyw",
    authDomain: "admin-14907.firebaseapp.com",
    projectId: "admin-14907",
    storageBucket: "admin-14907.firebasestorage.app",
    messagingSenderId: "344613917662",
    appId: "1:344613917662:web:0fbb069a77699e53d0434f",
    measurementId: "G-XJJ2KSZ7NM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
