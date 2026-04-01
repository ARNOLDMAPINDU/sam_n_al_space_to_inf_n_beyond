// 1. MODULE IMPORTS (Must be at the top)
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, limitToLast, onChildAdded, remove, onDisconnect, query } from "firebase/database";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

// Global User State
let currentUser = "";
let partnerName = "";

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

    // Firebase Sync (Push My Mood)
    set(ref(db, 'moods/' + currentUser.toLowerCase()), {
        mood: isCustom ? customText : mood,
        moodClass: data.class,
        timestamp: Date.now()
    });

    // Also update UI for myself immediately
    applyMoodUI(data, isCustom ? customText : mood);
}

function applyMoodUI(data, label) {
    if (!data || !messageEl) return;
    messageEl.style.opacity = 0;
    setTimeout(() => {
        messageEl.textContent = data.message;
        messageEl.style.opacity = 1;
    }, 300);
    if (bodyEl) bodyEl.className = data.class || 'mood-default';
    if (artFrame) {
        artFrame.style.backgroundImage = `url('${data.image}')`;
        const content = artFrame.querySelector('.art-content');
        if (content) content.innerHTML = `<span>${(label || "").toUpperCase()} VIBES</span>`;
    }
    createHearts();
}

function createHearts() {
    if (!heartContainer) return;
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            heart.innerHTML = '❤️';
            heart.style.left = Math.random() * 100 + 'vw';
            heart.style.fontSize = (Math.random() * 20 + 20) + 'px';
            heart.style.animationDuration = (Math.random() * 2 + 3) + 's';
            heartContainer.appendChild(heart);
            setTimeout(() => heart.remove(), 5000);
        }, i * 200);
    }
}

// Custom Mood Input
const customMoodInput = document.getElementById('custom-mood-input');
const customMoodBtn = document.getElementById('custom-mood-btn');
if (customMoodBtn) {
    customMoodBtn.addEventListener('click', () => {
        const val = customMoodInput.value.trim();
        if (val) {
            updateMyMood(null, true, val);
            customMoodInput.value = '';
        }
    });
}

// --- Auth Logic ---
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
    if (sessionUser) {
        showApp(sessionUser);
    }
}

function login() {
    const input = authInput.value.trim().toLowerCase();
    if (validUsers.includes(input)) {
        const formattedName = input.charAt(0).toUpperCase() + input.slice(1);
        localStorage.setItem('current-session-user', formattedName);
        showApp(formattedName);
        createHearts();
    } else {
        authError.textContent = "Only Arnold or Varaidzo can enter this heart. ❤️";
    }
}

function showApp(userName) {
    if (authOverlay) authOverlay.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    if (loggedUserDisplay) loggedUserDisplay.textContent = userName;
    
    const lowName = userName.toLowerCase();
    currentUser = lowName.includes('arnold') ? "Arnold" : "Varaidzo";
    partnerName = (currentUser === "Arnold") ? "Varaidzo" : "Arnold";

    setupSync();
    
    const chatLabel = document.getElementById('chat-user-label');
    if(chatLabel) chatLabel.textContent = `Logged in as: ${currentUser}`;
}

function setupSync() {
    // 1. Connection Heartbeat
    const connectedRef = ref(db, '.info/connected');
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            if(syncIndicator) {
                syncIndicator.textContent = "Connected ❤️";
                syncIndicator.className = "sync-indicator online";
            }
            const statusRef = ref(db, 'status/' + currentUser.toLowerCase());
            onDisconnect(statusRef).set('offline');
            set(statusRef, 'online');
        } else {
            if(syncIndicator) {
                syncIndicator.textContent = "Connecting...";
                syncIndicator.className = "sync-indicator error";
            }
        }
    });

    // 2. Partner Status Listener
    onValue(ref(db, 'status/' + partnerName.toLowerCase()), (snap) => {
        const status = snap.val() || 'offline';
        const el = document.getElementById('partner-status');
        if (el) {
            el.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            el.className = status === 'online' ? '' : 'offline';
        }
    });

    // 3. Global Mood & Theme Sync
    onValue(ref(db, 'moods'), (snap) => {
        const moods = snap.val();
        if (!moods) return;

        const arnold = moods.arnold;
        const varaidzo = moods.varaidzo;
        
        // Use whichever mood was updated LAST
        const latest = (!arnold) ? varaidzo : (!varaidzo) ? arnold :
                       (arnold.timestamp > varaidzo.timestamp) ? arnold : varaidzo;

        if (latest && bodyEl) {
            bodyEl.className = latest.moodClass || 'mood-default';
        }

        // Partner notification if it's new (last 10 seconds)
        const partnerData = moods[partnerName.toLowerCase()];
        if (partnerData && (Date.now() - partnerData.timestamp < 10000)) {
            const alertEl = document.getElementById('partner-mood-alert');
            const textEl = document.getElementById('partner-mood-text');
            const nameEl = document.getElementById('partner-name-label');
            if (alertEl && textEl) {
                if(nameEl) nameEl.textContent = partnerName;
                textEl.textContent = partnerData.mood;
                alertEl.classList.remove('hidden');
                setTimeout(() => alertEl.classList.add('hidden'), 8000);
            }
        }
    });

    // 4. Chat Listener
    const chatRef = query(ref(db, 'chat'), limitToLast(50));
    onChildAdded(chatRef, (snap) => {
        displayMessage(snap.val());
    });

    // 5. Shared Lists & Quests
    onValue(ref(db, 'quests'), (snap) => {
        const state = snap.val();
        if (state) {
            questState = state;
            updateQuestUI();
        }
    });

    onValue(ref(db, 'gratitude'), (snap) => {
        const items = [];
        snap.forEach(child => { items.push({ id: child.key, text: child.val() }); });
        renderFirebaseList('gratitude-list', items, 'gratitude');
    });

    onValue(ref(db, 'bucketlist'), (snap) => {
        const items = [];
        snap.forEach(child => { items.push({ id: child.key, text: child.val() }); });
        renderFirebaseList('bucket-list', items, 'bucketlist');
    });
}

