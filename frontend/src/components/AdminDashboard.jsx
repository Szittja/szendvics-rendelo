import { useState, useEffect } from 'react';
import { styles } from '../styles';
import { toast } from 'react-hot-toast';

function AdminDashboard({ user, sandwiches, loadSandwiches }) {
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

  const [expandedSandwiches, setExpandedSandwiches] = useState({});
  const [newSandwichName, setNewSandwichName] = useState('');
  const [newSandwichPrice, setNewSandwichPrice] = useState('');
  const [editingSandwichId, setEditingSandwichId] = useState(null);
  const [editSandwichName, setEditSandwichName] = useState('');
  const [editSandwichPrice, setEditSandwichPrice] = useState('');
  const [editSandwichIsActive, setEditSandwichIsActive] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('sandwichToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const getThisMonday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); 
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dayOfWeek - 1));
    thisMonday.setHours(0, 0, 0, 0);
    return thisMonday;
  };

  const loadAdminData = async () => {
    setIsLoadingAdmin(true); 
    try {
      const fetchOpts = { headers: getAuthHeaders() };
      const [resOrders, resSummary, resUsers] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders`, fetchOpts),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/summary`, fetchOpts),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, fetchOpts)
      ]);

      setAdminOrders(await resOrders.json());
      setAdminSummary(await resSummary.json());
      setAdminUsers(await resUsers.json());
    } catch (error) {
      toast.error("Hiba az admin adatok betöltésekor!"); 
    } finally {
      setIsLoadingAdmin(false); 
    }
  };

  useEffect(() => { loadAdminData(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }) 
      });
      if (res.ok) {
        toast.success("Jogosultság módosítva!");
        loadAdminData();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Hiba a művelet során!");
    }
  };

  const getDetailedSummary = () => {
    const summary = {};
    if (!adminOrders) return summary;
    const thisMonday = getThisMonday();
    const thisWeekOrders = adminOrders.filter(order => new Date(order.createdAt) >= thisMonday);
  
    thisWeekOrders.forEach(order => {
      const userName = order.user?.name || 'Ismeretlen';
      order.items.forEach(item => {
        const sandwichName = item.sandwich?.name || 'Ismeretlen szendvics';
        if (!summary[sandwichName]) summary[sandwichName] = { total: 0, buyers: {} };
        summary[sandwichName].total += item.quantity;
        if (!summary[sandwichName].buyers[userName]) summary[sandwichName].buyers[userName] = 0;
        summary[sandwichName].buyers[userName] += item.quantity;
      });
    });
    return summary;
  }; 

  const handleAddSandwich = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sandwiches`, {
        method: 'POST', 
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newSandwichName, price: newSandwichPrice })
      });
      toast.success("Új szendvics hozzáadva!");
      setNewSandwichName(''); setNewSandwichPrice('');
      loadSandwiches();
    } catch(err) { toast.error("Hiba a mentésnél!"); }
  };

  const handleUpdateSandwich = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sandwiches/${id}`, {
        method: 'PUT', 
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: editSandwichName, price: editSandwichPrice, isActive: editSandwichIsActive })
      });
      toast.success("Kínálat frissítve!");
      setEditingSandwichId(null);
      loadSandwiches();
    } catch(err) { toast.error("Hiba a frissítésnél!"); }
  };

  const handleAdminDeleteOrder = async (orderId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a rendelést? Ez a művelet nem vonható vissza!')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders/${orderId}`, { 
          method: 'DELETE',
          headers: getAuthHeaders() 
      });
      if (res.ok) {
        setAdminOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        toast.success("A rendelés sikeresen törölve!"); 
      } else {
        const data = await res.json();
        toast.error(data.error); 
      }
    } catch (error) {
      toast.error("Szerverhiba történt a művelet során.");
    }
  };

  return (
    <div style={styles.gridContainer}>
      {isLoadingAdmin ? (
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', width: '100%', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ borderTopColor: '#4f46e5', width: '50px', height: '50px', marginBottom: '20px' }}></span>
          <h2 style={{ color: 'var(--text-muted)' }}>Admin adatok szinkronizálása...</h2>
        </div>
      ) : (
        <>
          <div style={styles.gridColumnMain}>
            <h2 style={styles.textMain}>📊 Eheti Összesített Beszerzés</h2>
            {adminSummary && (
              <div style={{ ...styles.card, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <ul style={{ paddingLeft: '0', fontSize: '16px', lineHeight: '2', listStyle: 'none' }}>
                  {Object.entries(getDetailedSummary()).map(([sandwichName, data]) => (
                    <li key={sandwichName} style={{ marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-main)' }}><b>{data.total} db</b> - {sandwichName}</span>
                        <button onClick={() => setExpandedSandwiches(prev => ({ ...prev, [sandwichName]: !prev[sandwichName] }))} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                          {expandedSandwiches[sandwichName] ? '🔼 Bezár' : '🔽 Kik rendelték?'}
                        </button>
                      </div>
                      {expandedSandwiches[sandwichName] && (
                        <ul style={{ paddingLeft: '20px', marginTop: '5px', fontSize: '14px', color: 'var(--text-muted)', listStyleType: 'disc' }}>
                          {Object.entries(data.buyers).map(([buyer, qty]) => (
                            <li key={buyer}><b>{buyer}:</b> {qty} db</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
                <h3 style={{ margin: '20px 0 0 0', color: 'var(--text-main)' }}>Mindösszesen: {adminSummary.totalQuantity} db szendvics | Összérték: {adminSummary.totalPrice} Ft</h3>
              </div>
            )}

            <h2 style={{...styles.textMain, marginTop: '40px' }}>Részletes rendelési lista</h2>
            {[...adminOrders]
              .sort((a, b) => {
                if (a.isPaid === b.isPaid) return 0; 
                return a.isPaid ? 1 : -1; 
              })
              .map(order => (
              <div key={order.id} style={{ ...styles.card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-main)' }}>{order.user?.name}</h3>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('hu-HU')}</span>
                  <ul style={{ marginTop: '10px', paddingLeft: '20px', color: 'var(--text-main)' }}>
                    {order.items.map(i => <li key={i.id} style={{ marginBottom: '4px' }}>{i.quantity}x {i.sandwich?.name}</li>)}
                  </ul>
                  {order.feedback && (
                    <div style={{ marginTop: '10px', background: 'var(--bg-input)', borderLeft: '4px solid #ef4444', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', color: '#ef4444', maxWidth: '100%' }}>
                      ⚠️ <b>Probléma jelentve:</b> {order.feedback}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flex: '1 1 auto', minWidth: '150px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{order.totalPrice} Ft</div>
                  <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={async () => {
                        try {
                          await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders/${order.id}/pay`, { method: 'PUT', headers: getAuthHeaders() });
                          toast.success("Fizetési státusz módosítva!");
                          loadAdminData();
                        } catch(e) { toast.error("Hiba a mentésnél!"); }
                      }} 
                      style={{ ...styles.btnPrimary, background: order.isPaid ? '#10b981' : '#f59e0b', padding: '8px 12px', fontSize: '13px', margin: 0, boxShadow: 'none', flex: '1 1 auto', maxWidth: '120px' }}
                    >
                      {order.isPaid ? '✅ Fizetve' : '⏳ Tartozik'}
                    </button>
                    <button onClick={() => handleAdminDeleteOrder(order.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', margin: 0 }}>
                      🗑️ Törlés
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.gridColumnSide}>
            <h2 style={styles.textMain}>🍔 Kínálat Módosítása</h2>
            <div style={styles.card}>
              <form onSubmit={handleAddSandwich} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Új tétel hozzáadása</h4>
                <input type="text" placeholder="Szendvics neve" value={newSandwichName} onChange={e => setNewSandwichName(e.target.value)} required style={styles.input}/>
                <input type="number" placeholder="Ára (Ft)" value={newSandwichPrice} onChange={e => setNewSandwichPrice(e.target.value)} required style={styles.input}/>
                <button type="submit" style={styles.btnSuccess}>+ Mentés a kínálatba</button>
              </form>

              <h4 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>Jelenlegi Finomságok</h4>
              {sandwiches.map(sw => (
                <div key={sw.id} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '10px', background: sw.isActive ? 'var(--bg-card)' : 'var(--bg-input)', opacity: sw.isActive ? 1 : 0.7 }}>
                  {editingSandwichId === sw.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input type="text" value={editSandwichName} onChange={e => setEditSandwichName(e.target.value)} style={styles.input} />
                      <input type="number" value={editSandwichPrice} onChange={e => setEditSandwichPrice(e.target.value)} style={styles.input} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)' }}>
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
                      <div style={{ color: 'var(--text-main)' }}>
                        <b>{sw.name}</b> {sw.isActive ? '✅' : '❌'}<br/>
                        <span style={{ color: sw.isActive ? '#10b981' : 'var(--text-muted)' }}>{sw.price} Ft</span>
                      </div>
                      <button onClick={() => { setEditingSandwichId(sw.id); setEditSandwichName(sw.name); setEditSandwichPrice(sw.price); setEditSandwichIsActive(sw.isActive); }} style={{ ...styles.btnPrimary, padding: '6px 12px', fontSize: '13px', background: '#f59e0b' }}>Szerkesztés</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', marginTop: '40px', gridColumn: '1 / -1' }}>
            <h2 style={styles.textMain}>👥 Regisztrált Felhasználók</h2>
            <div style={{ ...styles.card, overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>Név</th>
                    <th style={{ padding: '12px' }}>E-mail cím</th>
                    <th style={{ padding: '12px' }}>Szerepkör</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => (
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }} key={u.id}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>{u.name || '-'}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', background: u.role === 'ADMIN' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-input)', color: u.role === 'ADMIN' ? '#3b82f6' : 'var(--text-muted)' }}>
                          {u.role === 'ADMIN' ? 'Adminisztrátor' : 'Felhasználó'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {user.id !== u.id && u.email?.toLowerCase() !== 'erdelyi.peter@compmarket.hu' && (
                          <button onClick={() => handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')} style={{ ...styles.btnPrimary, padding: '8px 14px', fontSize: '13px', background: u.role === 'ADMIN' ? '#94a3b8' : '#3b82f6', boxShadow: 'none' }}>
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
        </>
      )}
    </div>
  );
}

export default AdminDashboard;