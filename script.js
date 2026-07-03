// 1. MODULE IMPORTS
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, limitToLast, onChildAdded, remove, onDisconnect, query } from "firebase/database";
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDACQBpFiOW3k_SUMsqYNsIld9jgNzOwkc",
  authDomain: "our-space-857e7.firebaseapp.com",
  databaseURL: "https://our-space-857e7-default-rtdb.firebaseio.com",
  projectId: "our-space-857e7",
  storageBucket: "our-space-857e7.firebasestorage.app",
  messagingSenderId: "636094347349",
  appId: "1:636094347349:web:6be1cec2451e6a917a7cdc"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// ── Mood data ──────────────────────────────────────────────────────────────
const moodData = {
    happy: {
        message: "Seeing you happy makes my whole world light up, Samantha! Keep that beautiful smile on your face. ❤️",
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
        class: "mood-happy"
    },
    missing: {
        message: "I miss you more than words can say, my queen. I'm counting down the seconds until I can hold you again. 💖",
        image: "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=800&q=80",
        class: "mood-missing"
    },
    tired: {
        message: "Rest your head, my love. You've worked so hard. I wish I was there to give you a massage and tuck you in. 😴",
        image: "https://images.unsplash.com/photo-1511293076910-1744bc417c80?auto=format&fit=crop&w=800&q=80",
        class: "mood-tired"
    },
    hungry: {
        message: "Let's get you some delicious food, princess! Tell me what you're craving and it's yours. 🍕🍣",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        class: "mood-hungry"
    },
    grumpy: {
        message: "Oh no, who upset my favorite person? Come here for a big hug, I'll protect you from the world. 😖❤️",
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80",
        class: "mood-grumpy"
    },
    bored: {
        message: "Boredom doesn't stand a chance with us! Let's watch a movie together or plan our next adventure. 🎬✨",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80",
        class: "mood-bored"
    }
};

const moodBtns = document.querySelectorAll('.mood-selector .mood-btn');
const messageEl = document.getElementById('arnold-message');
const bodyEl = document.body;
const artFrame = document.getElementById('generated-image');
const heartContainer = document.getElementById('visual-heart-container');
const syncIndicator = document.getElementById('sync-indicator');

let currentUser = "";
let partnerName = "";
let lastRenderedDate = null;
let pendingReply = null;

// ── Mood ───────────────────────────────────────────────────────────────────
moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mood = btn.getAttribute('data-mood');
        if (mood) updateMyMood(mood);
    });
});

function updateMyMood(mood, isCustom = false, customText = "") {
    const data = isCustom ? {
        message: `I understand that you're feeling "${customText}", my love. I'm right here with you, always. ❤️`,
        image: "https://images.unsplash.com/photo-1516589174184-c68526674fd6?auto=format&fit=crop&w=800&q=80",
        class: "mood-custom",
        label: customText
    } : moodData[mood];

    if (!data) return;

    if (db && currentUser) {
        const moodObj = { mood: isCustom ? customText : mood, moodClass: data.class, timestamp: Date.now() };
        set(ref(db, 'moods/' + currentUser.toLowerCase()), moodObj);
        push(ref(db, 'moodHistory/' + currentUser.toLowerCase()), moodObj);
    }

    applyMoodUI(data, isCustom ? customText : mood);
}

function applyMoodUI(data, label) {
    if (!data || !messageEl) return;
    messageEl.style.opacity = 0;
    setTimeout(() => { messageEl.textContent = data.message; messageEl.style.opacity = 1; }, 300);
    if (bodyEl) bodyEl.className = data.class || 'mood-default';
    if (artFrame) {
        artFrame.style.backgroundImage = `url('${data.image}')`;
        const content = artFrame.querySelector('.art-content');
        if (content) content.innerHTML = `<span>${(label || "").toUpperCase()} VIBES</span>`;
    }
    createHearts();
}

function createHearts(count = 15, emojis = ['❤️']) {
    if (!heartContainer) return;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            heart.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
            heart.style.left = Math.random() * 100 + 'vw';
            heart.style.fontSize = (Math.random() * 20 + 20) + 'px';
            heart.style.animationDuration = (Math.random() * 2 + 3) + 's';
            heartContainer.appendChild(heart);
            setTimeout(() => heart.remove(), 5000);
        }, i * 150);
    }
}

const customMoodInput = document.getElementById('custom-mood-input');
const customMoodBtn = document.getElementById('custom-mood-btn');
if (customMoodBtn) {
    customMoodBtn.addEventListener('click', () => {
        const val = customMoodInput?.value.trim();
        if (val) { updateMyMood(null, true, val); customMoodInput.value = ''; }
    });
}

// ── Auth ───────────────────────────────────────────────────────────────────
const validUsers = ["arnold", "varaidzo", "arnold alpha", "varaidzo samantha", "samantha"];
const SALPHA_PASSPHRASE = "to infinity and beyond";
const authOverlay = document.getElementById('auth-overlay');
const mainApp = document.getElementById('main-app');
const salphaApp = document.getElementById('salpha-app');
const authInput = document.getElementById('auth-name-input');
const authPassphraseInput = document.getElementById('auth-passphrase-input');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const loggedUserDisplay = document.getElementById('logged-user-display');
const logoutBtn = document.getElementById('logout-btn');

function checkAuth() {
    const sessionUser = localStorage.getItem('current-session-user');
    if (sessionUser === 'Salpha') { showSalphaApp(); return; }
    if (sessionUser) showApp(sessionUser);
}

function login() {
    const input = authInput?.value.trim().toLowerCase();

    // SALPHA: reveal a passphrase field first, then validate it
    if (input === 'salpha') {
        if (authPassphraseInput?.classList.contains('hidden')) {
            authPassphraseInput.classList.remove('hidden');
            authPassphraseInput.focus();
            if (authError) authError.textContent = "Enter the secret passphrase to continue. 🔒";
            return;
        }
        const passphrase = authPassphraseInput?.value.trim().toLowerCase();
        if (passphrase === SALPHA_PASSPHRASE) {
            localStorage.setItem('current-session-user', 'Salpha');
            showSalphaApp();
        } else {
            if (authError) authError.textContent = "Access denied. Only SALPHA may pass. 🔒";
        }
        return;
    }

    // Switching away from "salpha" hides the passphrase field again
    if (authPassphraseInput && !authPassphraseInput.classList.contains('hidden')) {
        authPassphraseInput.classList.add('hidden');
        authPassphraseInput.value = '';
    }

    if (validUsers.includes(input)) {
        const formattedName = input.charAt(0).toUpperCase() + input.slice(1);
        localStorage.setItem('current-session-user', formattedName);
        showApp(formattedName);
        createHearts();
    } else {
        if (authError) authError.textContent = "Only Arnold or Varaidzo can enter this heart. ❤️";
    }
}

function showApp(userName) {
    if (authOverlay) authOverlay.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    if (loggedUserDisplay) loggedUserDisplay.textContent = userName;

    const lowName = userName.toLowerCase();
    currentUser = lowName.includes('arnold') ? "Arnold" : "Varaidzo";
    partnerName = currentUser === "Arnold" ? "Varaidzo" : "Arnold";

    setupSync();
    startMilestoneCountdown();
    initPromptDisplay();
    loadMysteryBox();
    initTicTacToeSync();

    const chatLabel = document.getElementById('chat-user-label');
    if (chatLabel) chatLabel.textContent = `Logged in as: ${currentUser}`;
}

// ── SALPHA: Our Locations dashboard ─────────────────────────────────────────
let salphaMap = null;
let salphaMarkers = {};
let salphaLocations = {};

