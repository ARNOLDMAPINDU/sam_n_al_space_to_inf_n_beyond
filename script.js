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
const authOverlay = document.getElementById('auth-overlay');
const mainApp = document.getElementById('main-app');
const authInput = document.getElementById('auth-name-input');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const loggedUserDisplay = document.getElementById('logged-user-display');
const logoutBtn = document.getElementById('logout-btn');

function checkAuth() {
    const sessionUser = localStorage.getItem('current-session-user');
    if (sessionUser) showApp(sessionUser);
}

function login() {
    const input = authInput?.value.trim().toLowerCase();
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

    const chatLabel = document.getElementById('chat-user-label');
    if (chatLabel) chatLabel.textContent = `Logged in as: ${currentUser}`;
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

    // 7. Mood history
    const historyRef = query(ref(db, 'moodHistory/' + partnerName.toLowerCase()), limitToLast(10));
    onValue(historyRef, (snap) => {
        const history = [];
        snap.forEach(child => history.push(child.val()));
        renderMoodHistory(history.reverse());
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

    push(ref(db, 'chat'), { sender: currentUser, text, sentAt: Date.now() })
        .then(() => { if (inputEl) inputEl.value = ''; })
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

    const timeStr = formatMessageTime(msg.sentAt) || msg.timestamp || '';
    let html = `<span class="sender-name">${msg.sender} • ${timeStr}</span>`;

    if (msg.mediaUrl) {
        if (msg.mediaType?.startsWith('image/')) {
            html += `<img src="${msg.mediaUrl}" class="media-content" onclick="window.open('${msg.mediaUrl}','_blank')">`;
        } else if (msg.mediaType?.startsWith('video/')) {
            html += `<video src="${msg.mediaUrl}" class="media-content" controls></video>`;
        }
    }
    if (msg.text) html += `<p>${msg.text}</p>`;

    msgDiv.innerHTML = html;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

document.getElementById('send-btn')?.addEventListener('click', sendMessage);
document.getElementById('chat-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

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
                await push(ref(db, 'chat'), {
                    sender: currentUser,
                    text: "",
                    mediaUrl: downloadUrl,
                    mediaType: file.type,
                    sentAt: Date.now()
                });
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

let questState = { date: "", varaidzo: false, arnold: false, index: 0 };

function loadDailyQuest() {
    const today = new Date().toDateString();
    if (!db || currentUser !== "Arnold") return;
    onValue(ref(db, 'quests'), (snap) => {
        const state = snap.val();
        if (!state || state.date !== today) {
            set(ref(db, 'quests'), {
                date: today,
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

    // Log completed quests for level calculation
    if (both && questState.date) {
        const safeDate = questState.date.replace(/\s/g, '_');
        set(ref(db, `questLog/${safeDate}`), true);
    }

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
// Update RELATIONSHIP_START to your actual start date (year, month-1, day):
const RELATIONSHIP_START = new Date(2024, 11, 25); // Dec 25, 2024

function getNextMilestone() {
    const now = new Date();
    const msPerMonth = 30.44 * 86400000;
    const monthsTogether = Math.floor((now - RELATIONSHIP_START) / msPerMonth);
    // Find the next full month milestone
    let nextMonths = monthsTogether + 1;
    const nextDate = new Date(RELATIONSHIP_START.getFullYear(), RELATIONSHIP_START.getMonth() + nextMonths, RELATIONSHIP_START.getDate());
    const isAnniversary = nextMonths % 12 === 0;
    const label = isAnniversary
        ? `${nextMonths / 12}-Year Anniversary 🎉💖`
        : `${nextMonths}-Month Anniversary 💖`;
    return { date: nextDate, label };
}

function startMilestoneCountdown() {
    const { date, label } = getNextMilestone();
    const nameEl = document.getElementById('milestone-name');
    if (nameEl) nameEl.textContent = label;

    function tick() {
        const diff = date - Date.now();
        if (diff <= 0) { startMilestoneCountdown(); return; }
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const el = document.getElementById('countdown-display');
        if (el) el.innerHTML = `<span class="days">${days}</span>d <span class="hours">${String(hours).padStart(2,'0')}</span>h <span class="mins">${String(mins).padStart(2,'0')}</span>m`;
    }
    tick();
    setInterval(tick, 30000);
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
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'mood-history-item';
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        div.innerHTML = `<span class="mood-label">${getMoodEmoji(item.mood)} ${item.mood}</span><span class="mood-time">${date}, ${time}</span>`;
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
    if (db) set(ref(db, 'status/' + currentUser.toLowerCase()), 'offline');
    localStorage.removeItem('current-session-user');
    location.reload();
}

// ── Global event listeners ─────────────────────────────────────────────────
if (loginBtn) loginBtn.addEventListener('click', login);
if (authInput) authInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
if (logoutBtn) logoutBtn.addEventListener('click', logout);

document.getElementById('add-gratitude-btn')?.addEventListener('click', () => {
    const val = document.getElementById('gratitude-input')?.value.trim();
    if (val) { push(ref(db, 'gratitude'), val); document.getElementById('gratitude-input').value = ''; }
});
document.getElementById('add-bucket-btn')?.addEventListener('click', () => {
    const val = document.getElementById('bucket-input')?.value.trim();
    if (val) { push(ref(db, 'bucketlist'), val); document.getElementById('bucket-input').value = ''; }
});

window.onload = () => {
    checkAuth();
    createHearts();
    loadDailyQuest();
};
