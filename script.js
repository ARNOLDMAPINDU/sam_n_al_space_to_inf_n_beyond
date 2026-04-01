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

const buttons = document.querySelectorAll('.mood-btn');
const messageEl = document.getElementById('arnold-message');
const bodyEl = document.body;
const artFrame = document.getElementById('generated-image');
const heartContainer = document.getElementById('visual-heart-container');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mood = btn.getAttribute('data-mood');
        const data = moodData[mood];

        // Update Message
        messageEl.style.opacity = 0;
        setTimeout(() => {
            messageEl.textContent = data.message;
            messageEl.style.opacity = 1;
        }, 300);

        // Update Theme
        bodyEl.className = data.class;

        // Update "Generated" Image
        artFrame.style.backgroundImage = `url('${data.image}')`;
        artFrame.querySelector('.art-content').innerHTML = `<span>${mood.toUpperCase()} VIBES</span>`;

        // Create Hearts
        createHearts();
    });
});

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

    // Update Message with a sweet template
    messageEl.style.opacity = 0;
    setTimeout(() => {
        messageEl.textContent = `I understand that you're feeling "${customMood}", my love. I'm right here with you, always. ❤️`;
        messageEl.style.opacity = 1;
    }, 300);

    // Update Theme to custom
    bodyEl.className = 'mood-custom';

    // Update Image with a romantic default
    artFrame.style.backgroundImage = "url('https://images.unsplash.com/photo-1516589174184-c68526674fd6?auto=format&fit=crop&w=800&q=80')";
    artFrame.querySelector('.art-content').innerHTML = `<span>${customMood.toUpperCase()} VIBES</span>`;

    // Clear input and trigger hearts
    customMoodInput.value = '';
    createHearts();
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
    
    // Set global currentUser for chat/games
    const firstName = userName.split(' ')[0];
    currentUser = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    
    // Update chat label
    const chatUserLabel = document.getElementById('chat-user-label');
    if(chatUserLabel) chatUserLabel.textContent = `Logged in as: ${currentUser}`;
    if(chatInput) chatInput.placeholder = `Message from ${currentUser}...`;
}

function logout() {
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
    createHearts();
    loadMessages();
    loadDailyQuest();
    updateLevelUI();
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

    displayMessage(messageObj);
    saveMessage(messageObj);
    chatInput.value = '';
    
    // Auto scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displayMessage(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(msg.sender.toLowerCase());
    
    msgDiv.innerHTML = `
        <span class="sender-name">${msg.sender} • ${msg.timestamp}</span>
        <p>${msg.text}</p>
    `;
    
    chatMessages.appendChild(msgDiv);
}

function saveMessage(msg) {
    let messages = JSON.parse(localStorage.getItem('couple-chat') || '[]');
    messages.push(msg);
    localStorage.setItem('couple-chat', JSON.stringify(messages));
}

function loadMessages() {
    let messages = JSON.parse(localStorage.getItem('couple-chat') || '[]');
    messages.forEach(displayMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
// Event listener removed

// --- New Growth Features Logic ---

// 1. Connection Prompts
const prompts = [
    "What is a memory of us that always makes you smile?",
    "What is one way I can support your goals this week?",
    "What's the best piece of advice you've ever received?",
    "If we could travel anywhere tomorrow, where would we go?",
    "What's a new hobby you'd like us to try together?",
    "What is your favorite thing about our relationship?",
    "How have you grown the most in the last year?",
    "What does a perfect day look like for you?"
];

const promptDisplay = document.getElementById('prompt-display');
const nextPromptBtn = document.getElementById('next-prompt-btn');

nextPromptBtn.addEventListener('click', () => {
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    promptDisplay.style.opacity = 0;
    setTimeout(() => {
        promptDisplay.textContent = randomPrompt;
        promptDisplay.style.opacity = 1;
    }, 300);
});

// 2. Milestones & Countdown
const milestones = [
    { name: "Our Next Big Date", date: new Date("2026-04-15T18:00:00") },
    { name: "Varaidzo's Birthday", date: new Date("2026-06-20T00:00:00") },
    { name: "Our Anniversary", date: new Date("2026-11-01T00:00:00") }
];

function updateCountdown() {
    const now = new Date();
    // Find the next upcoming milestone
    const nextMilestone = milestones.find(m => m.date > now) || milestones[0];
    
    const diff = nextMilestone.date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    document.querySelector('.days').textContent = days.toString().padStart(2, '0');
    document.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('milestone-name').textContent = `Until ${nextMilestone.name}`;
}

setInterval(updateCountdown, 1000 * 60 * 60); // Update every hour
updateCountdown();

// 3. Gratitude Jar & 4. Bucket List
function setupList(inputId, btnId, listId, storageKey) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    const list = document.getElementById(listId);

    const loadItems = () => {
        const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        list.innerHTML = '';
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = `
                <span>${item}</span>
                <button class="mini-btn" onclick="removeItem('${storageKey}', ${index}, '${listId}')">x</button>
            `;
            list.appendChild(itemDiv);
        });
    };

    btn.addEventListener('click', () => {
        const text = input.value.trim();
        if (text) {
            const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
            items.push(text);
            localStorage.setItem(storageKey, JSON.stringify(items));
            input.value = '';
            loadItems();
        }
    });

    loadItems();
}

