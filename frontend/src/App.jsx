import { useState, useEffect } from 'react'
import { styles } from './styles';
import Login from './components/Login';
import Cart from './components/Cart';
import AdminDashboard from './components/AdminDashboard';
import ProfileSettings from './components/ProfileSettings';
import SandwichCard from './components/SandwichCard';
import { toast, Toaster } from 'react-hot-toast'; 
import { useStore } from './store'; // 🌟 ÚJ: A Zustand Raktár importálása
import './App.css'

function App() {
  // 🌟 ITT VESZÜK KI AZ ADATOKAT ÉS A FÜGGVÉNYEKET A RAKTÁRBÓL
  const { 
    user, setUser, logout, 
    cart, setCart, addToCart, clearCart, 
    isAdminView, setIsAdminView, 
    isProfileView, setIsProfileView 
  } = useStore();

  const [sandwiches, setSandwiches] = useState([])
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [quantities, setQuantities] = useState({})
  const [myOrders, setMyOrders] = useState([])
  const [hasUnpaid, setHasUnpaid] = useState(false)
  const [isOrderingOpen, setIsOrderingOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  // 🛡️ BIZTONSÁGI ELLENŐRZÉS INDÍTÁSKOR
  useEffect(() => {
    const storedUser = localStorage.getItem('sandwichUser');
    const lastActivity = localStorage.getItem('lastActivityTime');
    
    if (storedUser && lastActivity) {
      const now = Date.now();
      const INACTIVITY_LIMIT = 30 * 60 * 1000; 
      
      if (now - parseInt(lastActivity, 10) > INACTIVITY_LIMIT) {
        logout(); // 🌟 Zustand függvény
        toast('A munkameneted biztonsági okokból lejárt. Kérlek, jelentkezz be újra!', { icon: '⏱️' });
      }
    }
  }, []);

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
      // 🛠️ TESZT MÓD KAPCSOLÓ
      if (import.meta.env.VITE_TEST_MODE === 'true') {
        setIsOrderingOpen(true);
        setIsFeedbackOpen(true);
        return;
      }

      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      
      setIsOrderingOpen(day === 2 || (day === 3 && hours < 10));
      setIsFeedbackOpen((day === 3 && hours >= 12) || day === 4);
    }
    
    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 60000);
    return () => clearInterval(interval);
  }, []);

  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('sandwichToken');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  const loadSandwiches = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/sandwiches`, { headers: getAuthHeaders() })
      .then(res => {
        if (res.status === 401 || res.status === 403) handleLogout(true);
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setSandwiches(data); })
      .catch(err => console.error("Hiba a szendvicsek betöltésekor", err));
  }

  useEffect(() => { if (user) loadSandwiches(); }, [user])

  const loadMyOrders = async (userId) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/user/${userId}`, { headers: getAuthHeaders() });
    if (res.status === 401 || res.status === 403) return handleLogout(true);
    const data = await res.json()
    setMyOrders(data)
    setHasUnpaid(data.some(order => order.isPaid === false))
  }

  useEffect(() => {
    if (user && !isAdminView) loadMyOrders(user.id)
  }, [isAdminView, user])

  const handleQuantityChange = (sandwichId, value) => {
    setQuantities(prev => ({ ...prev, [sandwichId]: parseInt(value) || 1 }));
  };

  // 🌟 KOSÁRBA RAKÁS ZUSTANDDAL
  const handleAddToCart = (sandwich) => {
    const qty = quantities[sandwich.id] || 1
    addToCart(sandwich, qty); 
    toast.success(`${qty}x ${sandwich.name} a kosárban!`, { duration: 2000 });
  }

  const submitOrder = async () => {
      setIsSubmittingOrder(true); 
      try {
        const items = cart.map(item => ({ sandwichId: item.sandwichId, quantity: item.quantity }))
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ items }) 
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(data.message);
          clearCart(); // 🌟 Zustand függvény hívása
          loadMyOrders(user.id)
        } else {
          if (res.status === 401 || res.status === 403) handleLogout(true);
          toast.error(data.error); 
        }
      } finally { setIsSubmittingOrder(false); }
    }

  const updateOrderItem = async (itemId, newQuantity) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/order-items/${itemId}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ newQuantity })
    })
    if (res.status === 401 || res.status === 403) handleLogout(true);
    if (res.ok) loadMyOrders(user.id)
  }

  const cancelOrder = async (orderId) => {
    if(window.confirm("Biztosan törlöd ezt a rendelést?")) {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}`, { 
        method: 'DELETE', headers: getAuthHeaders() 
      })
      if (res.status === 401 || res.status === 403) handleLogout(true);
      if (res.ok) { toast.success("Rendelés törölve!"); loadMyOrders(user.id); }
    }
  }

  const submitFeedback = async (orderId) => {
    const text = window.prompt("Kérlek, írd le, mi nem volt megfelelő a rendeléssel kapcsolatban:");
    if (!text || text.trim() === "") return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/feedback`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ feedback: text })
      });
      if (res.ok) {
        toast.success("Köszönjük a visszajelzést, továbbítottuk az adminnak!");
        loadMyOrders(user.id); 
      } else {
        if (res.status === 401 || res.status === 403) handleLogout(true);
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) { toast.error("Hálózati hiba! Kérlek, ellenőrizd az internetkapcsolatot."); }
  }

  const handleLogout = (isAuto = false) => { 
    logout(); // 🌟 Zustand függvény mindent töröl a háttérben
    setHasUnpaid(false); 
    if (isAuto === true) {
      toast('Munkamenet lejárt! Inaktivitás miatt automatikusan kijelentkeztettünk.', { icon: '⏱️' });
    }
  }

  // ⏱️ INAKTIVITÁS FIGYELŐ
  useEffect(() => {
    if (!user) return;
    let timeoutId;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; 

    const resetTimer = () => {
      localStorage.setItem('lastActivityTime', Date.now().toString());
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { handleLogout(true); }, INACTIVITY_LIMIT);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastActivity = parseInt(localStorage.getItem('lastActivityTime') || '0', 10);
        if (Date.now() - lastActivity > INACTIVITY_LIMIT) handleLogout(true);
        else resetTimer(); 
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'touchmove'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  if (!user) {
    return (
      <>
        <Toaster position="top-center" />
        {/* A Zustand végzi a bejelentkezés mentését a setUser-en keresztül! */}
        <Login onLoginSuccess={(userData) => setUser(userData)} /> 
      </>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif', color: '#1e293b', padding: '0 0 50px 0' }}>
      <Toaster position="top-center" />

      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '15px 0' }}>
        <div style={styles.pageContainer}>
          <div style={styles.headerWrap}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <h1 style={{ ...styles.textMain, margin: 0, fontSize: '24px' }}>🥪 Szendvics Rendelő</h1>
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
              <button style={styles.btnDanger} onClick={() => handleLogout(false)}>Kilépés</button>
            </div>

          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        
        {hasUnpaid && !isAdminView && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px 24px', borderRadius: '12px', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚠️ Figyelem! Van kifizetetlen korábbi rendelésed a rendszerben. Kérlek, rendezd a tartozásod!
          </div>
        )}

        {!isOrderingOpen && !isAdminView && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '16px 24px', borderRadius: '12px', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⏳ Jelenleg nincs rendelési időszak! Új rendelést leadni vagy meglévőt módosítani csak kedden egész nap, és szerdán 10:00-ig lehet.
          </div>
        )}

        {isProfileView ? (
          <ProfileSettings user={user} setUser={setUser} setIsProfileView={setIsProfileView} />
        ) : isAdminView ? (
          <AdminDashboard user={user} sandwiches={sandwiches} loadSandwiches={loadSandwiches} />
        ) : (
          <div className="user-layout">
            <div className="section-kinalat">
              <h2 style={styles.textMain}>Elérhető finomságok</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
                {sandwiches.filter(sw => sw.isActive).map(sw => (
                  <SandwichCard 
                    key={sw.id} 
                    sw={sw} 
                    quantities={quantities} 
                    setQuantities={setQuantities} 
                    isOrderingOpen={isOrderingOpen} 
                    addToCart={handleAddToCart} 
                  />
                ))}
              </div>
            </div>
            
            <div className="section-rendelesek">
              <h2 style={{...styles.textMain, marginTop: '0' }}>Eddigi rendeléseim</h2>
              {myOrders.length === 0 ? <p style={{ color: '#64748b' }}>Még nem adtál le rendelést ebben a rendszerben.</p> : (
                <div>
                  {myOrders.map(order => {
                    const orderDate = new Date(order.createdAt);
                    const isThisWeek = orderDate >= getThisMonday();
                  
                    return (
                      <div key={order.id} style={{ ...styles.card, borderLeft: order.isPaid ? '5px solid #10b981' : '5px solid #f59e0b' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Leadási idő: {orderDate.toLocaleString('hu-HU')}</span> <br/>
                            <span style={{ fontWeight: 'bold', color: order.isPaid ? '#10b981' : '#f59e0b' }}>{order.isPaid ? '✅ Fizetve' : '⏳ Tartozás'}</span>
                          </div>
                          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{order.totalPrice} Ft</span>
                        </div>
                  
                        {isThisWeek ? (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                              {order.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px' }}>
                                  <span>{item.sandwich?.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button onClick={() => updateOrderItem(item.id, item.quantity - 1)} disabled={!isOrderingOpen} style={{ background: '#ef4444', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed' }}>-</button>
                                    <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity} db</span>
                                    <button onClick={() => updateOrderItem(item.id, item.quantity + 1)} disabled={!isOrderingOpen} style={{ background: '#10b981', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed' }}>+</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                  
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                              <button onClick={() => cancelOrder(order.id)} disabled={!isOrderingOpen} style={{ ...styles.btnDanger, padding: '6px 12px', fontSize: '13px', ...(!isOrderingOpen ? disabledStyle : {}) }}>
                                🗑️ Teljes rendelés visszavonása
                              </button>
                  
                              {isFeedbackOpen && !order.feedback && (
                                <button onClick={() => submitFeedback(order.id)} style={{ ...styles.btnPrimary, background: '#64748b', padding: '6px 12px', fontSize: '13px' }}>
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

            <Cart 
              cart={cart} 
              setCart={setCart} 
              cartTotal={cartTotal} 
              submitOrder={submitOrder} 
              isOrderingOpen={isOrderingOpen} 
              isSubmittingOrder={isSubmittingOrder} 
            />

          </div>
        )}
      </div>
    </div>
  )
}

export default App