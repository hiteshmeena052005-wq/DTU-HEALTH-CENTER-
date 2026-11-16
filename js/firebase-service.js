// DTU Health Center - Firebase Real-Time Cloud Synchronization Service
// Powered by Google Firebase Cloud Firestore (Direct Cloud Single Source of Truth)

// -------------------------------------------------------------
// 1. APPOINTMENTS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimeAppointments(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("appointments")
            .onSnapshot((snapshot) => {
                const liveList = [];
                snapshot.forEach(doc => {
                    liveList.push({ ...doc.data(), docId: doc.id });
                });
                
                // Update in-memory runtime store (NEVER localStorage)
                window._dtuMemoryDB.appointments = liveList;

                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveList);
                }
            }, (error) => {
                console.warn("Firestore appointments sync:", error.message);
                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(window._dtuMemoryDB.appointments);
                }
            });
    } else {
        if (typeof onUpdateCallback === "function") {
            onUpdateCallback(window._dtuMemoryDB.appointments);
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

            // Also update slot booked count directly in Firestore
            if (appointment.slotId) {
                const slotRef = db.collection("slots").doc(String(appointment.slotId));
                const slotDoc = await slotRef.get();
                if (slotDoc.exists) {
                    const currentBooked = slotDoc.data().bookedCount || 0;
                    const maxCap = slotDoc.data().maxLimit || 10;
                    await slotRef.update({ bookedCount: Math.min(maxCap, currentBooked + 1) });
                }
            }
        } catch (e) {
            console.warn("Cloud save queued:", e.message);
        }
    }
}

async function cloudCancelAppointment(aptId, slotId) {
    if (isFirebaseConnected && db) {
        try {
            const snap = await db.collection("appointments").where("id", "==", aptId).get();
            snap.forEach(doc => doc.ref.delete());
            console.log(`☁️ [FIREBASE CLOUD] Appointment ${aptId} deleted from Google Firestore`);

            // Also update slot booked count directly in Firestore
            if (slotId) {
                const slotRef = db.collection("slots").doc(String(slotId));
                const slotDoc = await slotRef.get();
                if (slotDoc.exists) {
                    const currentBooked = slotDoc.data().bookedCount || 0;
                    await slotRef.update({ bookedCount: Math.max(0, currentBooked - 1) });
                }
            }
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
                // If collection is fresh/empty in user's Firebase, seed initial DTU doctor slots
                if (snapshot.empty && window._dtuMemoryDB.slots.length > 0) {
                    window._dtuMemoryDB.slots.forEach(s => {
                        db.collection("slots").doc(String(s.id)).set(s).catch(() => {});
                    });
                }

                const liveSlots = [];
                snapshot.forEach(doc => {
                    liveSlots.push({ ...doc.data(), docId: doc.id });
                });

                if (liveSlots.length > 0) {
                    window._dtuMemoryDB.slots = liveSlots;
                }

                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveSlots.length > 0 ? liveSlots : window._dtuMemoryDB.slots);
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.slots);
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.slots);
    }
}

async function cloudAddSlot(slot) {
    if (!window._dtuMemoryDB.slots.some(s => s.id === slot.id)) {
        window._dtuMemoryDB.slots.unshift(slot);
    }

    if (isFirebaseConnected && db) {
        try {
            await db.collection("slots").doc(String(slot.id)).set(slot);
            console.log("☁️ [FIREBASE CLOUD] Slot synced to Google Firestore");
        } catch (e) {
            console.warn("Slot cloud save error:", e.message);
        }
    }
}

// -------------------------------------------------------------
// 3. DIGITAL PRESCRIPTIONS (Real-time Cloud Sync)
// -------------------------------------------------------------
function syncRealtimePrescriptions(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("prescriptions")
            .onSnapshot((snapshot) => {
                const liveRx = [];
                snapshot.forEach(doc => {
                    liveRx.push({ ...doc.data(), docId: doc.id });
                });

                window._dtuMemoryDB.prescriptions = liveRx;

                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveRx);
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.prescriptions);
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.prescriptions);
    }
}

async function cloudAddPrescription(rxData) {
    window._dtuMemoryDB.prescriptions.unshift(rxData);

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
            .onSnapshot((snapshot) => {
                const liveRefs = [];
                snapshot.forEach(doc => {
                    liveRefs.push({ ...doc.data(), docId: doc.id });
                });

                window._dtuMemoryDB.referrals = liveRefs;

                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveRefs);
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.referrals);
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.referrals);
    }
}

async function cloudAddReferral(refData) {
    window._dtuMemoryDB.referrals.unshift(refData);

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
                // If collection empty in user's Firebase, seed initial notice
                if (snapshot.empty && window._dtuMemoryDB.notices.length > 0) {
                    window._dtuMemoryDB.notices.forEach(n => {
                        db.collection("notices").doc(String(n.id)).set(n).catch(() => {});
                    });
                }

                const liveNotices = [];
                snapshot.forEach(doc => {
                    liveNotices.push({ ...doc.data(), docId: doc.id });
                });

                if (liveNotices.length > 0) {
                    window._dtuMemoryDB.notices = liveNotices;
                }

                if (typeof onUpdateCallback === "function") {
                    onUpdateCallback(liveNotices.length > 0 ? liveNotices : window._dtuMemoryDB.notices);
                }
            }, (err) => {
                if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.notices);
            });
    } else {
        if (typeof onUpdateCallback === "function") onUpdateCallback(window._dtuMemoryDB.notices);
    }
}

async function cloudAddNotice(notice) {
    if (!window._dtuMemoryDB.notices.some(n => n.id === notice.id)) {
        window._dtuMemoryDB.notices.unshift(notice);
    }

    if (isFirebaseConnected && db) {
        try {
            await db.collection("notices").doc(String(notice.id)).set(notice);
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
            console.warn("SOS cloud error:", e.message);
        }
    }
}