function logout() {
    set(ref(db, 'status/' + currentUser.toLowerCase()), 'offline');
    localStorage.removeItem('current-session-user');
    location.reload();
}

if (loginBtn) loginBtn.addEventListener('click', login);
if (authInput) authInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// Initial Execution
window.onload = () => {
    checkAuth();
    createHearts();
    loadDailyQuest();
};

// --- Chat Logic ---
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function sendMessage() {
    const text = chatInput.value.trim();
    if (text === '') return;

    const messageObj = {
        sender: currentUser,
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    push(ref(db, 'chat'), messageObj);
    chatInput.value = '';
}

function displayMessage(msg) {
    if (!chatMessages) return;
    const existing = Array.from(chatMessages.children).some(m => 
        m.querySelector('p')?.textContent === msg.text && 
        m.querySelector('.sender-name')?.textContent.includes(msg.sender)
    );
    if (existing) return;

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(msg.sender === "Arnold" ? 'arnold' : 'varaidzo');
    msgDiv.innerHTML = `<span class="sender-name">${msg.sender} • ${msg.timestamp}</span><p>${msg.text}</p>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (sendBtn) sendBtn.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// --- List Helper ---
function renderFirebaseList(listId, items, dbPath) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    items.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.innerHTML = `<span>${item.text}</span><button class="mini-btn">x</button>`;
        itemDiv.querySelector('button').onclick = () => remove(ref(db, `${dbPath}/${item.id}`));
        list.appendChild(itemDiv);
    });
}

// --- Quest Logic ---
const dailyQuests = [
    { title: "Our Signature Catchphrase", desc: "One of you say 'To Infinity' and the other must respond 'and Beyond!' in the chat." },
    { title: "Compliment Champion", desc: "Give each other 3 genuine compliments today." },
    { title: "Memory Lane", desc: "Share your favorite photo of us and explain why you love it." }
];
let questState = { date: "", varaidzo: false, arnold: false, index: 0 };

function loadDailyQuest() {
    const today = new Date().toDateString();
    if (questState.date !== today && currentUser === "Arnold") {
        set(ref(db, 'quests'), { date: today, varaidzo: false, arnold: false, index: Math.floor(Math.random() * dailyQuests.length) });
    }
}

function updateQuestUI() {
    const quest = dailyQuests[questState.index];
    const t = document.getElementById('quest-title');
    const d = document.getElementById('quest-desc');
    if (t) t.textContent = quest.title;
    if (d) d.textContent = quest.desc;
    updateQuestButtons();
}

function updateQuestButtons() {
    const vBtn = document.getElementById('check-varaidzo');
    const aBtn = document.getElementById('check-arnold');
    if (!vBtn || !aBtn) return;
    vBtn.className = 'quest-check-btn' + (questState.varaidzo ? ' completed' : '');
    aBtn.className = 'quest-check-btn' + (questState.arnold ? ' completed' : '');
}

document.getElementById('check-varaidzo')?.addEventListener('click', () => {
    if (currentUser === "Varaidzo") set(ref(db, 'quests/varaidzo'), !questState.varaidzo);
});

document.getElementById('check-arnold')?.addEventListener('click', () => {
    if (currentUser === "Arnold") set(ref(db, 'quests/arnold'), !questState.arnold);
});

// --- Sync Heart ---
const syncBtn = document.getElementById('sync-heart-btn');
const syncStatus = document.getElementById('sync-status');
if (syncBtn) {
    syncBtn.addEventListener('click', () => {
        const myKey = currentUser.toLowerCase() === 'arnold' ? 'arnold' : 'varaidzo';
        set(ref(db, 'sync/' + myKey), true);
        
        onValue(ref(db, 'sync'), (snap) => {
            const sync = snap.val();
            if (sync && sync.arnold && sync.varaidzo) {
                if(syncStatus) syncStatus.innerHTML = "<span style='color: #ff4081; font-weight: 800;'>...AND BEYOND! ✨🚀</span>";
                syncBtn.classList.add('synced');
                createHearts();
                setTimeout(() => {
                    set(ref(db, 'sync'), { arnold: false, varaidzo: false });
                    syncBtn.classList.remove('synced');
                    if(syncStatus) syncStatus.textContent = "Waiting for Arnold & Varaidzo...";
                }, 4000);
            } else {
                if(syncStatus) syncStatus.innerHTML = "<span style='color: #ff4081; font-weight: 600;'>TO INFINITY...</span>";
            }
        }, { onlyOnce: true });
    });
}

// Add Item Handlers
document.getElementById('add-gratitude-btn')?.addEventListener('click', () => {
    const val = document.getElementById('gratitude-input')?.value.trim();
    if (val) { push(ref(db, 'gratitude'), val); document.getElementById('gratitude-input').value = ''; }
});
document.getElementById('add-bucket-btn')?.addEventListener('click', () => {
    const val = document.getElementById('bucket-input')?.value.trim();
    if (val) { push(ref(db, 'bucketlist'), val); document.getElementById('bucket-input').value = ''; }
});
