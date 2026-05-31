import { useState, useEffect } from 'react'

function App() {
  const [sandwiches, setSandwiches] = useState([])
  const [user, setUser] = useState(null)
  
  const [cart, setCart] = useState([])
  const [quantities, setQuantities] = useState({})
  const [myOrders, setMyOrders] = useState([])
  const [hasUnpaid, setHasUnpaid] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [message, setMessage] = useState('')
  
  const [isLoginView, setIsLoginView] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const [isAdminView, setIsAdminView] = useState(false)
  const [adminOrders, setAdminOrders] = useState([])
  const [adminSummary, setAdminSummary] = useState(null)

  const [newSandwichName, setNewSandwichName] = useState('')
  const [newSandwichPrice, setNewSandwichPrice] = useState('')
  const [editingSandwichId, setEditingSandwichId] = useState(null)
  const [editSandwichName, setEditSandwichName] = useState('')
  const [editSandwichPrice, setEditSandwichPrice] = useState('')
  const [editSandwichIsActive, setEditSandwichIsActive] = useState(true)

  const [isOrderingOpen, setIsOrderingOpen] = useState(false)

  useEffect(() => {
    const checkTimeWindow = () => {
      //const now = new Date()
      const now = new Date('2026-05-26T12:00:00Z') // TESZTELÉSHEZ FIX IDŐPONT! Élesben: const now = new Date();
      const day = now.getDay()
      const hours = now.getHours()
      // Kedd (2) egész nap, VAGY Szerda (3) 10:00 előtt
      const isOpen = day === 2 || (day === 3 && hours < 10)
      setIsOrderingOpen(isOpen)
    }

    checkTimeWindow()
    const interval = setInterval(checkTimeWindow, 60000) // Percenként frissít
    
    return () => clearInterval(interval)
  }, [])

  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' }

  const loadSandwiches = () => {
    fetch('http://localhost:3000/api/sandwiches')
      .then(res => res.json())
      .then(data => setSandwiches(data))
  }

  useEffect(() => { loadSandwiches() }, [])

  const loadMyOrders = async (userId) => {
    const res = await fetch(`http://localhost:3000/api/orders/user/${userId}`)
    const data = await res.json()
    setMyOrders(data)
    setHasUnpaid(data.some(order => order.isPaid === false))
  }

  const loadAdminData = async () => {
    const resOrders = await fetch('http://localhost:3000/api/admin/orders')
    setAdminOrders(await resOrders.json())
    const resSummary = await fetch('http://localhost:3000/api/admin/summary')
    setAdminSummary(await resSummary.json())
  }

  useEffect(() => {
    if (isAdminView) loadAdminData()
    if (user && !isAdminView) loadMyOrders(user.id)
  }, [isAdminView, user])

  const handleAddSandwich = async (e) => {
    e.preventDefault()
    await fetch('http://localhost:3000/api/admin/sandwiches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSandwichName, price: newSandwichPrice })
    })
    setNewSandwichName(''); setNewSandwichPrice('');
    loadSandwiches()
  }

  const handleUpdateSandwich = async (id) => {
    await fetch(`http://localhost:3000/api/admin/sandwiches/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editSandwichName, price: editSandwichPrice, isActive: editSandwichIsActive })
    })
    setEditingSandwichId(null)
    loadSandwiches()
    if (!isAdminView && user) loadMyOrders(user.id) // Frissítjük a user rendeléseit, hátha eltűnt belőle valami
  }

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
    const res = await fetch('http://localhost:3000/api/orders', {
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
    const res = await fetch(`http://localhost:3000/api/order-items/${itemId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newQuantity })
    })
    if (res.ok) loadMyOrders(user.id)
  }

  const cancelOrder = async (orderId) => {
    if(window.confirm("Biztosan törlöd ezt a rendelést?")) {
      await fetch(`http://localhost:3000/api/orders/${orderId}`, { method: 'DELETE' })
      loadMyOrders(user.id)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (res.ok) { setUser(data); setMessage('') } else { setMessage("❌ " + data.error) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    if (res.ok) { setMessage("✅ Sikeres regisztráció! Jelentkezz be."); setIsLoginView(true) }
  }

  const handleLogout = () => { setUser(null); setCart([]); setIsAdminView(false); setHasUnpaid(false); }
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // STÍLUS OBJEKTUMOK A DESIGNHOZ
  const styles = {
    card: { background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', marginBottom: '20px', border: '1px solid #f0f0f0' },
    btnPrimary: { background: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
    btnSuccess: { background: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    btnDanger: { background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', width: '100%', boxSizing: 'border-box' }
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f4f7f6', fontFamily: 'system-ui' }}>
        <div style={{ ...styles.card, width: '100%', maxWidth: '400px', padding: '35px' }}>
          <h1 style={{ textAlign: 'center', color: '#2c3e50', margin: '0 0 10px 0' }}>🥪 Céges Szendvics</h1>
          <h3 style={{ textAlign: 'center', color: '#7f8c8d', marginBottom: '30px', fontWeight: 'normal' }}>{isLoginView ? 'Üdvözlünk! Jelentkezz be' : 'Hozd létre a fiókod'}</h3>
          {message && <div style={{ color: '#e74c3c', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>{message}</div>}
          <form onSubmit={isLoginView ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {!isLoginView && <input type="text" placeholder="Teljes neved" value={name} onChange={e => setName(e.target.value)} required style={styles.input} />}
            <input type="email" placeholder="Céges email címed" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input} />
            <input type="password" placeholder="Jelszó" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input} />
            <button type="submit" style={{ ...styles.btnSuccess, padding: '14px', fontSize: '16px', marginTop: '10px' }}>{isLoginView ? 'Bejelentkezés' : 'Regisztráció'}</button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '25px', color: '#3498db', cursor: 'pointer', fontSize: '14px' }} onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? 'Nincs még fiókod? Regisztrálj itt!' : 'Már van fiókod? Lépj be!'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui', color: '#1e293b', padding: '0 0 40px 0' }}>
      
      {/* HEADER */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>🥪 Szendvics Rendelő</h2>
          <span style={{ color: '#64748b', fontSize: '14px' }}>Felhasználó: <b>{user.name}</b></span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {user.role === 'ADMIN' && (
            <button onClick={() => setIsAdminView(!isAdminView)} style={{ ...styles.btnPrimary, background: '#8b5cf6' }}>
              {isAdminView ? '⬅️ Rendelési Felület' : '📊 Admin Műszerfal'}
            </button>
          )}
          <button onClick={handleLogout} style={styles.btnDanger}>Kilépés</button>
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

        {isAdminView ? (
          /* ================= ADMIN MŰSZERFAL ================= */
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
            <div>
              <h2>📊 Eheti Összesített Beszerzés</h2>
              {adminSummary && (
                <div style={{ ...styles.card, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <ul style={{ paddingLeft: '20px', fontSize: '16px', lineHeight: '2' }}>
                    {Object.entries(adminSummary.itemsSummary).map(([name, count]) => (
                      <li key={name}><b>{count} db</b> - {name}</li>
                    ))}
                  </ul>
                  <h3 style={{ margin: '20px 0 0 0', color: '#1e40af' }}>Mindösszesen: {adminSummary.totalQuantity} db szendvics | Összérték: {adminSummary.totalPrice} Ft</h3>
                </div>
              )}

              <h2 style={{ marginTop: '40px' }}>Részletes rendelési lista</h2>
              {adminOrders.map(order => (
                <div key={order.id} style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#334155' }}>{order.user?.name}</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{new Date(order.createdAt).toLocaleDateString('hu-HU')}</span>
                    <ul style={{ marginTop: '10px', color: '#475569' }}>
                      {order.items.map(i => <li key={i.id}>{i.quantity}x {i.sandwich?.name}</li>)}
                    </ul>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>{order.totalPrice} Ft</div>
                    <button onClick={async () => {
                      await fetch(`http://localhost:3000/api/admin/orders/${order.id}/pay`, { method: 'PUT' });
                      loadAdminData();
                    }} style={{ ...styles.btnPrimary, background: order.isPaid ? '#10b981' : '#f59e0b', width: '120px' }}>
                      {order.isPaid ? '✅ Fizetve' : '⏳ Tartozik'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* MENÜ SZERKESZTÉSE */}
            <div>
              <h2>🍔 Kínálat Módosítása</h2>
              <div style={styles.card}>
                <form onSubmit={handleAddSandwich} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: 0 }}>Új tétel hozzáadása</h4>
                  <input type="text" placeholder="Szendvics neve" value={newSandwichName} onChange={e => setNewSandwichName(e.target.value)} required style={styles.input}/>
                  <input type="number" placeholder="Ára (Ft)" value={newSandwichPrice} onChange={e => setNewSandwichPrice(e.target.value)} required style={styles.input}/>
                  <button type="submit" style={styles.btnSuccess}>+ Mentés a kínálatba</button>
                </form>

                <h4 style={{ marginBottom: '15px' }}>Jelenlegi szendvicsek</h4>
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
          </div>
        ) : (
          /* ================= RENDELÉSI FELÜLET ================= */
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '35px', alignItems: 'start' }}>
            
            {/* BAL OSZLOP: KÍNÁLAT ÉS HISTÓRIA */}
            <div>
              <h2>Elérhető finomságok</h2>
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
              <h2 style={{ marginTop: '50px' }}>Eddigi rendeléseim</h2>
              {myOrders.length === 0 ? <p style={{ color: '#64748b' }}>Még nem adtál le rendelést ebben a rendszerben.</p> : (
                <div>
                  {myOrders.map(order => {
                    const orderDate = new Date(order.createdAt);
                    return (
                      <div key={order.id} style={{ ...styles.card, borderLeft: order.isPaid ? '5px solid #10b981' : '5px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Leadási idő: {orderDate.toLocaleString('hu-HU')}</span> <br/>
                            <span style={{ fontWeight: 'bold', color: order.isPaid ? '#10b981' : '#f59e0b' }}>{order.isPaid ? '✅ Fizetve' : '⏳ Tartozás'}</span>
                          </div>
                          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{order.totalPrice} Ft</span>
                        </div>
                        
                        {/* ÉLŐ MÓDOSÍTÓ GOMBOK A MÁR LEADOTT RENDELÉSEN */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                          {order.items.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px' }}>
                              <span>{item.sandwich?.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button 
                                  onClick={() => updateOrderItem(item.id, item.quantity - 1)} 
                                  disabled={!isOrderingOpen}
                                  style={{ background: '#ef4444', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed', opacity: isOrderingOpen ? 1 : 0.5 }}
                                >
                                  -
                                </button>
                                <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity} db</span>
                                <button 
                                  onClick={() => updateOrderItem(item.id, item.quantity + 1)} 
                                  disabled={!isOrderingOpen}
                                  style={{ background: '#10b981', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed', opacity: isOrderingOpen ? 1 : 0.5 }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => cancelOrder(order.id)} 
                            disabled={!isOrderingOpen}
                            style={{ ...styles.btnDanger, padding: '6px 12px', fontSize: '13px', ...(!isOrderingOpen ? disabledStyle : {}) }}
                          >
                            🗑️ Teljes rendelés visszavonása
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* JOBB OSZLOP: KOSÁR (STICKY FIXED BOX) */}
            <div style={{ position: 'sticky', top: '110px' }}>
              <h2>🛒 Kosár tartalma</h2>
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