function showSalphaApp() {
    if (authOverlay) authOverlay.classList.add('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    if (salphaApp) salphaApp.classList.remove('hidden');
    currentUser = 'Salpha';
    initSalphaMap();
}

function initSalphaMap() {
    const mapEl = document.getElementById('salpha-map');
    if (!mapEl || !window.L || !db) return;

    if (!salphaMap) {
        salphaMap = L.map('salpha-map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(salphaMap);
        setTimeout(() => salphaMap.invalidateSize(), 150);
    }

    const icons = { arnold: '💙', varaidzo: '💖' };
    Object.keys(icons).forEach(key => {
        onValue(ref(db, 'locations/' + key), (snap) => updateSalphaLocation(key, snap.val(), icons[key]));
    });
}

function updateSalphaLocation(key, data, emoji) {
    salphaLocations[key] = (data && data.lat != null && data.lng != null) ? data : null;

    if (salphaLocations[key]) {
        const { lat, lng, timestamp } = salphaLocations[key];
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        if (salphaMarkers[key]) {
            salphaMarkers[key].setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({ html: `<div class="salpha-marker">${emoji}</div>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
            salphaMarkers[key] = L.marker([lat, lng], { icon }).addTo(salphaMap);
        }
        salphaMarkers[key].bindPopup(`${label} — last seen ${formatTimeAgo(timestamp)}`);
    }

    renderSalphaList();
    fitSalphaBounds();
}

function renderSalphaList() {
    const listEl = document.getElementById('salpha-location-list');
    if (!listEl) return;
    const rows = ['arnold', 'varaidzo'].map(key => {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const emoji = key === 'arnold' ? '💙' : '💖';
        const data = salphaLocations[key];
        const status = data?.timestamp
            ? `<span>Last seen ${formatTimeAgo(data.timestamp)}</span>`
            : `<span class="salpha-no-data">No location yet</span>`;
        return `<div class="salpha-location-item"><span>${emoji} ${label}</span>${status}</div>`;
    });
    listEl.innerHTML = rows.join('');
}

function fitSalphaBounds() {
    if (!salphaMap) return;
    const pts = Object.values(salphaLocations)
        .filter(d => d)
        .map(d => [d.lat, d.lng]);
    if (pts.length === 1) salphaMap.setView(pts[0], 13);
    else if (pts.length > 1) salphaMap.fitBounds(pts, { padding: [40, 40] });
}

// ── Sync hub ───────────────────────────────────────────────────────────────
function setupSync() {
    if (!db) return;

    // 1. Connection & presence
    onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val() === true) {
            if (syncIndicator) { syncIndicator.textContent = "Connected ❤️"; syncIndicator.className = "sync-indicator online"; }
            const myStatusRef = ref(db, 'status/' + currentUser.toLowerCase());
            const myLastSeenRef = ref(db, 'lastSeen/' + currentUser.toLowerCase());
            onDisconnect(myStatusRef).set('offline');
            onDisconnect(myLastSeenRef).set(Date.now());
            set(myStatusRef, 'online');
        } else {
            if (syncIndicator) { syncIndicator.textContent = "Reconnecting..."; syncIndicator.className = "sync-indicator error"; }
        }
    });

    // 2. Partner status
    onValue(ref(db, 'status/' + partnerName.toLowerCase()), (snap) => {
        const status = snap.val() || 'offline';
        const el = document.getElementById('partner-status');
        const lastSeenEl = document.getElementById('last-seen-display');
        if (el) { el.textContent = status.charAt(0).toUpperCase() + status.slice(1); el.className = status; el.style.color = status === 'online' ? "#4caf50" : "#999"; }
        if (status === 'offline') {
            onValue(ref(db, 'lastSeen/' + partnerName.toLowerCase()), (snap2) => {
                const ts = snap2.val();
                if (ts && lastSeenEl) { lastSeenEl.textContent = `Last seen: ${formatTimeAgo(ts)}`; lastSeenEl.classList.remove('hidden'); }
            }, { onlyOnce: true });
        } else if (lastSeenEl) { lastSeenEl.classList.add('hidden'); }
    });

    // 3. Mood sync
    onValue(ref(db, 'moods'), (snap) => {
        const moods = snap.val();
        if (!moods) return;
        const a = moods.arnold, v = moods.varaidzo;
        const latest = !a ? v : !v ? a : (a.timestamp > v.timestamp ? a : v);
        if (latest && bodyEl) bodyEl.className = latest.moodClass || 'mood-default';
        const pd = moods[partnerName.toLowerCase()];
        if (pd && Date.now() - pd.timestamp < 15000) {
            const alertEl = document.getElementById('partner-mood-alert');
            const textEl = document.getElementById('partner-mood-text');
            const nameEl = document.getElementById('partner-name-label');
            if (alertEl && textEl) {
                if (nameEl) nameEl.textContent = partnerName;
                textEl.textContent = pd.mood;
                alertEl.classList.remove('hidden');
                setTimeout(() => alertEl.classList.add('hidden'), 8000);
            }
        }
    });

    // 4. Chat
    const chatRef = query(ref(db, 'chat'), limitToLast(50));
    onChildAdded(chatRef, (snap) => displayMessage(snap.val()), (err) => console.error("Chat sync error:", err));

    // 5. Quests
    onValue(ref(db, 'quests'), (snap) => {
        const state = snap.val();
        if (state) { questState = state; updateQuestUI(); }
    });

    // 6. Gratitude & bucket list
    onValue(ref(db, 'gratitude'), (snap) => {
        const items = [];
        snap.forEach(child => items.push({ id: child.key, text: child.val() }));
        renderFirebaseList('gratitude-list', items, 'gratitude');
    });
    onValue(ref(db, 'bucketlist'), (snap) => {
        const items = [];
        snap.forEach(child => items.push({ id: child.key, text: child.val() }));
        renderFirebaseList('bucket-list', items, 'bucketlist');
    });

    // 7. Mood history — both users combined, newest first
    const _mhCache = { arnold: [], varaidzo: [] };
    const _mergeMoodHistory = () => {
        const merged = [..._mhCache.arnold, ..._mhCache.varaidzo]
            .sort((a, b) => b.timestamp - a.timestamp);
        renderMoodHistory(merged);
    };
    onValue(ref(db, 'moodHistory/arnold'), (snap) => {
        const val = snap.val() || {};
        _mhCache.arnold = Object.values(val).map(e => ({ ...e, who: 'arnold' }));
        _mergeMoodHistory();
    });
    onValue(ref(db, 'moodHistory/varaidzo'), (snap) => {
        const val = snap.val() || {};
        _mhCache.varaidzo = Object.values(val).map(e => ({ ...e, who: 'varaidzo' }));
        _mergeMoodHistory();
    });

    // 8. Sync heart (persistent real-time)
    onValue(ref(db, 'sync'), (snap) => updateSyncHeartUI(snap.val() || {}));

    // 9. Sync streak
    onValue(ref(db, 'syncStreak'), (snap) => {
        const streak = snap.val() || { count: 0 };
        const el = document.getElementById('sync-streak');
        if (el) el.textContent = streak.count > 1 ? `🔥 ${streak.count} day streak` : streak.count === 1 ? '🔥 1 day streak' : '';
    });

    // 10. Level (quest completions log)
    onValue(ref(db, 'questLog'), (snap) => {
        let count = 0;
        snap.forEach(() => count++);
        const level = document.getElementById('love-level');
        if (level) level.textContent = Math.floor(count / 3) + 1;
    });

    // 11. Custom milestones
    onValue(ref(db, 'customMilestones'), (snap) => {
        const items = snap.val() || {};
        renderMilestoneList(items);
        refreshMilestoneCountdown(Object.values(items));
    });

    // 12. SOS — "I need you" alerts
    onValue(ref(db, 'sos/' + partnerName.toLowerCase()), (snap) => {
        const data = snap.val();
        if (!data || !data.timestamp) return;
        const lastSeen = parseInt(localStorage.getItem('last-sos-seen') || '0', 10);
        if (data.timestamp > lastSeen && Date.now() - data.timestamp < SOS_ALERT_WINDOW_MS) {
            showSosAlert();
        }
    });
}

// ── Sync heart ─────────────────────────────────────────────────────────────
const syncMessages = [
    "You two are perfectly in sync! To infinity... ✨🚀",
    "Your hearts beat as one! 💖 Always & Forever!",
    "Connection established! Arnold + Varaidzo = 💫",
    "Heartbeat matched! You belong together! ❤️‍🔥",
    "Synced! No distance can break this bond! 💕",
    "Two hearts, one rhythm! You're magic together! ✨",
    "Soulmates synced! The universe approves! 🌌💖",
    "Your love signal is STRONG! 📡❤️ AND BEYOND!",
    "Perfect match! Like stars made for each other! ⭐💫",
    "Sync complete! This love is extraordinary! 💝",
    "Distance is nothing — your hearts found each other! 🌍💖",
    "CONNECTED! Now and always, Arnold & Varaidzo! 🔗❤️"
];

let syncCelebrating = false;

function updateSyncHeartUI(sync) {
    const arnoldDot = document.getElementById('sync-arnold-dot');
    const varaidzoDot = document.getElementById('sync-varaidzo-dot');
    const syncStatus = document.getElementById('sync-status');
    const syncBtn = document.getElementById('sync-heart-btn');

    if (arnoldDot) arnoldDot.className = 'sync-dot' + (sync.arnold ? ' tapped' : '');
    if (varaidzoDot) varaidzoDot.className = 'sync-dot' + (sync.varaidzo ? ' tapped' : '');

    if (sync.arnold && sync.varaidzo && !syncCelebrating) {
        syncCelebrating = true;
        const msg = syncMessages[Math.floor(Math.random() * syncMessages.length)];
        if (syncStatus) syncStatus.innerHTML = `<span class="sync-success">${msg}</span>`;
        if (syncBtn) syncBtn.classList.add('synced');
        createHearts(30, ['❤️', '💖', '💕', '✨', '💫', '🌟', '💝', '🌸']);
        recordSyncStreak();
        setTimeout(() => {
            set(ref(db, 'sync'), { arnold: false, varaidzo: false });
            if (syncBtn) syncBtn.classList.remove('synced');
            if (syncStatus) syncStatus.textContent = "Tap together to sync your hearts 💕";
            syncCelebrating = false;
        }, 5000);
    } else if (!syncCelebrating) {
        if (sync.arnold && !sync.varaidzo) {
            if (syncStatus) syncStatus.innerHTML = `<span class="sync-waiting">Arnold tapped! 💘 Waiting for Varaidzo...</span>`;
            if (syncBtn) syncBtn.classList.add('waiting');
        } else if (sync.varaidzo && !sync.arnold) {
            if (syncStatus) syncStatus.innerHTML = `<span class="sync-waiting">Varaidzo tapped! 💘 Waiting for Arnold...</span>`;
            if (syncBtn) syncBtn.classList.add('waiting');
        } else {
            if (syncBtn) syncBtn.classList.remove('waiting');
            if (syncStatus && !syncStatus.querySelector('.sync-success')) {
                syncStatus.textContent = "Tap together to sync your hearts 💕";
            }
        }
    }
}

function recordSyncStreak() {
    const today = new Date().toDateString();
    const streakRef = ref(db, 'syncStreak');
    onValue(streakRef, (snap) => {
        const streak = snap.val() || { count: 0, lastDate: "" };
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newCount;
        if (streak.lastDate === today) {
            newCount = streak.count; // already counted today
        } else if (streak.lastDate === yesterday) {
            newCount = streak.count + 1;
        } else {
            newCount = 1;
        }
        set(streakRef, { count: newCount, lastDate: today });
    }, { onlyOnce: true });
}

const syncBtn = document.getElementById('sync-heart-btn');
if (syncBtn) {
    syncBtn.addEventListener('click', () => {
        if (!currentUser) return;
        const myKey = currentUser.toLowerCase() === 'arnold' ? 'arnold' : 'varaidzo';
        set(ref(db, 'sync/' + myKey), true);
    });
}

// ── SOS: "I need you" ────────────────────────────────────────────────────────
const SOS_COOLDOWN_MS = 5 * 60 * 1000; // wait between pings so it can't be spammed
const SOS_ALERT_WINDOW_MS = 10 * 60 * 1000; // how long an SOS stays "fresh" for the partner

function sendSOS() {
    if (!db || !currentUser || currentUser === 'Salpha') return;

    const feedback = document.getElementById('sos-feedback');
    const now = Date.now();
    const lastSent = parseInt(localStorage.getItem('last-sos-sent') || '0', 10);

    if (now - lastSent < SOS_COOLDOWN_MS) {
        const remaining = Math.ceil((SOS_COOLDOWN_MS - (now - lastSent)) / 1000);
        if (feedback) {
            feedback.textContent = `Already sent — give it ${remaining}s before pinging again 💕`;
            feedback.classList.remove('hidden');
            setTimeout(() => feedback.classList.add('hidden'), 3000);
        }
        return;
    }

    set(ref(db, 'sos/' + currentUser.toLowerCase()), { from: currentUser, timestamp: now });
    localStorage.setItem('last-sos-sent', String(now));
    createHearts(12, ['💔', '🆘', '❤️']);

    if (feedback) {
        feedback.textContent = `${partnerName} has been notified 💕`;
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 4000);
    }
}

function showSosAlert() {
    const overlay = document.getElementById('sos-alert-overlay');
    const nameEl = document.getElementById('sos-partner-name');
    if (!overlay) return;
    if (nameEl) nameEl.textContent = partnerName;
    overlay.classList.remove('hidden');
    createHearts(20, ['💔', '🫂', '❤️']);
}

function acknowledgeSos() {
    document.getElementById('sos-alert-overlay')?.classList.add('hidden');
    localStorage.setItem('last-sos-seen', String(Date.now()));
}

// ── Chat ───────────────────────────────────────────────────────────────────
function formatChatDate(timestamp) {
    const d = new Date(timestamp);
    const todayStr = new Date().toDateString();
    const yestStr = new Date(Date.now() - 86400000).toDateString();
    if (d.toDateString() === todayStr) return 'Today';
    if (d.toDateString() === yestStr) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sendMessage() {
    const inputEl = document.getElementById('chat-input');
    const text = inputEl?.value.trim();
    if (!text || !currentUser) return;

    const msgData = { sender: currentUser, text, sentAt: Date.now() };
    if (pendingReply) msgData.replyTo = pendingReply;

    push(ref(db, 'chat'), msgData)
        .then(() => { if (inputEl) inputEl.value = ''; cancelReply(); })
        .catch(err => console.error("Chat push error:", err));
}

function displayMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msgId = msg.sentAt || (msg.sender + (msg.text || msg.mediaUrl));
    if (document.getElementById('msg-' + msgId)) return;

    // Date separator
    if (msg.sentAt) {
        const msgDate = new Date(msg.sentAt).toDateString();
        if (msgDate !== lastRenderedDate) {
            const sep = document.createElement('div');
            sep.className = 'date-separator';
            sep.innerHTML = `<span>${formatChatDate(msg.sentAt)}</span>`;
            container.appendChild(sep);
            lastRenderedDate = msgDate;
        }
    }

    const msgDiv = document.createElement('div');
    msgDiv.id = 'msg-' + msgId;
    msgDiv.classList.add('message', msg.sender === "Arnold" ? 'arnold' : 'varaidzo');
    msgDiv.style.transition = 'transform 0.15s ease';

    const timeStr = formatMessageTime(msg.sentAt) || msg.timestamp || '';
    let html = `<span class="sender-name">${msg.sender} • ${timeStr}</span>`;

    if (msg.replyTo) {
        const preview = msg.replyTo.text
            ? (msg.replyTo.text.length > 80 ? msg.replyTo.text.slice(0, 80) + '…' : msg.replyTo.text)
            : (msg.replyTo.mediaType?.startsWith('image/') ? '📷 Photo' : '🎥 Video');
        html += `<div class="reply-quote" data-ref="${msg.replyTo.id}">
            <span class="reply-quote-sender">${msg.replyTo.sender}</span>
            <span class="reply-quote-text">${preview}</span>
        </div>`;
    }

    if (msg.mediaUrl) {
        if (msg.mediaType?.startsWith('image/')) {
            html += `<img src="${msg.mediaUrl}" class="media-content" onclick="window.open('${msg.mediaUrl}','_blank')">`;
        } else if (msg.mediaType?.startsWith('video/')) {
            html += `<video src="${msg.mediaUrl}" class="media-content" controls></video>`;
        }
    }
    if (msg.text) html += `<p>${msg.text}</p>`;

    msgDiv.innerHTML = html;

    // Click reply-quote to scroll to the original message
    msgDiv.querySelector('.reply-quote')?.addEventListener('click', () => {
        scrollToMessage(msg.replyTo.id);
    });

    // Swipe-to-reply (touch)
    let tStartX = 0, tStartY = 0;
    msgDiv.addEventListener('touchstart', e => {
        tStartX = e.touches[0].clientX;
        tStartY = e.touches[0].clientY;
    }, { passive: true });
    msgDiv.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - tStartX;
        const dy = e.touches[0].clientY - tStartY;
        if (Math.abs(dx) > Math.abs(dy) && dx > 0) {
            msgDiv.style.transform = `translateX(${Math.min(dx * 0.5, 70)}px)`;
        }
    }, { passive: true });
    msgDiv.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tStartX;
        msgDiv.style.transform = '';
        if (dx > 60) setReply(msg, msgId);
    });

    // Swipe-to-reply (mouse / desktop)
    let mStartX = 0, mDragging = false;
    msgDiv.addEventListener('mousedown', e => {
        mStartX = e.clientX;
        mDragging = true;
    });
    msgDiv.addEventListener('mousemove', e => {
        if (!mDragging) return;
        const dx = e.clientX - mStartX;
        if (dx > 0) msgDiv.style.transform = `translateX(${Math.min(dx * 0.5, 70)}px)`;
    });
    msgDiv.addEventListener('mouseleave', () => {
        if (mDragging) { msgDiv.style.transform = ''; mDragging = false; }
    });
    msgDiv.addEventListener('mouseup', e => {
        if (!mDragging) return;
        const dx = e.clientX - mStartX;
        mDragging = false;
        msgDiv.style.transform = '';
        if (dx > 60) setReply(msg, msgId);
    });

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function setReply(msg, msgId) {
    pendingReply = {
        id: msgId,
        sender: msg.sender,
        text: msg.text || (msg.mediaType?.startsWith('image/') ? '📷 Photo' : '🎥 Video'),
        mediaType: msg.mediaType || null,
    };
    document.getElementById('reply-preview-sender').textContent = msg.sender;
    document.getElementById('reply-preview-text').textContent = pendingReply.text;
    document.getElementById('reply-preview')?.classList.remove('hidden');
    document.getElementById('chat-input')?.focus();
}

function cancelReply() {
    pendingReply = null;
    document.getElementById('reply-preview')?.classList.add('hidden');
}

function scrollToMessage(msgId) {
    const el = document.getElementById('msg-' + msgId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('reply-flash');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('reply-flash');
    setTimeout(() => el.classList.remove('reply-flash'), 950);
}

document.getElementById('send-btn')?.addEventListener('click', sendMessage);
document.getElementById('chat-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
document.getElementById('reply-cancel-btn')?.addEventListener('click', cancelReply);

// ── Media upload ───────────────────────────────────────────────────────────
document.getElementById('media-btn')?.addEventListener('click', () => document.getElementById('media-input')?.click());
document.getElementById('media-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMediaUpload(file);
});

async function handleMediaUpload(file) {
    if (!currentUser || !storage) return;

    const MAX_MB = 15;
    if (file.size > MAX_MB * 1024 * 1024) {
        setUploadUI(`File too large — max ${MAX_MB}MB ❌`, true);
        setTimeout(() => setUploadUI('', false, true), 3000);
        return;
    }

    const storagePath = `chat_media/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = sRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadUI('Uploading 0%', false);

    uploadTask.on('state_changed',
        (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadUI(`Uploading ${pct}%`, false, false, pct);
        },
        (error) => {
            console.error("Upload error:", error.code, error.message);
            const msg = error.code === 'storage/unauthorized'
                ? 'Blocked by Storage rules — enable public writes in Firebase Console ❌'
                : `Upload failed: ${error.code} ❌`;
            setUploadUI(msg, true);
            setTimeout(() => setUploadUI('', false, true), 5000);
        },
        async () => {
            try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                const mediaMsg = {
                    sender: currentUser,
                    text: "",
                    mediaUrl: downloadUrl,
                    mediaType: file.type,
                    sentAt: Date.now()
                };
                if (pendingReply) mediaMsg.replyTo = pendingReply;
                await push(ref(db, 'chat'), mediaMsg);
                cancelReply();
                setUploadUI('', false, true);
                const mInput = document.getElementById('media-input');
                if (mInput) mInput.value = "";
            } catch (err) {
                console.error("getDownloadURL error:", err);
                setUploadUI('Upload done but URL failed ❌', true);
                setTimeout(() => setUploadUI('', false, true), 3000);
            }
        }
    );
}

function setUploadUI(text, isError, hide = false, pct = 0) {
    const wrap = document.getElementById('upload-progress-wrap');
    const bar = document.getElementById('upload-progress-bar');
    if (hide) {
        if (wrap) wrap.classList.add('hidden');
        if (bar) bar.style.width = '0%';
        if (syncIndicator && syncIndicator.className.includes('upload')) {
            syncIndicator.textContent = "Connected ❤️";
            syncIndicator.className = "sync-indicator online";
        }
        return;
    }
    if (wrap) wrap.classList.remove('hidden');
    if (bar) bar.style.width = pct + '%';
    if (syncIndicator) {
        syncIndicator.textContent = text;
        syncIndicator.className = 'sync-indicator upload ' + (isError ? 'error' : 'online');
    }
}

// ── Daily quests ───────────────────────────────────────────────────────────
const dailyQuests = [
    // Romance & Affection
    { title: "Love Letter", desc: "Write each other a heartfelt love note in the chat — no emojis, just pure honest words. 📝", category: "romance" },
    { title: "Three Words", desc: "Describe your relationship using only 3 words each. Share and compare! 💬", category: "romance" },
    { title: "Compliment Shower", desc: "Shower each other with 5 genuine compliments — go beyond just looks! 🌸", category: "romance" },
    { title: "Our Signature Phrase", desc: "One says 'To Infinity' — the other MUST respond 'and Beyond!' Seal it with a heart in the chat! 🚀", category: "romance" },
    { title: "Dedicate a Song", desc: "Find a song that perfectly describes how you feel right now and share it with your reason why. 🎵", category: "romance" },
    { title: "Morning Message", desc: "Be the first to send a beautiful good morning message before 9am — make it count! ☀️", category: "romance" },
    { title: "Say It Out Loud", desc: "Tell each other one thing you love about the other that you never say out loud. Say it in the chat today. 🤍", category: "romance" },
    { title: "Nickname Creator", desc: "Invent 2 new cute nicknames for each other and explain the meaning behind them! 🏷️", category: "romance" },
    // Memory & Reflection
    { title: "Memory Lane", desc: "Share your single favorite memory of the two of you — with every beautiful detail you remember. 🌅", category: "memory" },
    { title: "First Impression", desc: "Tell each other honestly what you thought when you first met. No filter! 😄", category: "memory" },
    { title: "Photo Share", desc: "Find and share your favorite photo of the two of you in the chat and explain exactly why you love it. 📸", category: "memory" },
    { title: "Our Origin Story", desc: "Each write one sentence about how your story began. Together they form your love story! 📖", category: "memory" },
    { title: "Funniest Moment", desc: "Describe the funniest or most chaotic moment you've shared together. Laugh about it again! 😂", category: "memory" },
    { title: "Best Day Ever", desc: "Describe the single best day you've spent together — every detail from start to finish. ⭐", category: "memory" },
    // Fun & Play
    { title: "Would You Rather", desc: "Take turns asking 5 spicy or funny 'would you rather' questions. No skipping allowed! 🎲", category: "fun" },
    { title: "Couple Trivia", desc: "Quiz each other — 5 questions about each other's favorites, fears, and quirks. See who wins! 🧠", category: "fun" },
    { title: "Emoji Story", desc: "Tell the story of your relationship using only emojis. The other person must interpret it! 🎭", category: "fun" },
    { title: "This or That", desc: "Rapid-fire 10 rounds of 'this or that' covering food, travel, movies, and life choices! ⚡", category: "fun" },
    { title: "Rate Our Compatibility", desc: "Each rate your compatibility 1–10 in: food, travel, humor, goals, love language. Compare results! 💯", category: "fun" },
    { title: "Mini Debate", desc: "Pick a silly topic (cats vs dogs, pineapple on pizza, etc.) and debate it passionately! 🗣️", category: "fun" },
    { title: "Dare Day", desc: "Dare each other to do something fun and harmless today. Share proof in the chat! 😄", category: "fun" },
    { title: "Build Our Ideal Day", desc: "Together, describe your perfect day from waking up to falling asleep — plan it in detail! 🌈", category: "fun" },
    // Dreams & Future
    { title: "Dream Vacation", desc: "Plan your dream vacation together — pick the destination, top 3 activities, and what you'd eat! 🌍", category: "dreams" },
    { title: "5-Year Vision", desc: "Share where you see yourselves in 5 years — individually and as a couple. Dream big! 🌟", category: "dreams" },
    { title: "Bucket List Additions", desc: "Each add 3 new things to our bucket list and vote on which one to do first! ✈️", category: "dreams" },
    { title: "Learn Together", desc: "Pick one skill or subject you both want to explore together this year. Commit to it! 📚", category: "dreams" },
    { title: "Couple Goals", desc: "Set 3 goals for this month — one small, one meaningful, one exciting. Write them in the chat! 🎯", category: "dreams" },
    { title: "Dream Home", desc: "Describe your dream home together — the vibe, location, rooms, and one quirky feature! 🏡", category: "dreams" },
    { title: "Future Letter", desc: "Each write a short letter to yourselves 3 years from now. Save them in the bucket list! 💌", category: "dreams" },
    // Deep Connection
    { title: "Fears & Support", desc: "Share one fear you carry and how your partner makes you feel safer about it. 💪", category: "deep" },
    { title: "Love Language Check", desc: "Describe your love language with a specific moment when your partner got it perfectly right. 💝", category: "deep" },
    { title: "Unspoken Appreciation", desc: "Tell your partner one thing you deeply appreciate that you've never properly put into words. 🤍", category: "deep" },
    { title: "Core Values", desc: "Share your top 3 personal values — see how many you share and where you beautifully differ! ⭐", category: "deep" },
    { title: "Safe Code Word", desc: "Create a secret code word that only you two know — it means 'I need you right now.' 🔐", category: "deep" },
    { title: "Gratitude Overflow", desc: "List 7 things you're genuinely grateful for in this relationship. Go deep, not surface. 🙏", category: "deep" },
    { title: "Hard But Honest", desc: "Gently share one thing you wish you communicated better. Listen without interrupting. 🫂", category: "deep" },
    // Creative
    { title: "Love Poem", desc: "Each write a 4-line poem for the other. Rhyming optional, love mandatory! ✍️", category: "creative" },
    { title: "Describe in Colors", desc: "Describe your partner using 3 colors and explain precisely why each one fits them. 🎨", category: "creative" },
    { title: "Our Playlist", desc: "Each add 3 songs to 'Our Playlist' with a reason for each. Share the songs in chat! 🎶", category: "creative" },
    { title: "Couple Symbol", desc: "Design your couple's symbol in words — what image or idea represents you two perfectly? 🔮", category: "creative" },
    { title: "Invent a Holiday", desc: "Create your own couple holiday — name it, pick a date, and describe exactly how you'd celebrate! 🎉", category: "creative" },
    { title: "Love Recipe", desc: "Write the 'recipe' for your relationship — ingredients, method, and secret sauce! 🍳", category: "creative" },
    // Challenges
    { title: "24hr Kindness Pact", desc: "Both commit to doing one unexpected act of kindness today and report back! 💌", category: "challenge" },
    { title: "Screen-Free Hour", desc: "Agree on a 1-hour window today with no phones or screens — just presence and connection. 📵", category: "challenge" },
    { title: "Eat the Same Meal", desc: "Plan and enjoy the same meal wherever you both are. Share a photo of your plate in chat! 🍽️", category: "challenge" },
    { title: "Sunset Pact", desc: "Both watch tonight's sunset or tomorrow's sunrise. Send each other what you see and feel. 🌅", category: "challenge" },
    { title: "Morning Ritual", desc: "Each share your ideal morning routine — compare and find one habit you both want to adopt! 🌄", category: "challenge" },
];

let questState = { varaidzo: false, arnold: false, index: 0, loggedIndex: -1 };

// No calendar involved: a quest just sits here, as long as it takes, until you
// both mark it done. First-ever load only — after that, Firebase already has state.
function ensureQuestReady() {
    if (!db || currentUser !== "Arnold") return;
    onValue(ref(db, 'quests'), (snap) => {
        if (!snap.exists()) {
            set(ref(db, 'quests'), {
                varaidzo: false,
                arnold: false,
                index: Math.floor(Math.random() * dailyQuests.length)
            });
        }
    }, { onlyOnce: true });
}

function updateQuestUI() {
    const idx = Math.min(questState.index || 0, dailyQuests.length - 1);
    const quest = dailyQuests[idx];
    if (!quest) return;

    const t = document.getElementById('quest-title');
    const d = document.getElementById('quest-desc');
    const tag = document.getElementById('quest-category-tag');
    if (t) t.textContent = quest.title;
    if (d) d.textContent = quest.desc;
    if (tag) { tag.textContent = (quest.category || 'romance').toUpperCase(); tag.className = `quest-tag category-${quest.category || 'romance'}`; }

    const both = questState.varaidzo && questState.arnold;
    const one = questState.varaidzo || questState.arnold;
    const bar = document.getElementById('love-progress');
    if (bar) bar.style.width = both ? '100%' : one ? '50%' : '0%';

    // Log this quest for the level count exactly once, the moment you both
    // finish it — however long that took. One client writes it to avoid a
    // double-log race between two devices completing at the same instant.
    if (both && db && currentUser === "Arnold" && questState.loggedIndex !== questState.index) {
        push(ref(db, 'questLog'), { quest: quest.title, completedAt: Date.now() });
        set(ref(db, 'quests/loggedIndex'), questState.index);
    }

    const newQuestBtn = document.getElementById('new-quest-btn');
    if (newQuestBtn) newQuestBtn.classList.toggle('hidden', !both);

    updateQuestButtons();
}

function updateQuestButtons() {
    const vBtn = document.getElementById('check-varaidzo');
    const aBtn = document.getElementById('check-arnold');
    if (!vBtn || !aBtn) return;
    vBtn.className = 'quest-check-btn' + (questState.varaidzo ? ' completed' : '');
    aBtn.className = 'quest-check-btn' + (questState.arnold ? ' completed' : '');
    vBtn.textContent = questState.varaidzo ? '✓ Varaidzo Done!' : 'Varaidzo Done';
    aBtn.textContent = questState.arnold ? '✓ Arnold Done!' : 'Arnold Done';
}

document.getElementById('check-varaidzo')?.addEventListener('click', () => {
    if (currentUser === "Varaidzo") set(ref(db, 'quests/varaidzo'), !questState.varaidzo);
});
document.getElementById('check-arnold')?.addEventListener('click', () => {
    if (currentUser === "Arnold") set(ref(db, 'quests/arnold'), !questState.arnold);
});

// Only unlocked once you've both checked the current quest done — pulls a
// fresh one on request, never on a timer.
document.getElementById('new-quest-btn')?.addEventListener('click', () => {
    if (!db || !questState.varaidzo || !questState.arnold) return;
    let newIndex = questState.index;
    if (dailyQuests.length > 1) {
        while (newIndex === questState.index) {
            newIndex = Math.floor(Math.random() * dailyQuests.length);
        }
    }
    set(ref(db, 'quests'), { varaidzo: false, arnold: false, index: newIndex });
});

// ── Mystery Gift Box ────────────────────────────────────────────────────────
const mysteryGifts = [
    { icon: "🥞", tag: "romance", text: "Redeem this for breakfast in bed, made with love — whenever you're ready to claim it. 💕" },
    { icon: "🎤", tag: "fun", text: "Dare: Send your partner a voice note saying 'I love you' in your silliest accent. 😂" },
    { icon: "💌", tag: "romance", text: "You are the best thing that has ever been mine. Read this again whenever you doubt it." },
    { icon: "🌹", tag: "romance", text: "Tell your partner that their smile is your favorite place in the whole world." },
    { icon: "🎬", tag: "dreams", text: "Plan a cozy virtual movie night together this week — you pick the snacks, they pick the movie. 🍿" },
    { icon: "🛁", tag: "romance", text: "Coupon: one relaxing bath or spa night, set up by your partner with candles and your favorite music." },
    { icon: "📸", tag: "memory", text: "Find your favorite photo of the two of you and send it with a caption about that exact moment." },
    { icon: "🎲", tag: "fun", text: "Surprise challenge: ask each other 3 'would you rather' questions — no skipping allowed!" },
    { icon: "✍️", tag: "creative", text: "Write a tiny 2-line poem about your partner right now and send it to them." },
    { icon: "🍫", tag: "romance", text: "Coupon: redeemable for your partner's favorite treat, delivered with a hug." },
    { icon: "🌌", tag: "dreams", text: "Tonight, step outside (even on a call) and find one star to call 'ours'." },
    { icon: "🔮", tag: "deep", text: "Tell your partner one thing about your future together that excites you most right now." },
    { icon: "🎶", tag: "creative", text: "Send your partner a song that's playing in your head right now — no explanation needed." },
    { icon: "🤍", tag: "deep", text: "Say one thing you've never said out loud about how much they mean to you." },
    { icon: "🧸", tag: "romance", text: "Coupon: one cuddle session, redeemable any time, no questions asked." },
    { icon: "🚀", tag: "romance", text: "Say 'To Infinity' to your partner today — and see if they answer 'and Beyond!' 🚀" },
    { icon: "🎁", tag: "fun", text: "Surprise! Send your partner a random compliment about something they did this week." },
    { icon: "🗺️", tag: "dreams", text: "Pick a place neither of you have been and tell your partner why you'd love to go there together." },
    { icon: "💃", tag: "fun", text: "Dance challenge: play your favorite song and send a clip of your best dance move." },
    { icon: "📖", tag: "memory", text: "Tell your partner about the moment you first realized you were falling for them." },
    { icon: "🌅", tag: "dreams", text: "Promise: watch the next sunrise or sunset together (in person or by phone) and share how it feels." },
    { icon: "💎", tag: "deep", text: "Name one quality in your partner that makes you feel safe, and tell them why." },
    { icon: "🎉", tag: "fun", text: "Invent a silly new tradition for just the two of you, starting today." },
    { icon: "📝", tag: "creative", text: "Write your partner a one-sentence love note and send it to them right now." },
    { icon: "🍳", tag: "romance", text: "Coupon: breakfast or dinner cooked by you, partner's choice of menu." },
    { icon: "🧩", tag: "fun", text: "Riddle: describe your partner using only 3 emojis — let them guess what you meant." },
    { icon: "🌻", tag: "romance", text: "Tell your partner something small they did recently that made your whole day better." },
    { icon: "🕰️", tag: "memory", text: "Share one memory from the very beginning of your relationship that still makes you smile." },
    { icon: "💞", tag: "deep", text: "Tell your partner what 'home' means to you — and how they fit into that feeling." },
    { icon: "🎈", tag: "fun", text: "Surprise hug challenge: next time you see each other, hug for 20 full seconds." },
    { icon: "🌠", tag: "dreams", text: "Make a wish together for something you both want this year — say it out loud." },
    { icon: "💋", tag: "romance", text: "Coupon: one extra goodnight kiss tonight, with no excuses allowed." },
    { icon: "🧠", tag: "challenge", text: "Quiz your partner: ask them your current favorite song, food, and show — see how well they know you." },
    { icon: "🌈", tag: "dreams", text: "Describe your perfect lazy Sunday together, from morning to night." },
    { icon: "💝", tag: "romance", text: "Just because: tell your partner 'I love you' right now, for no reason at all." },
];

const mysteryBoxEl = document.getElementById('mystery-box');
const mysteryStatus = document.getElementById('mystery-status');
const mysteryReveal = document.getElementById('mystery-reveal');
const mysteryRevealIcon = document.getElementById('mystery-reveal-icon');
const mysteryRevealText = document.getElementById('mystery-reveal-text');
const mysteryRevealTag = document.getElementById('mystery-reveal-tag');
const mysteryPartnerStatus = document.getElementById('mystery-partner-status');
const newMysteryBtn = document.getElementById('new-mystery-btn');

let myMysteryOpened = false;

// No date key: your surprise stays put until you ask for another one — never
// swapped out from under you by the calendar.
function loadMysteryBox() {
    if (!db || !currentUser) return;
    const myKey = currentUser.toLowerCase();
    const partnerKey = partnerName.toLowerCase();

    onValue(ref(db, `mysteryBox/${myKey}`), (snap) => {
        const data = snap.val();
        if (data) {
            myMysteryOpened = true;
            showMysteryReveal(data.giftIndex, false);
        } else {
            myMysteryOpened = false;
            resetMysteryBoxUI();
        }
    });

    onValue(ref(db, `mysteryBox/${partnerKey}`), (snap) => {
        if (!mysteryPartnerStatus) return;
        mysteryPartnerStatus.textContent = snap.val()
            ? `${partnerName} has opened their surprise too! 🎉`
            : `${partnerName} hasn't opened their surprise yet 🔒`;
    });
}

function resetMysteryBoxUI() {
    if (mysteryReveal) mysteryReveal.classList.add('hidden');
    if (mysteryBoxEl) mysteryBoxEl.classList.remove('opened');
    if (newMysteryBtn) newMysteryBtn.classList.add('hidden');
    if (mysteryStatus) {
        mysteryStatus.textContent = "Tap the box to open your surprise, whenever you're ready!";
        mysteryStatus.classList.remove('hidden');
    }
}

function showMysteryReveal(giftIndex, animate) {
    const gift = mysteryGifts[giftIndex % mysteryGifts.length];
    if (!gift) return;
    if (mysteryStatus) mysteryStatus.classList.add('hidden');
    if (mysteryBoxEl) mysteryBoxEl.classList.add('opened');
    if (mysteryRevealIcon) mysteryRevealIcon.textContent = gift.icon;
    if (mysteryRevealText) mysteryRevealText.textContent = gift.text;
    if (mysteryRevealTag) {
        mysteryRevealTag.textContent = gift.tag.toUpperCase();
        mysteryRevealTag.className = `quest-tag category-${gift.tag}`;
    }
    if (mysteryReveal) {
        mysteryReveal.classList.remove('hidden');
        if (animate) {
            mysteryReveal.classList.remove('pop-in');
            void mysteryReveal.offsetWidth; // restart animation
            mysteryReveal.classList.add('pop-in');
        }
    }
    if (newMysteryBtn) newMysteryBtn.classList.remove('hidden');
}

function drawMysteryGift(animate) {
    const myKey = currentUser.toLowerCase();
    const boxRef = ref(db, `mysteryBox/${myKey}`);
    const giftIndex = Math.floor(Math.random() * mysteryGifts.length);
    myMysteryOpened = true;
    set(boxRef, { giftIndex, openedAt: Date.now() });
    setTimeout(() => {
        showMysteryReveal(giftIndex, animate);
        createHearts(20, ['🎁', '💖', '✨', '💫', '🌟', '💝', '💌']);
    }, animate ? 500 : 0);
}

function openMysteryBox() {
    if (!db || !currentUser || myMysteryOpened) return;
    const myKey = currentUser.toLowerCase();
    const boxRef = ref(db, `mysteryBox/${myKey}`);

    if (mysteryBoxEl) {
        mysteryBoxEl.classList.add('shaking');
        setTimeout(() => mysteryBoxEl?.classList.remove('shaking'), 600);
    }

    onValue(boxRef, (snap) => {
        if (snap.val()) { showMysteryReveal(snap.val().giftIndex, true); return; }
        drawMysteryGift(true);
    }, { onlyOnce: true });
}

// Explicit "I'm ready for another one" — the only way a new surprise appears.
function requestNewMysteryGift() {
    if (!db || !currentUser) return;
    if (mysteryBoxEl) {
        mysteryBoxEl.classList.add('shaking');
        setTimeout(() => mysteryBoxEl?.classList.remove('shaking'), 600);
    }
    drawMysteryGift(true);
}

mysteryBoxEl?.addEventListener('click', openMysteryBox);
newMysteryBtn?.addEventListener('click', requestNewMysteryGift);

// ── Connection prompts ─────────────────────────────────────────────────────
const connectionPrompts = [
    "If you could relive one day of our relationship, which day would it be and why?",
    "What's one thing about me that surprised you after you truly got to know me?",
    "When do you feel most loved by me? Be specific — give me an example.",
    "What's your biggest dream for us five years from now?",
    "Describe the exact moment you knew I was special to you.",
    "What's something you've always wanted to tell me but never found the right moment?",
    "What's one small thing I do that makes your day better without me realizing it?",
    "If our relationship was a movie, what would the title be right now?",
    "What does 'home' feel like to you — and do I factor into that feeling?",
    "What's one way I've helped you grow as a person since we met?",
    "How do you want me to support you when you're having your worst day?",
    "What's one thing about yourself that you hope I always see clearly?",
    "If you could peek at one moment of our future, what moment would you choose?",
    "What's a dream you'd given up on that you'd love for us to revive together?",
    "What's your favorite thing about the way I laugh?",
    "If I called you right now, what's the first thing you'd want to say?",
    "What's one fear you carry that you've never fully shared with me?",
    "What does forever mean to you — and do you feel it when you're with me?",
    "What's one thing you wish more people knew about our relationship?",
    "If you had to describe our love in three sentences to a stranger, what would you say?"
];

let currentPromptIndex = Math.floor(Math.random() * connectionPrompts.length);

function initPromptDisplay() {
    const el = document.getElementById('prompt-display');
    if (el) el.textContent = connectionPrompts[currentPromptIndex];
}

document.getElementById('next-prompt-btn')?.addEventListener('click', () => {
    currentPromptIndex = (currentPromptIndex + 1) % connectionPrompts.length;
    const el = document.getElementById('prompt-display');
    if (!el) return;
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = connectionPrompts[currentPromptIndex]; el.style.opacity = 1; }, 300);
});

// ── Milestone countdown ────────────────────────────────────────────────────
const RELATIONSHIP_START = new Date(2024, 11, 25); // Dec 25, 2024
let milestoneTimer = null;

function getNextAutoMilestone() {
    const now = new Date();
    const msPerMonth = 30.44 * 86400000;
    const monthsTogether = Math.floor((now - RELATIONSHIP_START) / msPerMonth);
    const nextMonths = monthsTogether + 1;
    const nextDate = new Date(RELATIONSHIP_START.getFullYear(), RELATIONSHIP_START.getMonth() + nextMonths, RELATIONSHIP_START.getDate());
    const isAnniversary = nextMonths % 12 === 0;
    return {
        date: nextDate,
        label: isAnniversary ? `${nextMonths / 12}-Year Anniversary 🎉💖` : `${nextMonths}-Month Anniversary 💖`
    };
}

function refreshMilestoneCountdown(customItems = []) {
    if (milestoneTimer) clearInterval(milestoneTimer);

    const now = new Date();
    const candidates = [getNextAutoMilestone()];
    customItems.forEach(item => {
        if (!item || !item.name || !item.date) return;
        const d = new Date(item.date + 'T00:00:00');
        if (d > now) candidates.push({ date: d, label: item.name });
    });
    candidates.sort((a, b) => a.date - b.date);
    const next = candidates[0];

    const nameEl = document.getElementById('milestone-name');
    if (nameEl) nameEl.textContent = next.label;

    function tick() {
        const diff = next.date - Date.now();
        if (diff <= 0) { refreshMilestoneCountdown(customItems); return; }
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const el = document.getElementById('countdown-display');
        if (el) el.innerHTML = `<span class="days">${days}</span>d <span class="hours">${String(hours).padStart(2,'0')}</span>h <span class="mins">${String(mins).padStart(2,'0')}</span>m`;
    }
    tick();
    milestoneTimer = setInterval(tick, 30000);
}

function startMilestoneCountdown() {
    refreshMilestoneCountdown([]); // Firebase listener will update with real custom data shortly
}

function renderMilestoneList(items) {
    const list = document.getElementById('milestone-list');
    if (!list) return;
    const now = new Date();
    const upcoming = Object.entries(items)
        .map(([key, val]) => ({ key, ...val }))
        .filter(item => item.date && new Date(item.date + 'T00:00:00') > now)
        .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));

    list.innerHTML = '';
    if (!upcoming.length) {
        list.innerHTML = '<div class="milestone-empty">Add your own big days below 💕</div>';
        return;
    }
    upcoming.forEach(item => {
        const div = document.createElement('div');
        div.className = 'milestone-item';
        const d = new Date(item.date + 'T00:00:00');
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        div.innerHTML = `<span class="milestone-item-name">${item.name}</span><span class="milestone-item-date">${dateStr}</span><button class="milestone-delete-btn" title="Remove">×</button>`;
        div.querySelector('.milestone-delete-btn').addEventListener('click', () => remove(ref(db, 'customMilestones/' + item.key)));
        list.appendChild(div);
    });
}

function addMilestone() {
    const nameInput = document.getElementById('milestone-title-input');
    const dateInput = document.getElementById('milestone-date-input');
    const name = nameInput?.value.trim();
    const date = dateInput?.value;
    if (!name || !date || !db) return;
    push(ref(db, 'customMilestones'), { name, date });
    if (nameInput) nameInput.value = '';
    if (dateInput) dateInput.value = '';
}

// ── Utilities ──────────────────────────────────────────────────────────────
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
}

