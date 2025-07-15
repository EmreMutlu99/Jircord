export function setupApp() {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
      <div class="sidebar">
        <div class="channel"># general</div>
        <div class="channel"># random</div>
      </div>
      <div class="chat">
        <div class="chat-header"># general</div>
        <div class="chat-messages" id="chat-messages">
          <div>User1: Hello!</div>
          <div>User2: Hey there!</div>
        </div>
        <div class="chat-input">
          <input type="text" id="chat-input" placeholder="Type your message..." />
        </div>
      </div>
    `
  
    const input = document.getElementById('chat-input') as HTMLInputElement
    const messages = document.getElementById('chat-messages')!
  
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const msg = document.createElement('div')
        msg.textContent = `You: ${input.value}`
        messages.appendChild(msg)
        input.value = ''
        messages.scrollTop = messages.scrollHeight
      }
    })
  }
  