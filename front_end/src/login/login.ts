import './login.css'

export function showLogin(onLogin: (username: string) => void) {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-logo">Jirc<span class="accent">ord</span></div>
        <div class="login-title">Welcome Back!</div>
        <input type="text" id="username" placeholder="Username" class="login-input" />
        <input type="password" id="password" placeholder="Password" class="login-input" />
        <button id="login-btn" class="login-btn">Log In</button>
      </div>
    </div>
  `
  
    document.getElementById('login-btn')!.addEventListener('click', async () => {
      const username = (document.getElementById('username') as HTMLInputElement).value.trim()
      const password = (document.getElementById('password') as HTMLInputElement).value.trim()
      if (!username || !password) {
        alert('Please enter both username and password.')
        return
      }
  
      try {
        const resp = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
        if (!resp.ok) throw new Error('Login failed')
        const { token } = await resp.json()
  
        // Store the JWT (you can also use a cookie if you prefer)
        localStorage.setItem('jwt', token)
  
        // Notify app that login succeeded
        onLogin(username)
      } catch (err) {
        alert('Login failed: ' + (err as Error).message)
      }
    })
  }
  