function renderMoodHistory(history) {
    const list = document.getElementById('mood-history-list');
    if (!list) return;
    list.innerHTML = '';
    const countEl = document.getElementById('mood-history-count');
    if (countEl) countEl.textContent = history.length ? `(${history.length})` : '';
    if (!history.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#bbb;font-size:0.8rem;padding:0.5rem;text-align:center;font-style:italic;';
        empty.textContent = 'No mood history yet — tap a mood above!';
        list.appendChild(empty);
        return;
    }
    history.forEach(item => {
        const div = document.createElement('div');
        const isArnold = item.who === 'arnold';
        const isVaraidzo = item.who === 'varaidzo';
        div.className = 'mood-history-item' + (isArnold ? ' mhi-arnold' : isVaraidzo ? ' mhi-varaidzo' : '');
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const whoLabel = isArnold ? '💙 Arnold' : isVaraidzo ? '💖 Varaidzo' : '';
        div.innerHTML = `
            <div class="mhi-left">
                <span class="mhi-who">${whoLabel}</span>
                <span class="mhi-mood">${getMoodEmoji(item.mood)} ${item.mood}</span>
            </div>
            <span class="mhi-time">${date}, ${time}</span>`;
        list.appendChild(div);
    });
}

function getMoodEmoji(mood) {
    const map = { happy: "😊", missing: "💖", tired: "😴", hungry: "🍕", grumpy: "😖", bored: "🎬" };
    return map[mood?.toLowerCase()] || "✨";
}

