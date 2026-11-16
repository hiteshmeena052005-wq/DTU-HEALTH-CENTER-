// DTU Health Center - Firebase Real-Time Cloud Synchronization Service
// Powered by Google Firebase Cloud Firestore

// -------------------------------------------------------------
// 1. APPOINTMENTS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimeAppointments(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("appointments")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const liveList = [];
                snapshot.forEach(doc => {
                    liveList.push({ ...doc.data(), docId: doc.id });
                });
                if (liveList.length > 0) {
                    localStorage.setItem("dtu_appointments", JSON.stringify(liveList));
                }
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveList.length > 0 ? liveList : getAppointments());
                }
            }, (error) => {
                console.warn("Firestore appointments sync fallback:", error);
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(getAppointments());
                }
            });
    } else {
        if (typeof onUpdateCallback === "function") {
            onUpdateCallback(getAppointments());
        }
    }
}

async function cloudAddAppointment(appointment) {
    if (isFirebaseConnected && db) {
        try {
            await db.collection("appointments").add({
                ...appointment,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("☁️ [FIREBASE CLOUD] Appointment synced to Google Firestore");
        } catch (e) {
            console.warn("Cloud save queued:", e.message);
        }
    }
}

async function cloudCancelAppointment(aptId) {
    if (isFirebaseConnected && db) {
        try {
            const snap = await db.collection("appointments").where("id", "==", aptId).get();
            snap.forEach(doc => doc.ref.delete());
            console.log(`☁️ [FIREBASE CLOUD] Appointment ${aptId} deleted from Google Firestore`);
        } catch (e) {
            console.warn("Cloud cancel error:", e.message);
        }
    }
}

// -------------------------------------------------------------
// 2. DOCTOR CHECKUP SLOTS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimeSlots(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("slots")
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    const initialSlots = getSlots();
                    initialSlots.forEach(s => {
                        db.collection("slots").doc(String(s.id)).set(s).catch(() => {});
                    });
                }
                const liveSlots = [];
                snapshot.forEach(doc => {
                    liveSlots.push({ ...doc.data(), docId: doc.id });
                });
                if (liveSlots.length > 0) {
                    localStorage.setItem("dtu_slots", JSON.stringify(liveSlots));
                }
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveSlots.length > 0 ? liveSlots : getSlots());
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(getSlots());
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(getSlots());
    }
}

async function cloudAddSlot(slot) {
    saveSlot(slot);

    if (isFirebaseConnected && db) {
        try {
            await db.collection("slots").add(slot);
            console.log("☁️ [FIREBASE CLOUD] Slot synced to Google Firestore");
        } catch (e) {
            console.warn("Slot save error:", e.message);
        }
    }
}

// -------------------------------------------------------------
// 3. DIGITAL PRESCRIPTIONS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimePrescriptions(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("prescriptions")
            .orderBy("issuedAt", "desc")
            .onSnapshot((snapshot) => {
                const liveRx = [];
                snapshot.forEach(doc => {
                    liveRx.push({ ...doc.data(), docId: doc.id });
                });
                if (liveRx.length > 0) {
                    localStorage.setItem("dtu_prescriptions", JSON.stringify(liveRx));
                }
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveRx.length > 0 ? liveRx : getPrescriptions());
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(getPrescriptions());
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(getPrescriptions());
    }
}

async function cloudAddPrescription(rxData) {
    if (isFirebaseConnected && db) {
        try {
            await db.collection("prescriptions").add({
                ...rxData,
                issuedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("☁️ [FIREBASE CLOUD] Prescription saved to Google Firestore");
        } catch (e) {
            console.warn("Prescription cloud save error:", e.message);
        }
    }
}

// -------------------------------------------------------------
// 4. SPECIALIST REFERRALS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimeReferrals(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("referrals")
            .orderBy("referredAt", "desc")
            .onSnapshot((snapshot) => {
                const liveRefs = [];
                snapshot.forEach(doc => {
                    liveRefs.push({ ...doc.data(), docId: doc.id });
                });
                if (liveRefs.length > 0) {
                    localStorage.setItem("dtu_referrals", JSON.stringify(liveRefs));
                }
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveRefs.length > 0 ? liveRefs : getReferrals());
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(getReferrals());
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(getReferrals());
    }
}

async function cloudAddReferral(refData) {
    if (isFirebaseConnected && db) {
        try {
            await db.collection("referrals").add({
                ...refData,
                referredAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("☁️ [FIREBASE CLOUD] Referral saved to Google Firestore");
        } catch (e) {
            console.warn("Referral cloud save error:", e.message);
        }
    }
}

// -------------------------------------------------------------
// 5. CAMPUS HEALTH NOTICES (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimeNotices(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("notices")
            .onSnapshot((snapshot) => {
                const liveNotices = [];
                snapshot.forEach(doc => {
                    liveNotices.push({ ...doc.data(), docId: doc.id });
                });
                if (liveNotices.length > 0) {
                    localStorage.setItem("dtu_notices", JSON.stringify(liveNotices));
                }
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveNotices.length > 0 ? liveNotices : getNotices());
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(getNotices());
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(getNotices());
    }
}

async function cloudAddNotice(notice) {
    saveNotice(notice);

    if (isFirebaseConnected && db) {
        try {
            await db.collection("notices").add(notice);
            console.log("☁️ [FIREBASE CLOUD] Notice broadcasted to Google Firestore");
        } catch (e) {
            console.warn("Notice save error:", e.message);
        }
    }
}

// -------------------------------------------------------------
// 6. EMERGENCY AMBULANCE SOS ALERTS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimeEmergency(onAlertCallback) {
    if (isFirebaseConnected && db) {
        db.collection("emergency_alerts")
            .orderBy("timestamp", "desc")
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === "added") {
                        if (typeof onAlertCallback === "function") {
                            onAlertCallback(change.doc.data());
                        }
                    }
                });
            });
    }
}

async function cloudTriggerSOS(sosData) {
    if (isFirebaseConnected && db) {
        try {
            await db.collection("emergency_alerts").add({
                ...sosData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("🚨 [FIREBASE CLOUD] SOS dispatched to Google Firestore");
        } catch (e) {
            console.warn("SOS queued locally:", e.message);
        }
    }
}