// Global remove item function for the buttons
window.removeItem = (key, index, listId) => {
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(items));
    // Reload only the affected list
    if(listId === 'gratitude-list') setupList('gratitude-input', 'add-gratitude-btn', 'gratitude-list', 'gratitude-jar');
    else setupList('bucket-input', 'add-bucket-btn', 'bucket-list', 'bucket-list-storage');
};

setupList('gratitude-input', 'add-gratitude-btn', 'gratitude-list', 'gratitude-jar');
setupList('bucket-input', 'add-bucket-btn', 'bucket-list', 'bucket-list-storage');

// --- Play & Games Logic ---

// 1. Daily Quests
const dailyQuests = [
    { title: "Our Signature Catchphrase", desc: "One of you say 'To Infinity' and the other must respond 'and Beyond!' in the chat." },
    { title: "Compliment Champion", desc: "Give each other 3 genuine compliments today." },
    { title: "Memory Lane", desc: "Share your favorite photo of us and explain why you love it." },
    { title: "Dreamer Duo", desc: "Tell each other one dream you have for our future together." },
    { title: "Kindness Kickstart", desc: "Do one small 'secret' favor for the other person today." },
    { title: "Tech-Free Time", desc: "Spend 20 minutes talking without any phones or distractions." },
    { title: "Laughter Lesson", desc: "Find a funny video or meme and share a laugh together." }
];

let questState = JSON.parse(localStorage.getItem('quest-state') || '{"date": "", "varaidzo": false, "arnold": false, "index": 0}');

function loadDailyQuest() {
    const today = new Date().toDateString();

    // If it's a new day, reset quest
    if (questState.date !== today) {
        questState = {
            date: today,
            varaidzo: false,
            arnold: false,
            index: Math.floor(Math.random() * dailyQuests.length)
        };
        saveQuestState();
    }

    const quest = dailyQuests[questState.index];
    document.getElementById('quest-title').textContent = quest.title;
    document.getElementById('quest-desc').textContent = quest.desc;

    updateQuestButtons();
}

function updateQuestButtons() {
    const vBtn = document.getElementById('check-varaidzo');
    const aBtn = document.getElementById('check-arnold');

    if (questState.varaidzo) vBtn.classList.add('completed'); else vBtn.classList.remove('completed');
    if (questState.arnold) aBtn.classList.add('completed'); else aBtn.classList.remove('completed');

    if (questState.varaidzo && questState.arnold) {
        handleQuestCompletion();
    }
}

function handleQuestCompletion() {
    // Only level up once per day
    const lastLeveled = localStorage.getItem('last-level-up');
    const today = new Date().toDateString();

    if (lastLeveled !== today) {
        addExperience(50);
        localStorage.setItem('last-level-up', today);
        createHearts(); // Celebration!
    }
}

document.getElementById('check-varaidzo').addEventListener('click', () => {
    questState.varaidzo = !questState.varaidzo;
    saveQuestState();
    updateQuestButtons();
});

document.getElementById('check-arnold').addEventListener('click', () => {
    questState.arnold = !questState.arnold;
    saveQuestState();
    updateQuestButtons();
});

function saveQuestState() {
    localStorage.setItem('quest-state', JSON.stringify(questState));
}

// 2. Level & Progress Logic
let loveLevelData = JSON.parse(localStorage.getItem('love-level-data') || '{"level": 1, "exp": 0}');

function addExperience(amt) {
    loveLevelData.exp += amt;
    if (loveLevelData.exp >= 100) {
        loveLevelData.level++;
        loveLevelData.exp = 0;
        alert(`🎉 You leveled up! You are now Level ${loveLevelData.level}!`);
    }
    saveLevelData();
    updateLevelUI();
}

function updateLevelUI() {
    const levelEl = document.getElementById('love-level');
    const progressEl = document.getElementById('love-progress');
    if(levelEl) levelEl.textContent = loveLevelData.level;
    if(progressEl) progressEl.style.width = loveLevelData.exp + '%';
}

function saveLevelData() {
    localStorage.setItem('love-level-data', JSON.stringify(loveLevelData));
}

// 3. Sync Heart Mini-game
let syncState = { arnold: false, varaidzo: false };
const syncBtn = document.getElementById('sync-heart-btn');
const syncStatus = document.getElementById('sync-status');

if (syncBtn) {
    syncBtn.addEventListener('click', () => {
        if (currentUser.toLowerCase().includes('arnold')) syncState.arnold = true;
        if (currentUser.toLowerCase().includes('varaidzo') || currentUser.toLowerCase().includes('samantha')) syncState.varaidzo = true;

        if (syncState.arnold && syncState.varaidzo) {
            syncStatus.innerHTML = "<span style='color: #ff4081; font-weight: 800; font-size: 1.2rem;'>...AND BEYOND! ✨🚀</span>";
            syncBtn.classList.add('synced');
            addExperience(15);
            createHearts();

            // Reset after 4 seconds
            setTimeout(() => {
                syncState = { arnold: false, varaidzo: false };
                syncStatus.textContent = "Waiting for Arnold & Varaidzo...";
                syncBtn.classList.remove('synced');
            }, 4000);
        } else {
            syncStatus.innerHTML = "<span style='color: #ff4081; font-weight: 600;'>TO INFINITY...</span><br><small>Waiting for " + (syncState.arnold ? 'Varaidzo' : 'Arnold') + " to go beyond!</small>";
        }
    });
}