function renderFirebaseList(listId, items, dbPath) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${item.text}</span><button class="mini-btn">×</button>`;
        div.querySelector('button').onclick = () => remove(ref(db, `${dbPath}/${item.id}`));
        list.appendChild(div);
    });
}

function logout() {
    if (db && (currentUser === 'Arnold' || currentUser === 'Varaidzo')) {
        set(ref(db, 'status/' + currentUser.toLowerCase()), 'offline');
    }
    localStorage.removeItem('current-session-user');
    location.reload();
}

// ── Global event listeners ─────────────────────────────────────────────────
if (loginBtn) loginBtn.addEventListener('click', login);
if (authInput) authInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
if (authPassphraseInput) authPassphraseInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
if (logoutBtn) logoutBtn.addEventListener('click', logout);
document.getElementById('salpha-logout-btn')?.addEventListener('click', logout);
document.getElementById('sos-btn')?.addEventListener('click', sendSOS);
document.getElementById('sos-acknowledge-btn')?.addEventListener('click', acknowledgeSos);
document.getElementById('add-milestone-btn')?.addEventListener('click', addMilestone);
document.getElementById('milestone-title-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMilestone(); });

document.getElementById('add-gratitude-btn')?.addEventListener('click', () => {
    const val = document.getElementById('gratitude-input')?.value.trim();
    if (val) { push(ref(db, 'gratitude'), val); document.getElementById('gratitude-input').value = ''; }
});
document.getElementById('add-bucket-btn')?.addEventListener('click', () => {
    const val = document.getElementById('bucket-input')?.value.trim();
    if (val) { push(ref(db, 'bucketlist'), val); document.getElementById('bucket-input').value = ''; }
});

// ── Game Room ──────────────────────────────────────────────────────────────

document.querySelectorAll('.game-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.game-panel').forEach(p => p.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById('game-' + tab.dataset.game)?.classList.remove('hidden');
    });
});

// ── Tic Tac Toe (synced live across both devices via Firebase) ─────────────
// Board cells use "" for empty rather than null — Firebase Realtime Database
// silently deletes null children, which would collapse the array and break
// index alignment. "" is falsy (same truthiness as null for our checks) but
// is a real stored value, so all 9 slots always round-trip correctly.
let tttBoard = Array(9).fill("");
let tttCurrent = 'X';
let tttResult = "";           // "" while playing, else "X" / "O" / "tie"
let tttScores = { X: 0, O: 0, tie: 0 };

const TTT_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];

function tttName(sym) { return sym === 'X' ? 'Arnold' : 'Varaidzo'; }

// Which symbol *this* device controls — null for anyone who isn't logged in
// as Arnold or Varaidzo (e.g. the Salpha dashboard), so they can spectate
// but never move for either side.
function tttMySymbol() {
    if (currentUser === 'Arnold') return 'X';
    if (currentUser === 'Varaidzo') return 'O';
    return null;
}

function tttComputeWinner(board) {
    for (const [a, b, c] of TTT_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function tttRender() {
    const boardEl = document.getElementById('ttt-board');
    if (!boardEl) return;
    const mySymbol = tttMySymbol();
    const myTurn = !tttResult && mySymbol === tttCurrent;
    boardEl.classList.toggle('waiting', !myTurn);

    boardEl.innerHTML = '';
    tttBoard.forEach((val, i) => {
        const cell = document.createElement('button');
        cell.className = 'ttt-cell' + (val ? ' taken' : '');
        cell.textContent = val === 'X' ? '❌' : val === 'O' ? '⭕' : '';
        cell.setAttribute('aria-label', val ? `${tttName(val)}'s mark` : `Empty cell ${i + 1}`);
        cell.addEventListener('click', () => tttMove(i));
        boardEl.appendChild(cell);
    });

    if (tttResult && tttResult !== 'tie') tttHighlight(tttResult);
}

