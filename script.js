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
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database();
}

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

const buttons = document.querySelectorAll('.mood-selector .mood-btn');
const messageEl = document.getElementById('arnold-message');
const bodyEl = document.body;
const artFrame = document.getElementById('generated-image');
const heartContainer = document.getElementById('visual-heart-container');

// Global User State
let currentUser = "";
let partnerName = "";

buttons.forEach(btn => {
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

    if (!data) return; // Safety guard

    // Local UI update
    applyMoodUI(data, isCustom ? customText : mood);

    // Firebase Sync
    if (db && currentUser) {
        db.ref('moods/' + currentUser.toLowerCase()).set({
            mood: isCustom ? customText : mood,
            timestamp: Date.now()
        });
    }
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
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            heart.innerHTML = '❤️';
            heart.style.left = Math.random() * 100 + 'vw';
            heart.style.fontSize = (Math.random() * 20 + 20) + 'px';
            heart.style.animationDuration = (Math.random() * 2 + 3) + 's';
            heartContainer.appendChild(heart);

            setTimeout(() => {
                heart.remove();
            }, 5000);
        }, i * 200);
    }
}

const customMoodInput = document.getElementById('custom-mood-input');
const customMoodBtn = document.getElementById('custom-mood-btn');

customMoodBtn.addEventListener('click', () => {
    const customMood = customMoodInput.value.trim();
    if (customMood === '') return;
    updateMyMood(null, true, customMood);
    customMoodInput.value = '';
});

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
        authInput.style.borderColor = "#ff4081";
    }
}

function showApp(userName) {
    authOverlay.classList.add('hidden');
    mainApp.classList.remove('hidden');
    loggedUserDisplay.textContent = userName;
    
    const firstName = userName.split(' ')[0];
    currentUser = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    partnerName = (currentUser.toLowerCase().includes('arnold')) ? "Varaidzo" : "Arnold";

    // Setup real-time listeners
    if (db) {
        setupSync();
    }
    
    const chatUserLabel = document.getElementById('chat-user-label');
    if(chatUserLabel) chatUserLabel.textContent = `Logged in as: ${currentUser}`;
    if(chatInput) chatInput.placeholder = `Message from ${currentUser}...`;
}

function setupSync() {
    // 1. Presence System
    const myStatusRef = db.ref('status/' + currentUser.toLowerCase());
    const partnerStatusRef = db.ref('status/' + partnerName.toLowerCase());
    
    db.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            myStatusRef.onDisconnect().set('offline');
            myStatusRef.set('online');
        }
    });

    partnerStatusRef.on('value', (snap) => {
        const status = snap.val() || 'offline';
        const el = document.getElementById('partner-status');
        el.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        el.className = status === 'online' ? '' : 'offline';
    });

    // 2. Mood Sync
    db.ref('moods/' + partnerName.toLowerCase()).on('value', (snap) => {
        const data = snap.val();
        if (data) {
            const alertEl = document.getElementById('partner-mood-alert');
            const textEl = document.getElementById('partner-mood-text');
            const labelEl = document.getElementById('partner-name-label');
            
            labelEl.textContent = partnerName;
            textEl.textContent = data.mood;
            alertEl.classList.remove('hidden');
            
            // Auto-hide after 10 seconds
            setTimeout(() => alertEl.classList.add('hidden'), 10000);
        }
    });

    // 3. Chat Sync
    db.ref('chat').limitToLast(50).on('child_added', (snap) => {
        const msg = snap.val();
        displayMessage(msg);
    });

    // 4. Quest & Activities Sync
    db.ref('quests').on('value', (snap) => {
        const state = snap.val();
        if (state) {
            questState = state;
            updateQuestButtons();
        }
    });

    db.ref('gratitude').on('value', (snap) => {
        const items = [];
        snap.forEach(child => { items.push({ id: child.key, text: child.val() }); });
        renderFirebaseList('gratitude-list', items, 'gratitude');
    });

    db.ref('bucketlist').on('value', (snap) => {
        const items = [];
        snap.forEach(child => { items.push({ id: child.key, text: child.val() }); });
        renderFirebaseList('bucket-list', items, 'bucketlist');
    });

    db.ref('love-stats').on('value', (snap) => {
        if (snap.val()) {
            loveLevelData = snap.val();
            updateLevelUI();
        }
    });
}

function logout() {
    if (db) db.ref('status/' + currentUser.toLowerCase()).set('offline');
    localStorage.removeItem('current-session-user');
    location.reload();
}

loginBtn.addEventListener('click', login);
authInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
logoutBtn.addEventListener('click', logout);

// Initial Animation
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
    if (text === '' || !db) return;

    const messageObj = {
        sender: currentUser,
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    db.ref('chat').push(messageObj);
    chatInput.value = '';
}

