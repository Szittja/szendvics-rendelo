import { useState } from 'react';
import { styles } from '../styles';
import { toast, Toaster } from 'react-hot-toast';

function Login({ onLoginSuccess }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('sandwichToken', data.token);
            toast.success("Sikeres bejelentkezés!"); 
            onLoginSuccess(data.user); 
        } else { 
            toast.error(data.error); 
        }
        } finally {
        setIsLoading(false);
        }
    }

    const handleRegister = async () => {
        if (!name || !email || !password) {
          toast.error("Kérlek, tölts ki minden mezőt!"); 
          return;
        }
        
        setIsLoading(true);

        try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }) 
        });
        if (res.ok) {
            toast.success("Sikeres regisztráció! Jelentkezz be."); 
            setIsLoginView(true);
            setName(''); setPassword('');
        } else {
            const data = await res.json();
            toast.error(data.error); 
        }
        } finally {
        setIsLoading(false);
        }
    };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: 'var(--bg-card)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'var(--bg-card)',
            },
          },
        }}
      />

      <div style={styles.loginContainer}>
        <div style={styles.loginHeader}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px', 
            color: 'var(--text-main)', 
            width: '100%', 
            margin: '0 0 25px 0',
            fontSize: '40px', 
            fontWeight: 'bold',
            flexWrap: 'wrap', 
            textAlign: 'center'
          }}>
            <img 
              src="/icon-192.png" 
              alt="Logó" 
              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} 
            />
            <span>
              Szendvics Szerda
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>Üdvözlünk! Jelentkezz be a rendeléshez.</p>
        </div>

        {isLoginView ? (
          <>
            <input type="email" placeholder="E-mail cím" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Jelszó" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} onKeyDown={e => { if (e.key === 'Enter') handleLogin(e); }}/>
            <button 
                onClick={handleLogin} 
                disabled={isLoading}
                style={{ ...styles.btnSuccess, width: '100%', padding: '16px', fontSize: '16px', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', ...(isLoading ? { opacity: 0.7, cursor: 'not-allowed' } : {}) }}
            >
                {isLoading ? <span className="spinner"></span> : 'Bejelentkezés'}
            </button>
            <p onClick={() => setIsLoginView(false)} style={{ textAlign: 'center', fontSize: '14px', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Nincs még fiókod? Regisztrálj itt!</p>
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
            <p onClick={() => setIsLoginView(true)} style={{ textAlign: 'center', fontSize: '14px', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Már van fiókod? Jelentkezz be!</p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;