function tttUpdateStatusText() {
    const statusEl = document.getElementById('ttt-status');
    if (!statusEl) return;
    if (tttResult === 'tie') {
        statusEl.textContent = "It's a tie! 🤝";
    } else if (tttResult) {
        statusEl.textContent = `${tttName(tttResult)} wins! 🎉`;
    } else {
        const mySymbol = tttMySymbol();
        const mark = tttCurrent === 'X' ? '❌' : '⭕';
        statusEl.textContent = mySymbol === tttCurrent
            ? `Your turn (${mark})`
            : `Waiting for ${tttName(tttCurrent)}'s move (${mark})...`;
    }
}

function tttUpdateScoreboard() {
    const scoreArnold = document.getElementById('ttt-score-arnold');
    const scoreVaraidzo = document.getElementById('ttt-score-varaidzo');
    const scoreTie = document.getElementById('ttt-score-tie');
    if (scoreArnold) scoreArnold.textContent = tttScores.X || 0;
    if (scoreVaraidzo) scoreVaraidzo.textContent = tttScores.O || 0;
    if (scoreTie) scoreTie.textContent = tttScores.tie || 0;
}

function tttHighlight(winner) {
    setTimeout(() => {
        const cells = document.querySelectorAll('.ttt-cell');
        for (const [a, b, c] of TTT_LINES) {
            if (tttBoard[a] === winner && tttBoard[b] === winner && tttBoard[c] === winner) {
                [a, b, c].forEach(i => cells[i]?.classList.add('win'));
                break;
            }
        }
    }, 30);
}