function displayMessage(msg) {
    // Check if message already displayed
    const existing = Array.from(chatMessages.children).some(m => 
        m.querySelector('p')?.textContent === msg.text && 
        m.querySelector('.sender-name')?.textContent.includes(msg.sender)
    );
    if (existing) return;

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(msg.sender.toLowerCase().includes('arnold') ? 'arnold' : 'varaidzo');
    
    msgDiv.innerHTML = `
        <span class="sender-name">${msg.sender} • ${msg.timestamp}</span>
        <p>${msg.text}</p>
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// --- Real-time Activity Helpers ---
function renderFirebaseList(listId, items, dbPath) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    items.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.innerHTML = `
            <span>${item.text}</span>
            <button class="mini-btn" onclick="removeFirebaseItem('${dbPath}', '${item.id}')">x</button>
        `;
        list.appendChild(itemDiv);
    });
}

window.removeFirebaseItem = (path, id) => {
    if (db) db.ref(path).child(id).remove();
};

const gratitudeInput = document.getElementById('gratitude-input');
document.getElementById('add-gratitude-btn').addEventListener('click', () => {
    const text = gratitudeInput.value.trim();
    if (text && db) {
        db.ref('gratitude').push(text);
        gratitudeInput.value = '';
    }
});

const bucketInput = document.getElementById('bucket-input');
document.getElementById('add-bucket-btn').addEventListener('click', () => {
    const text = bucketInput.value.trim();
    if (text && db) {
        db.ref('bucketlist').push(text);
        bucketInput.value = '';
    }
});

// --- Quest & Games Logic (Synced) ---
const dailyQuests = [
    { title: "Our Signature Catchphrase", desc: "One of you say 'To Infinity' and the other must respond 'and Beyond!' in the chat." },
    { title: "Compliment Champion", desc: "Give each other 3 genuine compliments today." },
    { title: "Memory Lane", desc: "Share your favorite photo of us and explain why you love it." },
    { title: "Dreamer Duo", desc: "Tell each other one dream you have for our future together." },
    { title: "Kindness Kickstart", desc: "Do one small 'secret' favor for the other person today." },
    { title: "Tech-Free Time", desc: "Spend 20 minutes talking without any phones or distractions." },
    { title: "Laughter Lesson", desc: "Find a funny video or meme and share a laugh together." }
];

let questState = { date: "", varaidzo: false, arnold: false, index: 0 };

function loadDailyQuest() {
    const today = new Date().toDateString();
    if (db && questState.date !== today && currentUser.toLowerCase() === "arnold") {
        const newState = {
            date: today,
            varaidzo: false,
            arnold: false,
            index: Math.floor(Math.random() * dailyQuests.length)
        };
        db.ref('quests').set(newState);
    }
    updateQuestUI();
}

function updateQuestUI() {
    const quest = dailyQuests[questState.index];
    if (document.getElementById('quest-title')) document.getElementById('quest-title').textContent = quest.title;
    if (document.getElementById('quest-desc')) document.getElementById('quest-desc').textContent = quest.desc;
    updateQuestButtons();
}

function updateQuestButtons() {
    const vBtn = document.getElementById('check-varaidzo');
    const aBtn = document.getElementById('check-arnold');
    if (!vBtn || !aBtn) return;
    if (questState.varaidzo) vBtn.classList.add('completed'); else vBtn.classList.remove('completed');
    if (questState.arnold) aBtn.classList.add('completed'); else aBtn.classList.remove('completed');
}

if (document.getElementById('check-varaidzo')) {
    document.getElementById('check-varaidzo').addEventListener('click', () => {
        if (db && (currentUser.toLowerCase().includes('varaidzo') || currentUser.toLowerCase().includes('samantha'))) {
            db.ref('quests/varaidzo').set(!questState.varaidzo);
        }
    });
}

if (document.getElementById('check-arnold')) {
    document.getElementById('check-arnold').addEventListener('click', () => {
        if (db && currentUser.toLowerCase().includes('arnold')) {
            db.ref('quests/arnold').set(!questState.arnold);
        }
    });
}

// Level & Progress (Synced)
let loveLevelData = { level: 1, exp: 0 };
function addExperience(amt) {
    loveLevelData.exp += amt;
    if (loveLevelData.exp >= 100) {
        loveLevelData.level++;
        loveLevelData.exp = 0;
    }
    if (db) db.ref('love-stats').set(loveLevelData);
}

function updateLevelUI() {
    const levelEl = document.getElementById('love-level');
    const progressEl = document.getElementById('love-progress');
    if(levelEl) levelEl.textContent = loveLevelData.level;
    if(progressEl) progressEl.style.width = loveLevelData.exp + '%';
}

// Sync Heart (Real-time)
const syncBtn = document.getElementById('sync-heart-btn');
const syncStatus = document.getElementById('sync-status');

if (syncBtn) {
    syncBtn.addEventListener('click', () => {
        const myKey = currentUser.toLowerCase().includes('arnold') ? 'arnold' : 'varaidzo';
        db.ref('sync/' + myKey).set(true);
        
        db.ref('sync').once('value', (snap) => {
            const sync = snap.val();
            if (sync && sync.arnold && sync.varaidzo) {
                syncStatus.innerHTML = "<span style='color: #ff4081; font-weight: 800;'>...AND BEYOND! ✨🚀</span>";
                syncBtn.classList.add('synced');
                addExperience(15);
                createHearts();
                setTimeout(() => {
                    db.ref('sync').set({ arnold: false, varaidzo: false });
                    syncBtn.classList.remove('synced');
                    syncStatus.textContent = "Waiting for Arnold & Varaidzo...";
                }, 4000);
            } else {
                syncStatus.innerHTML = "<span style='color: #ff4081; font-weight: 600;'>TO INFINITY...</span>";
            }
        });
    });
}

