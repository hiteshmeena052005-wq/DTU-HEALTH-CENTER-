// DTU Health Center - Firebase Cloud Database Configuration
// Powered by Google Firebase Firestore (Real-Time Cloud Sync)

const firebaseConfig = {
    apiKey: "AIzaSyDTU_HEALTH_CENTER_PROTOTYPE_DEMO",
    authDomain: "dtu-health-center.firebaseapp.com",
    projectId: "dtu-health-center",
    storageBucket: "dtu-health-center.appspot.com",
    messagingSenderId: "1029384756",
    appId: "1:1029384756:web:dtuhealthcenterdemo"
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
