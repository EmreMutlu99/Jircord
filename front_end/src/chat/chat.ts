import io from "socket.io-client";
import { setupApp } from "../app";
import "./chat.css";

export function setupChat(username: string) {
  const token = localStorage.getItem("jwt")!;
  console.log("🔌 Connecting socket with token", token);
  const socket = io("http://localhost:3000", { auth: { token } });

  // --- DOM shell ---
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
    <div class="sidebar">
      <div class="channel global-btn" data-target=""># Global</div>
      <div class="users-header">Direct Messages</div>
      <div id="user-list"></div>
    </div>
    <div class="chat">
      <div class="chat-header">
        <span id="chat-title"># Global</span>
        <button id="logout-btn" class="logout-btn">Logout</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Type your message..." />
      </div>
    </div>
  `;

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

  function appendMessage(msg: {
    from: string;
    text: string;
    to?: string;
    createdAt?: string;
  }) {
    const dateObj = msg.createdAt ? new Date(msg.createdAt) : new Date();
    const currentMinute = dateObj.toISOString().slice(0, 16); // yyyy-mm-ddThh:mm

    // Check if same user & same minute
    if (msg.from === lastMessageUser && currentMinute === lastMessageTime) {
      // Append just the text line (no avatar, no username)
      const lastMessageBlock = messages.lastElementChild;
      if (lastMessageBlock) {
        const textDiv = document.createElement("div");
        textDiv.classList.add("message-text");
        textDiv.textContent = msg.text;
        lastMessageBlock
          .querySelector(".message-content")
          ?.appendChild(textDiv);
      }
    } else {
      // Create a full message block
      const messageWrapper = document.createElement("div");
      messageWrapper.classList.add("message");

      // Avatar
      const avatar = document.createElement("div");
      avatar.classList.add("avatar");
      avatar.textContent = msg.from.charAt(0).toUpperCase();

      // Message content container
      const content = document.createElement("div");
      content.classList.add("message-content");

      // Header (username + timestamp)
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

      // Message text
      const textDiv = document.createElement("div");
      textDiv.classList.add("message-text");
      textDiv.textContent = msg.text;

      // Assemble
      content.appendChild(header);
      content.appendChild(textDiv);
      messageWrapper.appendChild(avatar);
      messageWrapper.appendChild(content);

      messages.appendChild(messageWrapper);
    }

    // Update tracking
    lastMessageUser = msg.from;
    lastMessageTime = currentMinute;

    // Auto-scroll
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
