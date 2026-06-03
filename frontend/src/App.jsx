import { useState, useEffect } from 'react'
import { styles } from './styles';
import Login from './components/Login';
import Cart from './components/Cart';
import AdminDashboard from './components/AdminDashboard';
import ProfileSettings from './components/ProfileSettings';
import SandwichCard from './components/SandwichCard';
import './App.css'

function App() {
  const [sandwiches, setSandwiches] = useState([])
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('sandwichUser');
    return savedUser ? JSON.parse(savedUser) : null;
  })

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

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

  const [isProfileView, setIsProfileView] = useState(false)
    
  const [isAdminView, setIsAdminView] = useState(false)
  
  const [isOrderingOpen, setIsOrderingOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const [logoutMessage, setLogoutMessage] = useState('');

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

  useEffect(() => {
    if (user && !isAdminView) loadMyOrders(user.id)
  }, [isAdminView, user])

  const handleQuantityChange = (sandwichId, value) => {
    // A beírt értéket számmá alakítjuk. Ha valaki kitörölné, alapértelmezetten 1-et adunk neki.
    const numericValue = parseInt(value) || 1;
    
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [sandwichId]: numericValue
    }));
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
      setIsSubmittingOrder(true); // ⏳ Töltés indítása
      
      try {
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
      } finally {
        setIsSubmittingOrder(false); // 🛑 Töltés leállítása
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

  const handleLogout = () => { setUser(null); setCart([]); setIsAdminView(false); setHasUnpaid(false); localStorage.removeItem('sandwichUser');}

  // --- AUTOMATIKUS KIJELENTKEZTETÉS INAKTIVITÁS MIATT ---
  useEffect(() => {
    if (!user) return;

    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      
      inactivityTimer = setTimeout(() => {
        handleLogout();
        
        setLogoutMessage("⏱️ Biztonsági okokból 30 perc inaktivitás után a rendszer automatikusan kijelentkeztetett.");
        
    
      }, 1800000);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  if (!user) {
    return (
      <>
        {/* ÚJ, LEBEGŐ FIGYELMEZTETÉS */}
        {logoutMessage && (
          <div style={{ 
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999, 
            background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', 
            padding: '16px 24px', borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontWeight: 'bold', 
            display: 'flex', alignItems: 'center', gap: '10px' 
          }}>
            {logoutMessage}
          </div>
        )}
      <Login onLoginSuccess={(userData) => {
        setUser(userData);
        localStorage.setItem('sandwichUser', JSON.stringify(userData));

        setLogoutMessage('');
      }} />
      </>
    );
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
          <ProfileSettings user={user} setUser={setUser} setIsProfileView={setIsProfileView} />

        ) : isAdminView ? (
          
          /* AZ ÚJ, KISZERVEZETT ADMIN MŰSZERFAL */
          <AdminDashboard user={user} sandwiches={sandwiches} loadSandwiches={loadSandwiches} />
          
        ) : (
          /* ================= RENDELÉSI FELÜLET ================= */
          <div className="user-layout">
            {/* 1. SZEKCIÓ: KÍNÁLAT */}
            <div className="section-kinalat">
              <h2 style={styles.textMain}>Elérhető finomságok</h2>
              
              {/* Ez az a rács, amit előbb mobilbaráttá tettünk! */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
                
                {sandwiches.filter(sw => sw.isActive).map(sw => (
                  <SandwichCard 
                    key={sw.id} 
                    sw={sw} 
                    quantities={quantities} 
                    setQuantities={setQuantities} 
                    isOrderingOpen={isOrderingOpen} 
                    addToCart={addToCart} 
                  />
                ))}
              </div>
            </div>
            {/* SAJÁT RENDELÉSEK IDŐSZAKI BONTÁSBAN */}
            {/* 3. SZEKCIÓ: RENDELÉSEK (A CSS fogja legalulra tolni mobilon) */}
            <div className="section-rendelesek">
              <h2 style={{...styles.textMain, marginTop: '0' }}>Eddigi rendeléseim</h2>
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

            {/* 2. SZEKCIÓ: KOSÁR (Kiszervezve a Cart.jsx-be!) */}
            <Cart 
              cart={cart} 
              setCart={setCart} 
              cartTotal={cartTotal} 
              submitOrder={submitOrder} 
              isOrderingOpen={isOrderingOpen} 
              orderMessage={orderMessage}
              isSubmittingOrder={isSubmittingOrder} 
            />

          </div>
        )}
      </div>
    </div>
  )
}

export default App
