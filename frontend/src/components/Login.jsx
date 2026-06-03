import { useState } from 'react';
import { styles } from '../styles';

function Login({ onLoginSuccess }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true); // ⏳ Töltés indítása
        
        try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            onLoginSuccess(data); 
        } else { 
            setMessage("❌ " + data.error);
        }
        } finally {
        setIsLoading(false); // 🛑 Töltés leállítása
        }
    }

    const handleRegister = async () => {
        if (!name || !email || !password) {
        alert("Kérlek, tölts ki minden mezőt!");
        return;
        }
        
        setIsLoading(true); // ⏳ Töltés indítása

        try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }) 
        });
        if (res.ok) {
            setMessage("✅ Sikeres regisztráció! Jelentkezz be.");
            setIsLoginView(true);
            setName(''); setPassword('');
        } else {
            const data = await res.json();
            alert("Hiba: " + data.error);
        }
        } finally {
        setIsLoading(false); // 🛑 Töltés leállítása
        }
    };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      <div style={styles.loginContainer}>
        <div style={styles.loginHeader}>
          <div style={{ fontSize: '60px', marginBottom: '5px' }}>🥪</div>
          <h1 style={{ ...styles.textMain, margin: 0, textAlign: 'center', fontSize: '28px' }}>Céges Szendvics</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Üdvözlünk! Jelentkezz be a rendeléshez.</p>
        </div>

        {isLoginView ? (
          <>
            {message && (
              <div style={{ background: message.includes('❌') ? '#fee2e2' : '#d1fae5', color: message.includes('❌') ? '#991b1b' : '#065f46', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center', fontSize: '14px', border: message.includes('❌') ? '1px solid #f87171' : '1px solid #34d399' }}>
                {message}
              </div>
            )}
            <input type="email" placeholder="E-mail cím" value={email} onChange={e => { setEmail(e.target.value); setMessage(''); }} style={styles.input} />
            <input type="password" placeholder="Jelszó" value={password} onChange={e => { setPassword(e.target.value); setMessage(''); }} style={styles.input} onKeyDown={e => { if (e.key === 'Enter') handleLogin(e); }}/>
            <button 
                onClick={handleLogin} 
                disabled={isLoading}
                style={{ ...styles.btnSuccess, width: '100%', padding: '16px', fontSize: '16px', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', ...(isLoading ? { opacity: 0.7, cursor: 'not-allowed' } : {}) }}
            >
                {isLoading ? <span className="spinner"></span> : 'Bejelentkezés'}
            </button>
            <p onClick={() => setIsLoginView(false)} style={{ textAlign: 'center', fontSize: '14px', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Nincs még fiókod? Regisztrálj itt!</p>
          </>
        ) : (
          <>
            <input type="text" placeholder="Teljes neved (pl. Teszt Elek)" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
            <input type="email" placeholder="E-mail cím" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Jelszó" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
            <button 
                onClick={handleRegister} 
                disabled={isLoading}
                style={{ ...styles.btnSuccess, width: '100%', padding: '16px', fontSize: '16px', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', ...(isLoading ? { opacity: 0.7, cursor: 'not-allowed' } : {}) }}
            >
                {isLoading ? <span className="spinner"></span> : 'Regisztráció'}
            </button>
            <p onClick={() => setIsLoginView(true)} style={{ textAlign: 'center', fontSize: '14px', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Már van fiókod? Jelentkezz be!</p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;