// Applies a snapshot received from Firebase — this is the ONLY place local
// tic-tac-toe state changes, so both devices always render the same board.
function tttApplyState(state) {
    const board = Array.isArray(state.board) ? state.board : Object.values(state.board || {});
    tttBoard = Array.from({ length: 9 }, (_, i) => board[i] || "");
    tttCurrent = state.current || 'X';
    tttResult = state.winner || "";
    tttScores = state.scores || { X: 0, O: 0, tie: 0 };

    tttRender();
    tttUpdateStatusText();
    tttUpdateScoreboard();
}

function tttMove(i) {
    if (!db || tttResult || tttBoard[i]) return;
    const mySymbol = tttMySymbol();
    if (!mySymbol || mySymbol !== tttCurrent) return; // not your turn, not a player

    const board = [...tttBoard];
    board[i] = mySymbol;
    const winner = tttComputeWinner(board);
    const isTie = !winner && board.every(Boolean);
    const scores = { ...tttScores };
    if (winner) scores[winner] = (scores[winner] || 0) + 1;
    if (isTie) scores.tie = (scores.tie || 0) + 1;

    set(ref(db, 'ticTacToe'), {
        board,
        current: mySymbol === 'X' ? 'O' : 'X',
        winner: winner || (isTie ? 'tie' : ""),
        scores
    });
}

