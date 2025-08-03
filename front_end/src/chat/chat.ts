import io from "socket.io-client";
import { setupApp } from "../app";
import "./chat.css";
import "emoji-picker-element/index.js";

export function setupChat(username: string) {
  const token = localStorage.getItem("jwt")!;
  console.log("🔌 Connecting socket with token", token);
  const socket = io("http://localhost:3000", { auth: { token } });

  // --- DOM shell ---
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
  <div class="sidebar">
    <div class="sidebar-top">
      <div class="channel global-btn" data-target=""># Global</div>
      <div class="users-header">Direct Messages</div>
      <div id="user-list"></div>
    </div>

    <div class="user-bar">
      <div class="user-info">
        <div class="user-avatar">
          <span class="status-dot online-dot"></span>
          <span class="avatar-text">A</span>
        </div>
        <div class="user-details">
          <div class="user-name">Alice</div>
          <div class="user-status">Online</div>
        </div>
      </div>
      <div class="user-actions">
        <button title="Mute"><i class="mic-icon">🎤</i></button>
        <button title="Deafen"><i class="headset-icon">🎧</i></button>
        <button title="Settings"><i class="settings-icon">⚙️</i></button>
      </div>
    </div>
  </div>

  <div class="chat">
    <div class="chat-header">
      <span id="chat-title"># Global</span>
      <button id="logout-btn" class="logout-btn">Logout</button>
    </div>
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-input">
      <textarea id="chat-input" placeholder="Type your message..."></textarea>
      <button id="emoji-btn" class="icon-btn">😊</button>
      <button id="send-btn" class="send-btn">➤</button>
    </div>
    </div>
  </div>
`;

  const textarea = document.getElementById("chat-input") as HTMLTextAreaElement;
  const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;

  const emojiBtn = document.getElementById("emoji-btn")!;

  // --- Emoji Picker Setup ---
  const picker = document.createElement("emoji-picker");
  picker.style.position = "absolute";
  picker.style.bottom = "70px";
  picker.style.left = "60px";
  picker.style.display = "none";
  document.body.appendChild(picker);

  emojiBtn.addEventListener("click", () => {
    picker.style.display = picker.style.display === "none" ? "block" : "none";
  });

  picker.addEventListener("emoji-click", (event: any) => {
    textarea.value += event.detail.unicode;
    picker.style.display = "none";
    textarea.focus();
  });

  // Auto-expand textarea
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });

  // Send on button click
  sendBtn.addEventListener("click", () => {
    if (textarea.value.trim()) {
      socket.emit("chat:message", {
        to: currentTarget,
        text: textarea.value.trim(),
      });
      textarea.value = "";
      textarea.style.height = "40px"; // reset height
    }
  });

  // Optional: Send on Enter (Shift+Enter for newline)
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  const userList = document.getElementById("user-list")!;
  const chatTitle = document.getElementById("chat-title")!;
  const messages = document.getElementById("chat-messages")!;
  const input = document.getElementById("chat-input")! as HTMLInputElement;
  const globalBtn = document.querySelector(".global-btn")!;
  const logoutBtn = document.getElementById("logout-btn")!;

  let currentTarget: string | undefined = undefined;
  let allUsers: string[] = [];
  let onlineUsersSet = new Set<string>();

  // --- Helpers ---
  function renderMessages(
    msgs: { from: string; text: string; to?: string; createdAt?: string }[]
  ) {
    messages.innerHTML = "";
    msgs.forEach((msg) => {
      appendMessage(msg); // use the new modern message layout
    });
    messages.scrollTop = messages.scrollHeight;
  }

  function renderUserList() {
    userList.innerHTML = allUsers
      .filter((u) => u !== username) // exclude yourself
      .map((u) => {
        const isOnline = onlineUsersSet.has(u);
        return `
        <div class="channel dm-btn" data-target="${u}">
          <span class="status-dot ${
            isOnline ? "online-dot" : "offline-dot"
          }"></span>
          <span class="user-name">${u}</span>
        </div>
      `;
      })
      .join("");

    // Bind DM buttons
    document.querySelectorAll(".dm-btn").forEach((el) => {
      el.addEventListener("click", () => {
        currentTarget = el.getAttribute("data-target")!;
        chatTitle.textContent = currentTarget
          ? `@${currentTarget}`
          : "# Global";
        loadMessages(currentTarget);
      });
    });
  }

  let lastMessageUser: string | null = null;
  let lastMessageTime: string | null = null;

  function formatTimestamp(date: Date) {
    return (
      date.toLocaleDateString("tr-TR") +
      " " +
      date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  function linkify(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  function createPreview(url: string) {
    // Image preview
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      return `<div class="link-preview"><img src="${url}" alt="preview"></div>`;
    }

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) {
      return `
        <div class="embed-card">
          <div class="embed-header">YouTube</div>
          <div class="embed-video">
            <div class="video-wrapper">
              <iframe
                src="https://www.youtube.com/embed/${ytMatch[1]}"
                frameborder="0"
                allowfullscreen>
              </iframe>
            </div>
          </div>
        </div>
      `;
    }

    // Twitter / X
    if (/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//.test(url)) {
      return `
        <blockquote class="twitter-tweet">
          <a href="${url}"></a>
        </blockquote>
        <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
      `;
    }

    // Instagram
    if (/^https?:\/\/(www\.)?instagram\.com\//.test(url)) {
      return `
        <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"></blockquote>
        <script async src="//www.instagram.com/embed.js"></script>
      `;
    }

    // Reddit
    if (/^https?:\/\/(www\.)?reddit\.com\//.test(url)) {
      return `
        <div class="embed-card">
          <div class="embed-header">Reddit</div>
          <a href="${url}" target="_blank" class="embed-title">${url}</a>
        </div>
      `;
    }
  }

  function appendMessage(msg: {
    from: string;
    text: string;
    to?: string;
    createdAt?: string;
  }) {
    const dateObj = msg.createdAt ? new Date(msg.createdAt) : new Date();
    const currentMinute = dateObj.toISOString().slice(0, 16); // yyyy-mm-ddThh:mm

    // Detect URLs for linkify & previews
    const urls = msg.text.match(/https?:\/\/[^\s]+/g) || [];
    const linkedText = linkify(msg.text);
    let previewHTML = "";
    urls.forEach((url) => {
      previewHTML += createPreview(url);
    });

    if (msg.from === lastMessageUser && currentMinute === lastMessageTime) {
      // Append just text & previews to last block
      const lastMessageBlock = messages.lastElementChild;
      if (lastMessageBlock) {
        const textDiv = document.createElement("div");
        textDiv.classList.add("message-text");
        textDiv.innerHTML = linkedText + previewHTML;
        lastMessageBlock
          .querySelector(".message-content")
          ?.appendChild(textDiv);
      }
    } else {
      // Create new message block
      const messageWrapper = document.createElement("div");
      messageWrapper.classList.add("message");

      // Avatar
      const avatar = document.createElement("div");
      avatar.classList.add("avatar");
      avatar.textContent = msg.from.charAt(0).toUpperCase();

      // Content container
      const content = document.createElement("div");
      content.classList.add("message-content");

      // Header
      const header = document.createElement("div");
      header.classList.add("message-header");

      const nameSpan = document.createElement("span");
      nameSpan.classList.add("username");
      nameSpan.textContent = msg.from;

      const timeSpan = document.createElement("span");
      timeSpan.classList.add("timestamp");
      timeSpan.textContent = formatTimestamp(dateObj);

      header.appendChild(nameSpan);
      header.appendChild(timeSpan);

      // Message text + previews
      const textDiv = document.createElement("div");
      textDiv.classList.add("message-text");
      textDiv.innerHTML = linkedText + previewHTML;

      content.appendChild(header);
      content.appendChild(textDiv);
      messageWrapper.appendChild(avatar);
      messageWrapper.appendChild(content);

      messages.appendChild(messageWrapper);
      const reactionBar = document.createElement("div");
      reactionBar.classList.add("reaction-bar");

      const addReactionBtn = document.createElement("button");
      addReactionBtn.classList.add("reaction-add");
      addReactionBtn.textContent = "➕";
      reactionBar.appendChild(addReactionBtn);

      addReactionBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent other click events

        // Remove any existing picker before opening a new one
        document.querySelectorAll("emoji-picker").forEach((p) => p.remove());

        const picker = document.createElement("emoji-picker");
        picker.style.position = "absolute";
        picker.style.zIndex = "9999";

        // Position near the clicked button
        const rect = addReactionBtn.getBoundingClientRect();
        picker.style.top = `${rect.top - 350}px`; // adjust height of picker
        picker.style.left = `${rect.left}px`;

        // Append to body so it's global, not inside scrolling chat
        document.body.appendChild(picker);

        // Handle emoji selection
        picker.addEventListener("emoji-click", (event: any) => {
          const emoji = event.detail.unicode;

          const btn = document.createElement("button");
          btn.classList.add("reaction-btn");
          btn.textContent = emoji;
          reactionBar.insertBefore(btn, addReactionBtn);

          picker.remove();
        });

        // Close picker when clicking elsewhere
        const closePicker = (ev: MouseEvent) => {
          if (!picker.contains(ev.target as Node)) {
            picker.remove();
            document.removeEventListener("click", closePicker);
          }
        };
        setTimeout(() => {
          document.addEventListener("click", closePicker);
        }, 0);
      });

      // Append to message
      content.appendChild(reactionBar);
    }

    lastMessageUser = msg.from;
    lastMessageTime = currentMinute;

    messages.scrollTop = messages.scrollHeight;
  }

  function loadMessages(target?: string) {
    socket.emit("messages:get", target); // ask backend for history
  }

  // --- Socket events ---
  socket.on("connect", () => {
    console.log("✅ Socket connected", socket.id);
    loadMessages(); // load global history initially
  });

  socket.on("connect_error", (err: { message: any }) => {
    console.error("⛔ Socket auth failed:", err.message);
  });

  socket.on("users:update", (onlineList: string[]) => {
    console.log("👥 users:update", onlineList);
    onlineUsersSet = new Set(onlineList);
    renderUserList();
  });

  socket.on("users:all", (all: string[]) => {
    console.log("📜 all users:", all);
    allUsers = all;
    renderUserList();
  });

  socket.on("chat:message", (msg) => {
    if (!msg.to || msg.to === username || msg.from === username) {
      appendMessage(msg); // now uses the Discord-style + grouping
    }
  });

  // Listen for full history list
  socket.on(
    "messages:list",
    (msgs: { from: string; text: string; to?: string }[]) => {
      renderMessages(msgs);
    }
  );

  // --- UI events ---
  globalBtn.addEventListener("click", () => {
    currentTarget = undefined;
    chatTitle.textContent = "# Global";
    loadMessages();
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      socket.emit("chat:message", {
        to: currentTarget,
        text: input.value.trim(),
      });
      input.value = "";
    }
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("jwt");
    socket.disconnect();
    setupApp();
  });
}
