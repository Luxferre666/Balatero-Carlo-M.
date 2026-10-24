(function () {
  if (document.getElementById("fc-floating-btn")) return;
  // === State Management ===
  const STATE = {
    isOpen: false,
    activeTab: "chat",
    messages: [],
    groups: [
      { id: 1, name: "Team Alpha", members: 5, unread: 2 },
      { id: 2, name: "Project Dev", members: 8, unread: 0 },
      { id: 3, name: "General Chat", members: 24, unread: 5 }
    ],
    media: [
      { id: 1, name: "Project_Brief.pdf", type: "pdf", size: "2.4 MB" },
      { id: 2, name: "Design_Mockup.png", type: "image", size: "1.1 MB" },
      { id: 3, name: "Demo_Video.mp4", type: "video", size: "18 MB" },
      { id: 4, name: "Meeting_Notes.docx", type: "doc", size: "85 KB" }
    ],
    shares: [
      { id: 1, title: "Dashboard Pro", url: "#", time: "2 hours ago" },
      { id: 2, title: "Figma Design Kit", url: "#", time: "1 day ago" },
      { id: 3, title: "API Documentation", url: "#", time: "3 days ago" }
    ],
    passwords: JSON.parse(localStorage.getItem("fc_passwords") || "[]"),
    // === NEW: Game State ===
    game: {
      secretNumber: Math.floor(Math.random() * 100) + 1,
      attempts: 0,
      active: false
    }
  };

  // === Extract YouTube Video ID ===
  function getYouTubeId(url) {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  // === Link Detection & Formatting — WITH PREVIEWS ===
  function linkify(text) {
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<>"]+[^\s.,;:!?)>])/gi;
    return escaped.replace(urlRegex, (url) => {
      const href = url.toLowerCase().startsWith("www.") ? "http://" + url : url;
      // 1. YouTube Preview
      const ytId = getYouTubeId(href);
      if (ytId) {
        return `
          <div class="fc-link-preview fc-youtube-preview">
            <a href="${href}" target="_blank" rel="noopener noreferrer">
              <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="YouTube Preview" loading="lazy" />
              <div class="fc-play-button">▶</div>
              <div class="fc-preview-info">
                <span class="fc-preview-title">YouTube Video</span>
                <span class="fc-preview-link">${url}</span>
              </div>
            </a>
          </div>
        `;
      }
      // 2. Image Preview
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(href);
      if (isImage) {
        return `
          <div class="fc-link-preview fc-image-preview">
            <a href="${href}" target="_blank" rel="noopener noreferrer">
              <img src="${href}" alt="Image Preview" loading="lazy"
                   onerror="this.parentElement.parentElement.style.display='none'"/>
              <div class="fc-preview-info">
                <span class="fc-preview-title">📷 Image</span>
                <span class="fc-preview-link">${url}</span>
              </div>
            </a>
          </div>
        `;
      }
      // 3. Regular link
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="fc-chat-link">${url}</a>`;
    });
  }

  // === Password Manager Functions ===
  function savePasswordEntry(entry) {
    STATE.passwords.push({ ...entry, id: Date.now() });
    localStorage.setItem("fc_passwords", JSON.stringify(STATE.passwords));
    renderPasswordManager();
  }
  function deletePasswordEntry(id) {
    STATE.passwords = STATE.passwords.filter(p => p.id !== id);
    localStorage.setItem("fc_passwords", JSON.stringify(STATE.passwords));
    renderPasswordManager();
  }
  function renderPasswordManager() {
    const container = document.getElementById("fc-pw-list");
    if (!container) return;
    if (STATE.passwords.length === 0) {
      container.innerHTML = `<p class="fc-empty-state">No saved passwords yet. Add one below.</p>`;
      return;
    }
    container.innerHTML = STATE.passwords.map(p => `
      <div class="fc-pw-card">
        <div class="fc-pw-icon">🔐</div>
        <div class="fc-pw-details">
          <div class="fc-pw-name">${p.name || "Untitled"}</div>
          <div class="fc-pw-url">${p.url || "—"}</div>
          <div class="fc-pw-hidden">••••••••••••</div>
        </div>
        <div class="fc-pw-actions">
          <button class="fc-icon-btn fc-copy-pw" data-pw="${btoa(p.password || "")}" title="Copy">📋</button>
          <button class="fc-icon-btn fc-delete-pw" data-id="${p.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `).join("");
  }

  // === Screenshot Function ===
  async function captureFullPage() {
    try {
      addMessage("📸 Capturing full page screenshot...", "bot");
      if (typeof chrome !== "undefined" && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
          downloadScreenshot(dataUrl);
          addMessage("✅ Screenshot saved!", "bot");
        });
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        downloadScreenshot(dataUrl);
        addMessage("✅ Visible area screenshot saved! (Full page needs extension permissions)", "bot");
      }
    } catch (err) {
      addMessage("❌ Screenshot failed: " + err.message, "bot");
    }
  }
  function downloadScreenshot(dataUrl) {
    const link = document.createElement("a");
    link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    link.href = dataUrl;
    link.click();
  }

  // === NEW: Open Social Media ===
  function openFacebook() {
    window.open("https://www.facebook.com", "_blank");
    addMessage("✅ Opening Facebook... 📘", "bot");
  }
  function openInstagram() {
    window.open("https://www.instagram.com", "_blank");
    addMessage("✅ Opening Instagram... 📷", "bot");
  }

  // === NEW: Number Guessing Game ===
  function startGame() {
    STATE.game.secretNumber = Math.floor(Math.random() * 100) + 1;
    STATE.game.attempts = 0;
    STATE.game.active = true;
    addMessage("🎮 Game Started! I'm thinking of a number between 1 and 100.\nType your guess below! 🔢", "bot");
  }
  function resetGame() {
    STATE.game.secretNumber = Math.floor(Math.random() * 100) + 1;
    STATE.game.attempts = 0;
    STATE.game.active = true;
    addMessage("🔄 New game! Guess a number between 1 and 100!", "bot");
  }
  function checkGuess(inputText) {
    const guess = parseInt(inputText);
    if (isNaN(guess)) return false;
    
    STATE.game.attempts++;
    
    if (guess < STATE.game.secretNumber) {
      addMessage(`📈 ${guess} is TOO LOW! Try higher ⬆️\nAttempts: ${STATE.game.attempts}`, "bot");
    } else if (guess > STATE.game.secretNumber) {
      addMessage(`📉 ${guess} is TOO HIGH! Try lower ⬇️\nAttempts: ${STATE.game.attempts}`, "bot");
    } else {
      addMessage(`🎉 CONGRATULATIONS! You guessed ${guess} correctly! 🎊\nIt took you ${STATE.game.attempts} attempt(s)! 🎯\nType "play" to start a new game!`, "bot");
      STATE.game.active = false;
    }
    return true;
  }

  // === Floating Button ===
  const btn = document.createElement("button");
  btn.id = "fc-floating-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = `
    <span class="fc-btn-outer-ring"></span>
    <span class="fc-btn-inner-ring"></span>
    <span class="fc-btn-icon">💬</span>
    <span class="fc-btn-status-dot"></span>
  `;
  document.body.appendChild(btn);

  // === Chatbox Structure ===
  const chatbox = document.createElement("div");
  chatbox.id = "fc-chatbox";
  chatbox.style.display = "none";
  chatbox.innerHTML = `
    <div class="fc-chat-window">
      <!-- Header -->
      <div class="fc-header">
        <div class="fc-header-left">
          <div class="fc-avatar">⚡</div>
          <div class="fc-header-text">
            <h3>Chat Everywhere</h3>
            <p class="fc-status-indicator">
              <span class="fc-dot"></span>
              <span>Online — Ready</span>
            </p>
          </div>
        </div>
        <button id="fc-close" class="fc-close-btn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <!-- Tabs Navigation -->
      <nav class="fc-tabs-nav">
        <button class="fc-tab-link active" data-tab="chat">
          <span class="fc-tab-icon">💬</span>
          <span class="fc-tab-label">Chat</span>
        </button>
        <button class="fc-tab-link" data-tab="media">
          <span class="fc-tab-icon">📁</span>
          <span class="fc-tab-label">Media</span>
        </button>
        <button class="fc-tab-link" data-tab="groups">
          <span class="fc-tab-icon">👥</span>
          <span class="fc-tab-label">Groups</span>
        </button>
        <button class="fc-tab-link" data-tab="shares">
          <span class="fc-tab-icon">🔗</span>
          <span class="fc-tab-label">Shares</span>
        </button>
        <button class="fc-tab-link" data-tab="tools">
          <span class="fc-tab-icon">⚙️</span>
          <span class="fc-tab-label">Tools</span>
        </button>
      </nav>
      <!-- Tabs Content -->
      <div class="fc-tabs-content">
        <!-- Chat Tab -->
        <section class="fc-tab-panel active" id="fc-panel-chat">
          <div class="fc-messages-area" id="fc-messages">
            <div class="fc-welcome-state">
              <div class="fc-welcome-icon-wrapper">👋</div>
              <h4>Welcome back!</h4>
              <p>Send an image link or YouTube link to see preview!<br>Type "play" to start the Number Guessing Game! 🎮</p>
            </div>
          </div>
          <div class="fc-input-container">
            <button class="fc-attach-btn" title="Attach file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input type="text" id="fc-input" class="fc-input" placeholder="Type message, link, or guess number..." autocomplete="off" />
            <button id="fc-send" class="fc-send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </section>
        <!-- Media Tab -->
        <section class="fc-tab-panel" id="fc-panel-media">
          <div class="fc-panel-scroll">
            <div class="fc-section-header">
              <h4>📎 Shared Media & Files</h4>
              <span class="fc-count-badge">${STATE.media.length}</span>
            </div>
            <div class="fc-media-grid" id="fc-media-list"></div>
          </div>
        </section>
        <!-- Groups Tab -->
        <section class="fc-tab-panel" id="fc-panel-groups">
          <div class="fc-panel-scroll">
            <div class="fc-section-header">
              <h4>👥 Your Groups</h4>
              <span class="fc-count-badge">${STATE.groups.length}</span>
            </div>
            <div class="fc-groups-list" id="fc-groups-list"></div>
            <button class="fc-primary-btn">
              <span>+</span> Create New Group
            </button>
          </div>
        </section>
        <!-- Shares Tab -->
        <section class="fc-tab-panel" id="fc-panel-shares">
          <div class="fc-panel-scroll">
            <div class="fc-section-header">
              <h4>🔗 Shared Links</h4>
              <span class="fc-count-badge">${STATE.shares.length}</span>
            </div>
            <div class="fc-shares-list" id="fc-shares-list"></div>
          </div>
        </section>
        <!-- Tools Tab — UPDATED with Social + Game -->
        <section class="fc-tab-panel" id="fc-panel-tools">
          <div class="fc-panel-scroll">
            <h4>🛠️ Quick Tools</h4>
            
            <!-- Tools Grid -->
            <div class="fc-tools-grid">
              <button class="fc-tool-card" data-action="facebook">
                <div class="fc-tool-icon-wrapper">📘</div>
                <span>Facebook</span>
              </button>
              <button class="fc-tool-card" data-action="instagram">
                <div class="fc-tool-icon-wrapper">📷</div>
                <span>Instagram</span>
              </button>
              <button class="fc-tool-card" data-action="game">
                <div class="fc-tool-icon-wrapper">🎮</div>
                <span>Number Game</span>
              </button>
              <button class="fc-tool-card" data-action="notes">
                <div class="fc-tool-icon-wrapper">📝</div>
                <span>Quick Notes</span>
              </button>
              <button class="fc-tool-card" data-action="remind">
                <div class="fc-tool-icon-wrapper">⏰</div>
                <span>Reminders</span>
              </button>
              <button class="fc-tool-card" data-action="tasks">
                <div class="fc-tool-icon-wrapper">✅</div>
                <span>Task List</span>
              </button>
              <button class="fc-tool-card" data-action="search">
                <div class="fc-tool-icon-wrapper">🔍</div>
                <span>Search</span>
              </button>
              <button class="fc-tool-card" data-action="screenshot" id="fc-screenshot-btn">
                <div class="fc-tool-icon-wrapper">📸</div>
                <span>Screenshot</span>
              </button>
              <button class="fc-tool-card" data-action="passwords" id="fc-pw-toggle">
                <div class="fc-tool-icon-wrapper">🔐</div>
                <span>Passwords</span>
              </button>
            </div>
            
            <!-- Password Manager Section -->
            <div class="fc-pw-section" id="fc-pw-section" style="display: none; margin-top: 20px;">
              <h5 style="margin: 0 0 12px; font-size: 14px; color: var(--text-900);">🔐 Saved Passwords</h5>
              
              <!-- Add New Form -->
              <div class="fc-pw-form">
                <input type="text" id="fc-pw-name" placeholder="Site / Account Name" class="fc-input" style="margin-bottom: 8px;" />
                <input type="url" id="fc-pw-url" placeholder="URL (optional)" class="fc-input" style="margin-bottom: 8px;" />
                <input type="password" id="fc-pw-value" placeholder="Password" class="fc-input" style="margin-bottom: 10px;" />
                <button id="fc-pw-save" class="fc-primary-btn" style="width: 100%;">➕ Save Password</button>
              </div>
              
              <!-- Password List -->
              <div id="fc-pw-list" style="margin-top: 16px;"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(chatbox);

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const toggleBtn = $("#fc-floating-btn");
  const closeBtn = $("#fc-close");
  const sendBtn = $("#fc-send");
  const input = $("#fc-input");
  const messagesArea = $("#fc-messages");
  const tabLinks = $$(".fc-tab-link");

  // === Render Content ===
  function renderMedia() {
    const container = $("#fc-media-list");
    container.innerHTML = STATE.media.map(f => {
      const icon = { image: "🖼️", video: "🎬", pdf: "📕", doc: "📄" }[f.type] || "📄";
      return `
        <div class="fc-media-card">
          <div class="fc-media-icon-bg">${icon}</div>
          <div class="fc-media-meta">
            <div class="fc-media-name">${f.name}</div>
            <div class="fc-media-size">${f.size}</div>
          </div>
        </div>
      `;
    }).join("");
  }
  function renderGroups() {
    const container = $("#fc-groups-list");
    container.innerHTML = STATE.groups.map(g => `
      <div class="fc-group-card">
        <div class="fc-group-avatar">${g.name.charAt(0)}</div>
        <div class="fc-group-info">
          <div class="fc-group-name">${g.name}</div>
          <div class="fc-group-members">${g.members} members</div>
        </div>
        ${g.unread > 0 ? `<span class="fc-unread-badge">${g.unread}</span>` : ""}
      </div>
    `).join("");
  }
  function renderShares() {
    const container = $("#fc-shares-list");
    container.innerHTML = STATE.shares.map(s => `
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="fc-share-card">
        <div class="fc-share-icon-bg">🔗</div>
        <div class="fc-share-meta">
          <div class="fc-share-title">${s.title}</div>
          <div class="fc-share-time">Shared ${s.time}</div>
        </div>
        <svg class="fc-external-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
      </a>
    `).join("");
  }

  // === Chat Functions ===
  function addMessage(text, sender = "user") {
    const welcome = messagesArea.querySelector(".fc-welcome-state");
    if (welcome) welcome.remove();
    const msg = document.createElement("div");
    msg.className = `fc-message fc-${sender}`;
    msg.innerHTML = `
      <div class="fc-bubble">${linkify(text)}</div>
      <div class="fc-message-footer">
        <span class="fc-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        ${sender === "user" ? `
          <span class="fc-status-check">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </span>
        ` : ""}
      </div>
    `;
    messagesArea.appendChild(msg);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    STATE.messages.push({ text, sender, time: Date.now() });
  }

  function getBotReply(msg) {
    const lowerMsg = msg.toLowerCase().trim();
    
    // Game commands
    if (lowerMsg === "play" || lowerMsg === "start game") {
      startGame();
      return null;
    }
    if (lowerMsg === "new" || lowerMsg === "again" || lowerMsg === "restart") {
      resetGame();
      return null;
    }
    
    // Check for guess if game is active
    if (STATE.game.active && checkGuess(msg)) {
      return null;
    }
    
    if (getYouTubeId(msg)) {
      return "✅ YouTube video detected! Click the preview to watch ▶️";
    }
    if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(msg)) {
      return "✅ Image preview loaded! 📷";
    }
    if (/(https?:\/\/|www\.)/i.test(msg)) {
      return "✅ Link detected! Click it to open in a new tab.";
    }
    
    const replies = [
      "That's interesting! Tell me more 😊",
      "Got it! I'll keep that in mind ✅",
      "Thanks for sharing! Anything else?",
      "I hear you. What's next?",
      "Nice! Type \"play\" to try the guessing game 🎮"
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    
    const reply = getBotReply(text);
    if (reply) {
      setTimeout(() => addMessage(reply, "bot"), 600 + Math.random() * 600);
    }
  }

  // === Tab Switching ===
  function switchTab(tabName) {
    STATE.activeTab = tabName;
    tabLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.tab === tabName);
    });
    $$(".fc-tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `fc-panel-${tabName}`);
    });
    
    if (tabName === "tools") {
      renderPasswordManager();
    }
  }

  // === Window Toggle ===
  function toggleChat() {
    STATE.isOpen = !STATE.isOpen;
    chatbox.style.display = STATE.isOpen ? "block" : "none";
    if (STATE.isOpen) {
      setTimeout(() => input.focus(), 60);
      renderMedia(); renderGroups(); renderShares();
    }
  }
  function closeChat() {
    STATE.isOpen = false;
    chatbox.style.display = "none";
  }

  // === Events ===
  toggleBtn.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", closeChat);
  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keydown", e => e.key === "Enter" && (e.preventDefault(), handleSend()));
  tabLinks.forEach(link => link.addEventListener("click", () => switchTab(link.dataset.tab)));

  // Tool buttons — UPDATED
  document.addEventListener("click", e => {
    const toolCard = e.target.closest(".fc-tool-card");
    if (!toolCard) return;
    const action = toolCard.dataset.action;
    
    switchTab("chat"); // Go back to chat after clicking tool
    
    if (action === "facebook") {
      openFacebook();
      return;
    }
    if (action === "instagram") {
      openInstagram();
      return;
    }
    if (action === "game") {
      startGame();
      return;
    }
    if (action === "screenshot") {
      captureFullPage();
      return;
    }
    if (action === "passwords") {
      const section = document.getElementById("fc-pw-section");
      section.style.display = section.style.display === "none" ? "block" : "none";
      renderPasswordManager();
      return;
    }
    
    const labels = {
      notes: "📝 Quick Notes opened!",
      remind: "⏰ Reminder set!",
      tasks: "✅ Task List opened!",
      search: "🔍 Search ready!"
    };
    addMessage(labels[action] || "Tool activated!", "bot");
  });

  // Password Manager Events
  document.addEventListener("click", e => {
    if (e.target.id === "fc-pw-save") {
      const name = document.getElementById("fc-pw-name").value.trim();
      const url = document.getElementById("fc-pw-url").value.trim();
      const value = document.getElementById("fc-pw-value").value;
      if (!name || !value) {
        alert("Please enter both Name and Password");
        return;
      }
      savePasswordEntry({ name, url, password: value });
      document.getElementById("fc-pw-name").value = "";
      document.getElementById("fc-pw-url").value = "";
      document.getElementById("fc-pw-value").value = "";
      addMessage(`✅ Password saved for: ${name}`, "bot");
    }
    if (e.target.classList.contains("fc-delete-pw")) {
      const id = parseInt(e.target.dataset.id);
      if (confirm("Delete this password?")) {
        deletePasswordEntry(id);
        addMessage("🗑️ Password deleted", "bot");
      }
    }
    if (e.target.classList.contains("fc-copy-pw")) {
      const decoded = atob(e.target.dataset.pw);
      navigator.clipboard.writeText(decoded).then(() => {
        e.target.textContent = "✅";
        setTimeout(() => { e.target.textContent = "📋"; }, 1500);
      });
    }
  });
})();