// DTU Health Center - Firebase Real-Time Synchronization Service

// Real-Time Listener for Appointments
function syncRealtimeAppointments(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("appointments")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const liveList = [];
                snapshot.forEach(doc => {
                    liveList.push({ id: doc.id, ...doc.data() });
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

// Add Appointment to Cloud Database
async function cloudAddAppointment(appointment) {
    if (isFirebaseConnected && db) {
        try {
            await db.collection("appointments").add({
                ...appointment,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("☁️ Appointment synced to Firebase Cloud");
        } catch (e) {
            console.warn("Cloud save queued locally:", e.message);
        }
    }
}

// Real-Time Listener for Doctor Checkup Slots (Max 10 Limit)
function syncRealtimeSlots(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("slots")
            .onSnapshot((snapshot) => {
                const liveSlots = [];
                snapshot.forEach(doc => {
                    liveSlots.push({ id: doc.id, ...doc.data() });
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

// Add Doctor Slot to Cloud Database
async function cloudAddSlot(slot) {
    saveSlot(slot);

    if (isFirebaseConnected && db) {
        try {
            await db.collection("slots").add(slot);
            console.log("☁️ Slot synced to Firebase Cloud");
        } catch (e) {
            console.warn("Slot saved locally:", e.message);
        }
    }
}

// Real-Time Listener for Campus Health Notices
function syncRealtimeNotices(onUpdateCallback) {
    if (isFirebaseConnected && db) {
        db.collection("notices")
            .onSnapshot((snapshot) => {
                const liveNotices = [];
                snapshot.forEach(doc => {
                    liveNotices.push({ id: doc.id, ...doc.data() });
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

// Add Notice to Cloud Database
async function cloudAddNotice(notice) {
    saveNotice(notice);

    if (isFirebaseConnected && db) {
        try {
            await db.collection("notices").add(notice);
            console.log("☁️ Notice broadcasted to Firebase Cloud");
        } catch (e) {
            console.warn("Notice saved locally:", e.message);
        }
    }
}

// Real-Time Ambulance SOS Alert Broadcast
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
            console.log("🚨 SOS dispatched to Firebase Cloud");
        } catch (e) {
            console.warn("SOS queued locally:", e.message);
        }
    }
}
