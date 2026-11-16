// DTU Health Center - Firebase Cloud Database Configuration
// Powered by Google Firebase Firestore (Real-Time Cloud Sync)

const firebaseConfig = {
    apiKey: "AIzaSyCMbvBTlx5sWzSvH6rYD3AVcGj9ny6FjnI",
    authDomain: "dtu-health-center.firebaseapp.com",
    projectId: "dtu-health-center",
    storageBucket: "dtu-health-center.firebasestorage.app",
    messagingSenderId: "901301135872",
    appId: "1:901301135872:web:47e50ab6df03bb7c9b06e5",
    measurementId: "G-S8NFZYY8X9"
};

// Check if Firebase is available and initialize
let db = null;
let isFirebaseConnected = false;

try {
    if (typeof firebase !== 'undefined' && firebase.apps) {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        isFirebaseConnected = true;
        console.log("🔥 Firebase Cloud Database Initialized in Real-Time Mode");
    }
} catch (error) {
    console.warn("⚠️ Firebase using offline/local mode fallback:", error.message);
    isFirebaseConnected = false;
}