// Either partner can start a fresh round — scores carry over, only the board clears.
function tttReset() {
    if (!db) return;
    set(ref(db, 'ticTacToe'), { board: Array(9).fill(""), current: 'X', winner: "", scores: tttScores });
}

function initTicTacToeSync() {
    if (!db) return;
    onValue(ref(db, 'ticTacToe'), (snap) => {
        const state = snap.val();
        if (!state) {
            // First-ever load for this couple: one client seeds the shared
            // starting state so there's something for both to sync against.
            if (currentUser === 'Arnold') {
                set(ref(db, 'ticTacToe'), { board: Array(9).fill(""), current: 'X', winner: "", scores: { X: 0, O: 0, tie: 0 } });
            }
            return;
        }
        tttApplyState(state);
    });
}

document.getElementById('ttt-reset')?.addEventListener('click', tttReset);
tttRender();

// ── Memory Cards ───────────────────────────────────────────────────────────
const MEM_EMOJIS = ['💖','💍','🌹','✨','💌','🦋','🍓','🌸'];

let memCards = [], memFlipped = [], memMatches = 0, memMoves = 0, memLocked = false;

function memShuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function memInit() {
    memCards = memShuffle([...MEM_EMOJIS, ...MEM_EMOJIS]).map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
    memFlipped = []; memMatches = 0; memMoves = 0; memLocked = false;
    const movesEl = document.getElementById('mem-moves');
    const matchesEl = document.getElementById('mem-matches');
    const statusEl = document.getElementById('mem-status');
    if (movesEl) movesEl.textContent = 0;
    if (matchesEl) matchesEl.textContent = 0;
    if (statusEl) statusEl.textContent = 'Flip two cards to find a match! 💕';
    memRender();
}

