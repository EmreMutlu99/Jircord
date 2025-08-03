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
  function renderMessages(msgs: { from: string; text: string; to?: string }[]) {
    messages.innerHTML = "";
    msgs.forEach((msg) => {
      const line = document.createElement("div");
      const prefix = msg.to ? `(DM) ${msg.from}` : msg.from;
      line.textContent = `${prefix}: ${msg.text}`;
      messages.appendChild(line);
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
          <span class="status-dot ${isOnline ? "online-dot" : "offline-dot"}"></span>
          <span class="user-name">${u}</span>
        </div>
      `;
    })
    .join("");

  // Bind DM buttons
  document.querySelectorAll(".dm-btn").forEach((el) => {
    el.addEventListener("click", () => {
      currentTarget = el.getAttribute("data-target")!;
      chatTitle.textContent = currentTarget ? `@${currentTarget}` : "# Global";
      loadMessages(currentTarget);
    });
  });
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

  socket.on(
    "chat:message",
    (msg: { from: string; text: string; to?: string }) => {
      if (!msg.to || msg.to === username || msg.from === username) {
        const line = document.createElement("div");
        const prefix = msg.to ? `(DM) ${msg.from}` : msg.from;
        line.textContent = `${prefix}: ${msg.text}`;
        messages.appendChild(line);
        messages.scrollTop = messages.scrollHeight;
        new Audio("/notify.mp3").play().catch(() => {});
      }
    }
  );

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
