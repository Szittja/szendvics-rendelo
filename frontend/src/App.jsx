import { useState, useEffect } from 'react'

function App() {
  const [sandwiches, setSandwiches] = useState([])
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('sandwichUser');
    return savedUser ? JSON.parse(savedUser) : null;
  })
  
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('sandwichCart');
    return savedCart ? JSON.parse(savedCart) : [];
  })

  useEffect(() => {
    localStorage.setItem('sandwichCart', JSON.stringify(cart));
  }, [cart])

  const [quantities, setQuantities] = useState({})
  const [myOrders, setMyOrders] = useState([])
  const [hasUnpaid, setHasUnpaid] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [message, setMessage] = useState('')

  const [isProfileView, setIsProfileView] = useState(false)
  const [editProfileName, setEditProfileName] = useState('')
  const [editProfileEmail, setEditProfileEmail] = useState('')
  const [editProfilePassword, setEditProfilePassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

  useEffect(() => {
    if (user) {
      setEditProfileName(user.name || '')
      setEditProfileEmail(user.email || '')
      setEditProfilePassword('') // Jelszót direkt üresen hagyjuk
    }
  }, [user, isProfileView])

  const [expandedSandwiches, setExpandedSandwiches] = useState({});
  const toggleSandwichDetails = (sandwichId) => {
    setExpandedSandwiches(prev => ({
      ...prev,
      [sandwichId]: !prev[sandwichId] // Ha nyitva volt, becsukja, ha csukva, kinyitja
    }));
  };
  
  const [isLoginView, setIsLoginView] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const [isAdminView, setIsAdminView] = useState(false)
  const [adminOrders, setAdminOrders] = useState([])
  const [adminSummary, setAdminSummary] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminMessage, setAdminMessage] = useState('')

  const [newSandwichName, setNewSandwichName] = useState('')
  const [newSandwichPrice, setNewSandwichPrice] = useState('')
  const [editingSandwichId, setEditingSandwichId] = useState(null)
  const [editSandwichName, setEditSandwichName] = useState('')
  const [editSandwichPrice, setEditSandwichPrice] = useState('')
  const [editSandwichIsActive, setEditSandwichIsActive] = useState(true)

  const [isOrderingOpen, setIsOrderingOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  // --- SEGÉDFÜGGVÉNY: Az aktuális hét hétfő 00:00 kiszámítása ---
  const getThisMonday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); 
    
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dayOfWeek - 1));
    thisMonday.setHours(0, 0, 0, 0);
    
    return thisMonday;
  };

  useEffect(() => {
    const checkTimeWindow = () => {
      const now = new Date() // Élesben ez kell!
      //const now = new Date('2026-05-26T13:00:00Z') 
      const day = now.getDay()
      const hours = now.getHours()
      
      // Rendelési ablak: Kedd (2) vagy Szerda (3) 10:00 előtt
      const isOpen = day === 2 || (day === 3 && hours < 10)
      setIsOrderingOpen(isOpen)

      // Visszajelzési ablak: Szerda (3) 12:00 után VAGY Csütörtök (4) egész nap
      const isFeedbackTime = (day === 3 && hours >= 12) || day === 4
      setIsFeedbackOpen(isFeedbackTime)
    }

    checkTimeWindow()
    const interval = setInterval(checkTimeWindow, 60000) // Percenként frissít
    
    return () => clearInterval(interval)
  }, [])

  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' }

  const loadSandwiches = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/sandwiches`)
      .then(res => res.json())
      .then(data => setSandwiches(data))
  }

  useEffect(() => { loadSandwiches() }, [])

  const loadMyOrders = async (userId) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/user/${userId}`)
    const data = await res.json()
    setMyOrders(data)
    setHasUnpaid(data.some(order => order.isPaid === false))
  }

  const loadAdminData = async () => {
    const resOrders = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders`)
    setAdminOrders(await resOrders.json())
    const resSummary = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/summary`)
    setAdminSummary(await resSummary.json())
    const resUsers = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`)
    setAdminUsers(await resUsers.json())
  }

  useEffect(() => {
    if (isAdminView) loadAdminData()
    if (user && !isAdminView) loadMyOrders(user.id)
  }, [isAdminView, user])

  const handleRoleChange = async (userId, newRole) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole, requesterId: user.id }) // Elküldjük, hogy ki kéri a módosítást
    });
    
    if (res.ok) {
      loadAdminData(); // Újratöltjük a listát, hogy látszódjon a változás
    } else {
      const data = await res.json();
      alert(data.error); // Ha más próbálja nyomkodni, hibaüzenetet kap
    }
  }

  const getDetailedSummary = () => {
    const summary = {};
    
    if (!adminOrders) return summary;
  
    // 🔒 A SZŰRÉS: Csak azokat a rendeléseket tartjuk meg, amik az eheti hétfő utániak
    const thisMonday = getThisMonday();
    const thisWeekOrders = adminOrders.filter(order => new Date(order.createdAt) >= thisMonday);
  
    // Itt már a szűrt listán (thisWeekOrders) megyünk végig, nem a teljes adminOrders-ön!
    thisWeekOrders.forEach(order => {
      const userName = order.user?.name || 'Ismeretlen';
      
      order.items.forEach(item => {
        const sandwichName = item.sandwich?.name || 'Ismeretlen szendvics';
        
        if (!summary[sandwichName]) {
          summary[sandwichName] = { total: 0, buyers: {} };
        }
        
        summary[sandwichName].total += item.quantity;
        
        if (!summary[sandwichName].buyers[userName]) {
          summary[sandwichName].buyers[userName] = 0;
        }
        summary[sandwichName].buyers[userName] += item.quantity;
      });
    });
    
    return summary;
  }; 

  const handleAddSandwich = async (e) => {
    e.preventDefault()
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sandwiches`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSandwichName, price: newSandwichPrice })
    })
    setNewSandwichName(''); setNewSandwichPrice('');
    loadSandwiches()
  }

  const handleUpdateSandwich = async (id) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sandwiches/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editSandwichName, price: editSandwichPrice, isActive: editSandwichIsActive })
    })
    setEditingSandwichId(null)
    loadSandwiches()
    if (!isAdminView && user) loadMyOrders(user.id) // Frissítjük a user rendeléseit, hátha eltűnt belőle valami
  }

  const handleQuantityChange = (sandwichId, value) => {
    // A beírt értéket számmá alakítjuk. Ha valaki kitörölné, alapértelmezetten 1-et adunk neki.
    const numericValue = parseInt(value) || 1;
    
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [sandwichId]: numericValue
    }));
  };

  const handleAdminDeleteOrder = async (orderId) => {
  if (!window.confirm('Biztosan törölni szeretnéd ezt a rendelést? Ez a művelet nem vonható vissza!')) {
    return;
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders/${orderId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setAdminOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));

      setAdminMessage("✅ A rendelés sikeresen törölve!");
      
      setTimeout(() => setAdminMessage(""), 3000);
      
    } else {
      const data = await res.json();
      setAdminMessage("❌ Hiba a törlésnél: " + data.error);
      setTimeout(() => setAdminMessage(""), 5000);
    }
  } catch (error) {
    console.error("Hiba történt a törlés során:", error);
    setAdminMessage("❌ Szerverhiba történt a művelet során.");
    setTimeout(() => setAdminMessage(""), 5000);
  }
};

  const addToCart = (sandwich) => {
    setOrderMessage('')
    const qty = quantities[sandwich.id] || 1
    const existingItem = cart.find(item => item.sandwichId === sandwich.id)
    if (existingItem) {
      setCart(cart.map(item => item.sandwichId === sandwich.id ? { ...item, quantity: item.quantity + qty } : item))
    } else {
      setCart([...cart, { sandwichId: sandwich.id, name: sandwich.name, price: sandwich.price, quantity: qty }])
    }
  }

  const submitOrder = async () => {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const items = cart.map(item => ({ sandwichId: item.sandwichId, quantity: item.quantity }))
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, items, totalPrice })
    })
    const data = await res.json()
    if (res.ok) {
      setOrderMessage("✅ " + data.message)
      setCart([])
      loadMyOrders(user.id)
    } else {
      setOrderMessage("❌ " + data.error)
    }
  }

  const updateOrderItem = async (itemId, newQuantity) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/order-items/${itemId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newQuantity })
    })
    if (res.ok) loadMyOrders(user.id)
  }

  const cancelOrder = async (orderId) => {
    if(window.confirm("Biztosan törlöd ezt a rendelést?")) {
      await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}`, { method: 'DELETE' })
      loadMyOrders(user.id)
    }
  }

  const submitFeedback = async (orderId) => {
    // 1. Bekérjük a szöveget (Maradhat a prompt, ha gyors megoldást akarsz)
    const text = window.prompt("Kérlek, írd le, mi nem volt megfelelő a rendeléssel kapcsolatban:");
    if (!text || text.trim() === "") return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/feedback`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: text })
      });
      
      if (res.ok) {
        setOrderMessage("✅ Köszönjük a visszajelzést, továbbítottuk az adminnak!");      
        loadMyOrders(user.id); 
      } else {
        const data = await res.json();
        setOrderMessage("❌ " + data.error);
              }
    } catch (error) {
      // VÉDŐHÁLÓ: Ha például elmegy a net, és a szervert sem éri el
      console.error("Hálózati hiba:", error);
      setOrderMessage("❌ Hálózati hiba! Kérlek, ellenőrizd az internetkapcsolatot.");
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (res.ok) {
       setUser(data);
       localStorage.setItem('sandwichUser', JSON.stringify(data)); 
       setMessage(''); 
      } else { 
        setMessage("❌ " + data.error) 
      }
  }
  
  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Kérlek, tölts ki minden mezőt!");
      return;
    }
    
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }) 
    });

    if (res.ok) {
      setMessage("✅ Sikeres regisztráció! Jelentkezz be.");
      setIsLoginView(true); // Visszavált a bejelentkező űrlapra
      // Opcionális: Kiürítjük a mezőket a sikeres regisztráció után
      setName('');
      setPassword('');
    } else {
      const data = await res.json();
      alert("Hiba: " + data.error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editProfileName, email: editProfileEmail, password: editProfilePassword })
    })
    const data = await res.json()
    if (res.ok) {
      setProfileMessage('✅ ' + data.message)
      setUser(data.user) // Azonnali frissítés a felületen
      localStorage.setItem('sandwichUser', JSON.stringify(data.user)) // A localStorage is frissül
      setEditProfilePassword('')
    } else {
      setProfileMessage('❌ ' + data.error)
    }
  }

  const handleLogout = () => { setUser(null); setCart([]); setIsAdminView(false); setHasUnpaid(false); localStorage.removeItem('sandwichUser');}
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // STÍLUS OBJEKTUMOK A DESIGNHOZ
const styles = {
    // MODERN GOMBOK (Színátmenetesek, szép árnyékkal)
    btnPrimary: { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' },
    btnSuccess: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' },
    btnDanger: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' },
    
    // MODERN MEZŐK (Világos téma, határozott körvonallal)
    input: { padding: '14px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '15px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a', outline: 'none' }, 
    
    // TYPOGRÁFIA
    textMain: { color: '#0f172a', fontWeight: '800', letterSpacing: '-0.5px' },

    // JAVÍTOTT BEJELENTKEZÉS (Szélesebb doboz, több tér)
    loginContainer: { 
      background: 'white', padding: '50px 40px', borderRadius: '24px', 
      boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
      maxWidth: '450px', width: '90%', margin: '10vh auto', 
      display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box'
    },
    loginHeader: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '15px'
    },

    // RESPONSIVE ELRENDEZÉS
    pageContainer: { maxWidth: '1200px', margin: '0 auto', padding: '20px', boxSizing: 'border-box', width: '100%' },
    headerWrap: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' },
    gridContainer: { display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' },
    gridColumnMain: { flex: '1 1 500px', minWidth: '280px', width: '100%', boxSizing: 'border-box' },
    gridColumnSide: { flex: '1 1 300px', minWidth: '280px', width: '100%', boxSizing: 'border-box' },

    // MODERN KÁRTYÁK (Lágyabb dobozok, kerekebb sarkok)
    card: { 
      background: 'white', padding: '25px', borderRadius: '24px', 
      boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '20px', 
      border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%'
    }
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
        <div style={styles.loginContainer}>
          
          <div style={styles.loginHeader}>
            {/* LOGÓ: Ha van saját képed, töröld ki a <div style={{ fontSize... dobozt, és használd az alatta lévő img taget! */}
            <div style={{ fontSize: '60px', marginBottom: '5px' }}>🥪</div>
            {/* <img src="/a_te_logod.png" alt="Logo" style={{ height: '70px', marginBottom: '10px' }} /> */}
            
            <h1 style={{ ...styles.textMain, margin: 0, textAlign: 'center', fontSize: '28px' }}>Céges Szendvics</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Üdvözlünk! Jelentkezz be a rendeléshez.</p>
          </div>
          {isLoginView ? (
              <>
                {/* --- BEJELENTKEZÉS NÉZET --- */}
                <input type="email" placeholder="E-mail cím" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
                <input type="password" placeholder="Jelszó" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
                <button onClick={handleLogin} style={{ ...styles.btnSuccess, width: '100%', padding: '16px', fontSize: '16px', marginTop: '10px' }}>
                  Bejelentkezés
                </button>
                
                <p onClick={() => setIsLoginView(false)} style={{ textAlign: 'center', fontSize: '14px', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>
                  Nincs még fiókod? Regisztrálj itt!
                </p>
              </>
            ) : (
              <>
                {/* --- REGISZTRÁCIÓ NÉZET --- */}
                <input type="text" placeholder="Teljes neved (pl. Teszt Elek)" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
                <input type="email" placeholder="E-mail cím" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
                <input type="password" placeholder="Jelszó" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
                <button onClick={handleRegister} style={{ ...styles.btnSuccess, width: '100%', padding: '16px', fontSize: '16px', marginTop: '10px' }}>
                  Regisztráció
                </button>
                
                <p onClick={() => setIsLoginView(true)} style={{ textAlign: 'center', fontSize: '14px', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>
                  Már van fiókod? Jelentkezz be!
                </p>
              </>
            )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif', color: '#1e293b', padding: '0 0 50px 0' }}>
      
      {/* HEADER */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '15px 0' }}>
        <div style={styles.pageContainer}>
          <div style={styles.headerWrap}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <h1 style={{ ...styles.textMain, margin: 0, fontSize: '24px' }}>🥪 Szendvics Rendelő</h1>
              
              {/* KATTINTHATÓ PROFIL GOMB */}
              {user && (
                <button 
                  onClick={() => { setIsProfileView(true); setIsAdminView(false); }}
                  style={{ background: isProfileView ? '#e2e8f0' : '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s' }}
                  title="Profilom szerkesztése"
                >
                  👤 {user.name ? user.name : user.email}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isAdminView && user?.role === 'ADMIN' && <button style={styles.btnPrimary} onClick={() => { setIsAdminView(false); setIsProfileView(false); }}>Felhasználói Nézet</button>}
              {!isAdminView && user?.role === 'ADMIN' && <button style={styles.btnPrimary} onClick={() => { setIsAdminView(true); setIsProfileView(false); }}>📊 Admin Műszerfal</button>}
              <button style={styles.btnDanger} onClick={() => { handleLogout(); setIsProfileView(false); }}>Kilépés</button>
            </div>

          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        
        {/* TARTOZÁS FIGYELMEZTETÉS */}
        {hasUnpaid && !isAdminView && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px 24px', borderRadius: '12px', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚠️ Figyelem! Van kifizetetlen korábbi rendelésed a rendszerben. Kérlek, rendezd a tartozásod!
          </div>
        )}

        {/* IDŐABLAK FIGYELMEZTETÉS */}
        {!isOrderingOpen && !isAdminView && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '16px 24px', borderRadius: '12px', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⏳ Jelenleg nincs rendelési időszak! Új rendelést leadni vagy meglévőt módosítani csak kedden egész nap, és szerdán 10:00-ig lehet.
          </div>
        )}

        {isProfileView ? (
          /* ================= PROFIL BEÁLLÍTÁSOK ================= */
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={styles.textMain}>⚙️ Profil Beállítások</h2>
            <div style={styles.card}>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569' }}>Név</label>
                  <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} style={{ ...styles.input, background: 'white' }} placeholder="Pl. Kiss Péter" />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569' }}>E-mail cím</label>
                  <input type="email" value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)} style={{ ...styles.input, background: 'white' }} required />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569' }}>Új jelszó (Opcionális)</label>
                  <input type="password" value={editProfilePassword} onChange={e => setEditProfilePassword(e.target.value)} style={{ ...styles.input, background: 'white' }} placeholder="Csak akkor töltsd ki, ha módosítani akarod" />
                </div>
                
                <button type="submit" style={{ ...styles.btnSuccess, marginTop: '10px', padding: '14px' }}>Mentés</button>

                {profileMessage && (
                  <div style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', background: profileMessage.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: profileMessage.startsWith('✅') ? '#065f46' : '#991b1b' }}>
                    {profileMessage}
                  </div>
                )}
              </form>
            </div>
            <button onClick={() => setIsProfileView(false)} style={{ ...styles.btnPrimary, background: '#64748b', boxShadow: 'none' }}>⬅️ Vissza a rendeléshez</button>
          </div>

        ) : isAdminView ? (
          /* ================= ADMIN MŰSZERFAL ================= */
          <div style={styles.gridContainer}>
            <div style={styles.gridColumnMain}>
              <h2 style={styles.textMain}>📊 Eheti Összesített Beszerzés</h2>
              {adminSummary && (
                <div style={{ ...styles.card, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <ul style={{ paddingLeft: '0', fontSize: '16px', lineHeight: '2', listStyle: 'none' }}>
                    {Object.entries(getDetailedSummary()).map(([sandwichName, data]) => (
                      <li key={sandwichName} style={{ marginBottom: '10px', borderBottom: '1px solid #bfdbfe', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><b>{data.total} db</b> - {sandwichName}</span>
                          <button
                            onClick={() => setExpandedSandwiches(prev => ({ ...prev, [sandwichName]: !prev[sandwichName] }))}
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                          >
                            {expandedSandwiches[sandwichName] ? '🔼 Bezár' : '🔽 Kik rendelték?'}
                          </button>
                        </div>
                        
                        {/* LENYÍLÓ RÉSZ */}
                        {expandedSandwiches[sandwichName] && (
                          <ul style={{ paddingLeft: '20px', marginTop: '5px', fontSize: '14px', color: '#475569', listStyleType: 'disc' }}>
                            {Object.entries(data.buyers).map(([buyer, qty]) => (
                              <li key={buyer}><b>{buyer}:</b> {qty} db</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                  <h3 style={{ margin: '20px 0 0 0', color: '#1e40af' }}>Mindösszesen: {adminSummary.totalQuantity} db szendvics | Összérték: {adminSummary.totalPrice} Ft</h3>
                </div>
              )}

              <h2 style={{...styles.textMain, marginTop: '40px' }}>Részletes rendelési lista</h2>
              {adminOrders.map(order => (
                <div key={order.id} style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#334155' }}>{order.user?.name}</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{new Date(order.createdAt).toLocaleDateString('hu-HU')}</span>
                    <ul style={{ marginTop: '10px', color: '#475569' }}>
                      {order.items.map(i => <li key={i.id}>{i.quantity}x {i.sandwich?.name}</li>)}
                    </ul>

                    {adminMessage && (
                      <div style={{ 
                        background: adminMessage.includes('❌') ? '#fee2e2' : '#d1fae5', 
                        color: adminMessage.includes('❌') ? '#991b1b' : '#065f46', 
                        padding: '10px 15px', 
                        borderRadius: '8px', 
                        marginBottom: '15px',
                        textAlign: 'center',
                        fontWeight: '500',
                        border: adminMessage.includes('❌') ? '1px solid #f87171' : '1px solid #34d399'
                      }}>
                        {adminMessage}
                      </div>
                    )}

                    {/* ADMIN SZÁMÁRA MEGJELENŐ VISSZAJELZÉS */}
                    {order.feedback && (
                      <div style={{ marginTop: '10px', background: '#fee2e2', borderLeft: '4px solid #ef4444', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', color: '#7f1d1d', maxWidth: '300px' }}>
                        ⚠️ <b>Probléma jelentve:</b> {order.feedback}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>{order.totalPrice} Ft</div>
                    <button onClick={async () => {
                      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders/${order.id}/pay`, { method: 'PUT' });
                      loadAdminData();
                    }} style={{ ...styles.btnPrimary, background: order.isPaid ? '#10b981' : '#f59e0b', width: '120px' }}>
                      {order.isPaid ? '✅ Fizetve' : '⏳ Tartozik'}
                    </button>
                  </div>
                  <button 
                    onClick={() => handleAdminDeleteOrder(order.id)}
                    style={{ 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginLeft: '15px' // Hogy ne tapadjon rá a szövegre
                    }}
                  >
                    🗑️ Törlés
                  </button>
                </div>
              ))}
            </div>

            {/* MENÜ SZERKESZTÉSE */}
            <div>
              <h2 style={styles.textMain}>🍔 Kínálat Módosítása</h2>
              <div style={styles.card}>
                <form onSubmit={handleAddSandwich} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: 0 }}>Új tétel hozzáadása</h4>
                  <input type="text" placeholder="Szendvics neve" value={newSandwichName} onChange={e => setNewSandwichName(e.target.value)} required style={styles.input}/>
                  <input type="number" placeholder="Ára (Ft)" value={newSandwichPrice} onChange={e => setNewSandwichPrice(e.target.value)} required style={styles.input}/>
                  <button type="submit" style={styles.btnSuccess}>+ Mentés a kínálatba</button>
                </form>

                <h4 style={{ marginBottom: '15px' }}>Jelenlegi Finomságok</h4>
                {sandwiches.map(sw => (
                  <div key={sw.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px', background: sw.isActive ? 'white' : '#f1f5f9', opacity: sw.isActive ? 1 : 0.7 }}>
                    {editingSandwichId === sw.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input type="text" value={editSandwichName} onChange={e => setEditSandwichName(e.target.value)} style={styles.input} />
                        <input type="number" value={editSandwichPrice} onChange={e => setEditSandwichPrice(e.target.value)} style={styles.input} />
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={editSandwichIsActive} onChange={e => setEditSandwichIsActive(e.target.checked)} style={{ width: '20px', height: '20px' }}/>
                          Elérhető a kínálatban (Aktív)
                        </label>

                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleUpdateSandwich(sw.id)} style={{ ...styles.btnSuccess, flex: 1, padding: '6px' }}>Mentés</button>
                          <button onClick={() => setEditingSandwichId(null)} style={{ ...styles.btnDanger, flex: 1, padding: '6px' }}>Mégse</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <b>{sw.name}</b> {sw.isActive ? '✅' : '❌'}<br/>
                          <span style={{ color: sw.isActive ? '#10b981' : '#64748b' }}>{sw.price} Ft</span>
                        </div>
                        <button onClick={() => { setEditingSandwichId(sw.id); setEditSandwichName(sw.name); setEditSandwichPrice(sw.price); setEditSandwichIsActive(sw.isActive); }} style={{ ...styles.btnPrimary, padding: '6px 12px', fontSize: '13px', background: '#f59e0b' }}>Szerkesztés</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* ================= ÚJ SZEKCIÓ: FELHASZNÁLÓK KEZELÉSE ================= */}
            <div style={{ width: '100%', marginTop: '40px' }}>
              <h2 style={styles.textMain}>👥 Regisztrált Felhasználók</h2>
              <div style={{ ...styles.card, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px' }}>Név</th>
                      <th style={{ padding: '12px' }}>E-mail cím</th>
                      <th style={{ padding: '12px' }}>Szerepkör</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Műveletek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.name || '-'}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{u.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', 
                            background: u.role === 'ADMIN' ? '#dbeafe' : '#f1f5f9', 
                            color: u.role === 'ADMIN' ? '#1e40af' : '#64748b' 
                          }}>
                            {u.role === 'ADMIN' ? 'Adminisztrátor' : 'Felhasználó'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {user.id !== u.id && u.email?.toLowerCase() !== 'erdelyi.peter@compmarket.hu' && (
                            <button 
                              onClick={() => handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                              style={{ 
                                ...styles.btnPrimary, 
                                padding: '8px 14px', fontSize: '13px', 
                                background: u.role === 'ADMIN' ? '#94a3b8' : '#3b82f6',
                                boxShadow: 'none'
                              }}
                            >
                              {u.role === 'ADMIN' ? '❌ Jog elvétele' : '👑 Admin jog adása'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ================= RENDELÉSI FELÜLET ================= */
          <div style={styles.gridContainer}>
            
            {/* BAL OSZLOP: KÍNÁLAT ÉS HISTÓRIA */}
            <div style={styles.gridColumnMain}>
              <h2 style={styles.textMain}>Elérhető finomságok</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {sandwiches.filter(sw => sw.isActive).map(sw => (
                  <div key={sw.id} style={{ ...styles.card, margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{sw.name}</h3>
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>{sw.price} Ft</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                      <input type="number" min="1" disabled={!isOrderingOpen} value={quantities[sw.id] || 1} onChange={e => handleQuantityChange(sw.id, e.target.value)} style={{ width: '50px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', ...(!isOrderingOpen ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}) }} />
                      <button 
                        onClick={() => addToCart(sw)} 
                        disabled={!isOrderingOpen}
                        style={{ ...styles.btnPrimary, flex: 1, background: '#f59e0b', ...(!isOrderingOpen ? disabledStyle : {}) }}
                      >
                        Kosárba
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SAJÁT RENDELÉSEK IDŐSZAKI BONTÁSBAN */}
              <h2 style={{...styles.textMain, marginTop: '50px' }}>Eddigi rendeléseim</h2>
              {myOrders.length === 0 ? <p style={{ color: '#64748b' }}>Még nem adtál le rendelést ebben a rendszerben.</p> : (
                <div>
                  {myOrders.map(order => {
                    const orderDate = new Date(order.createdAt);
                    
                    // 🔒 ÚJ VÁLTOZÓ: Kiszámoljuk, eheti-e a rendelés
                    const isThisWeek = orderDate >= getThisMonday();
                  
                    return (
                      <div key={order.id} style={{ ...styles.card, borderLeft: order.isPaid ? '5px solid #10b981' : '5px solid #f59e0b' }}>
                        
                        {/* FEJLÉC: Ez mindig látszik (Dátum, Ár, Fizetve) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Leadási idő: {orderDate.toLocaleString('hu-HU')}</span> <br/>
                            <span style={{ fontWeight: 'bold', color: order.isPaid ? '#10b981' : '#f59e0b' }}>{order.isPaid ? '✅ Fizetve' : '⏳ Tartozás'}</span>
                          </div>
                          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{order.totalPrice} Ft</span>
                        </div>
                  
                        {/* FELTÉTELES MEGJELENÍTÉS A DÁTUM ALAPJÁN */}
                        {isThisWeek ? (
                          <>
                            {/* --- 1. ESET: EHETI RENDELÉS (AKTÍV GOMBOKKAL) --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                              {order.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px' }}>
                                  <span>{item.sandwich?.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button 
                                      onClick={() => updateOrderItem(item.id, item.quantity - 1)} 
                                      disabled={!isOrderingOpen} 
                                      style={{ background: '#ef4444', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed' }}
                                    >-</button>
                                    <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity} db</span>
                                    <button 
                                      onClick={() => updateOrderItem(item.id, item.quantity + 1)} 
                                      disabled={!isOrderingOpen} 
                                      style={{ background: '#10b981', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed' }}
                                    >+</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                  
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                              <button 
                                onClick={() => cancelOrder(order.id)} 
                                disabled={!isOrderingOpen} 
                                style={{ ...styles.btnDanger, padding: '6px 12px', fontSize: '13px', ...(!isOrderingOpen ? disabledStyle : {}) }}
                              >
                                🗑️ Teljes rendelés visszavonása
                              </button>
                  
                              {/* VISSZAJELZÉS GOMB ÉS SZÖVEG */}
                              {isFeedbackOpen && !order.feedback && (
                                <button 
                                  onClick={() => submitFeedback(order.id)} 
                                  style={{ ...styles.btnPrimary, background: '#64748b', padding: '6px 12px', fontSize: '13px' }}
                                >
                                  💬 Probléma bejelentése
                                </button>
                              )}
                              {order.feedback && (
                                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', textAlign: 'left', maxWidth: '100%' }}>
                                  <b>Visszajelzésed:</b> {order.feedback}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* --- 2. ESET: RÉGI RENDELÉS (CSAK OLVASHATÓ) --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                              {order.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px' }}>
                                  <span style={{ color: '#475569' }}>{item.sandwich?.name}</span>
                                  <span style={{ fontWeight: 'bold', color: '#475569' }}>{item.quantity} db</span>
                                </div>
                              ))}
                            </div>
                            
                            <div style={{ marginTop: '10px', padding: '10px', background: '#f1f5f9', borderRadius: '8px', color: '#64748b', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                              🔒 Ez a rendelés egy korábbi héthez tartozik, így már lezárult.
                            </div>
                  
                            {/* Ha írt panaszt a régi rendeléshez, azt továbbra is láthatja */}
                            {order.feedback && (
                              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', textAlign: 'left', maxWidth: '100%', marginTop: '10px' }}>
                                <b>Visszajelzésed:</b> {order.feedback}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* JOBB OSZLOP: KOSÁR (STICKY FIXED BOX) */}
            <div style={{ ...styles.gridColumnSide, position: 'sticky', top: '110px' }}>
              <h2 style={styles.textMain}>🛒 Kosár tartalma</h2>
              <div style={styles.card}>
                {cart.length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>A kosarad még üres. Válassz a kínálatból!</p>
                ) : (
                  <div>
                    {cart.map(item => (
                      <div key={item.sandwichId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{item.quantity}x {item.name}</div>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>{item.price * item.quantity} Ft</span>
                        </div>
                        <button onClick={() => setCart(cart.filter(i => i.sandwichId !== item.sandwichId))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer' }}>❌</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Fizetendő:</span>
                      <span style={{ color: '#27ae60' }}>{cartTotal} Ft</span>
                    </div>
                    <button 
                      onClick={submitOrder} 
                      disabled={!isOrderingOpen}
                      style={{ ...styles.btnSuccess, width: '100%', padding: '14px', fontSize: '16px', ...(!isOrderingOpen ? disabledStyle : {}) }}
                    >
                      Rendelés véglegesítése
                    </button>
                  </div>
                )}
                {orderMessage && (
                  <div style={{ marginTop: '15px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', background: orderMessage.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: orderMessage.startsWith('✅') ? '#065f46' : '#991b1b' }}>
                    {orderMessage}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App