function memRender() {
    const board = document.getElementById('mem-board');
    if (!board) return;
    board.innerHTML = '';
    memCards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'mem-card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
        el.innerHTML = `<div class="mem-card-inner"><div class="mem-card-front">💕</div><div class="mem-card-back">${card.emoji}</div></div>`;
        el.addEventListener('click', () => memFlip(card.id));
        board.appendChild(el);
    });
}

function memFlip(id) {
    if (memLocked) return;
    const card = memCards[id];
    if (!card || card.flipped || card.matched) return;
    card.flipped = true;
    memFlipped.push(id);
    memRender();
    if (memFlipped.length < 2) return;

    memLocked = true;
    memMoves++;
    const movesEl = document.getElementById('mem-moves');
    if (movesEl) movesEl.textContent = memMoves;
    const [a, b] = memFlipped;
    if (memCards[a].emoji === memCards[b].emoji) {
        memCards[a].matched = memCards[b].matched = true;
        memMatches++;
        const matchesEl = document.getElementById('mem-matches');
        if (matchesEl) matchesEl.textContent = memMatches;
        memFlipped = []; memLocked = false;
        if (memMatches === 8) {
            const statusEl = document.getElementById('mem-status');
            if (statusEl) statusEl.textContent = `All pairs found in ${memMoves} moves! 🎉💕`;
        }
        memRender();
    } else {
        setTimeout(() => {
            memCards[a].flipped = memCards[b].flipped = false;
            memFlipped = []; memLocked = false;
            memRender();
        }, 900);
    }
}

document.getElementById('mem-reset')?.addEventListener('click', memInit);
memInit();

// ── Slide Puzzle ───────────────────────────────────────────────────────────
let puzzleTiles = [], puzzleMoves = 0, puzzleWon = false;

function puzzleInit() {
    puzzleTiles = [...Array(15).keys()].map(i => i + 1);
    puzzleTiles.push(0);
    do { puzzleShuffle(); } while (!puzzleSolvable() || puzzleSolved());
    puzzleMoves = 0; puzzleWon = false;
    const movesEl = document.getElementById('puzzle-moves');
    const statusEl = document.getElementById('puzzle-status');
    if (movesEl) movesEl.textContent = 0;
    if (statusEl) statusEl.textContent = 'Slide tiles to arrange 1–15 in order! 🧩';
    puzzleRender();
}

function puzzleShuffle() {
    for (let i = puzzleTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [puzzleTiles[i], puzzleTiles[j]] = [puzzleTiles[j], puzzleTiles[i]];
    }
}

function puzzleSolvable() {
    const arr = puzzleTiles.filter(t => t !== 0);
    let inv = 0;
    for (let i = 0; i < arr.length; i++)
        for (let j = i + 1; j < arr.length; j++)
            if (arr[i] > arr[j]) inv++;
    const blankRowFromBottom = 3 - Math.floor(puzzleTiles.indexOf(0) / 4);
    return (inv + blankRowFromBottom) % 2 === 0;
}

function puzzleSolved() {
    return puzzleTiles.every((v, i) => v === (i === 15 ? 0 : i + 1));
}

function puzzleMove(i) {
    if (puzzleWon) return;
    const empty = puzzleTiles.indexOf(0);
    const r = Math.floor(i / 4), c = i % 4, er = Math.floor(empty / 4), ec = empty % 4;
    if (Math.abs(r - er) + Math.abs(c - ec) !== 1) return;
    [puzzleTiles[i], puzzleTiles[empty]] = [puzzleTiles[empty], puzzleTiles[i]];
    puzzleMoves++;
    const movesEl = document.getElementById('puzzle-moves');
    if (movesEl) movesEl.textContent = puzzleMoves;
    if (puzzleSolved()) {
        puzzleWon = true;
        const statusEl = document.getElementById('puzzle-status');
        if (statusEl) statusEl.textContent = `Solved in ${puzzleMoves} moves! 🎉🧩`;
    }
    puzzleRender();
}

function puzzleRender() {
    const board = document.getElementById('puzzle-board');
    if (!board) return;
    board.innerHTML = '';
    puzzleTiles.forEach((val, i) => {
        const tile = document.createElement('div');
        if (val === 0) {
            tile.className = 'puzzle-tile empty';
        } else {
            tile.className = 'puzzle-tile num' + (puzzleWon ? ' solved' : '');
            tile.textContent = val;
            tile.addEventListener('click', () => puzzleMove(i));
        }
        board.appendChild(tile);
    });
}

document.getElementById('puzzle-reset')?.addEventListener('click', puzzleInit);
puzzleInit();

window.onload = () => {
    checkAuth();
    createHearts();
    ensureQuestReady();
};
