import { useState, useEffect } from 'react';
import { styles } from '../styles';
import { toast } from 'react-hot-toast';

function ProfileSettings({ user, setUser, setIsProfileView, isSubscribed, subscribeToPush, unsubscribeFromPush }) {
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditProfileName(user.name || '');
      setEditProfileEmail(user.email || '');
      setEditProfilePassword('');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sandwichToken')}` 
        },
        body: JSON.stringify({ name: editProfileName, email: editProfileEmail, password: editProfilePassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Adataid sikeresen frissítve!');
        setUser(data.user); 
        localStorage.setItem('sandwichUser', JSON.stringify(data.user)); 
        setEditProfilePassword('');
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Hálózati hiba történt a mentés során!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={styles.textMain}>⚙️ Profil Beállítások</h2>
      <div style={styles.card}>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Név</label>
            <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} style={styles.input} placeholder="Pl. Kiss Péter" required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>E-mail cím</label>
            <input type="email" value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)} style={styles.input} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Új jelszó (Opcionális)</label>
            <input type="password" value={editProfilePassword} onChange={e => setEditProfilePassword(e.target.value)} style={styles.input} placeholder="Csak akkor töltsd ki, ha módosítani akarod" />
          </div>
          
          <button type="submit" disabled={isLoading} style={{ ...styles.btnSuccess, marginTop: '10px', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isLoading ? <span className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></span> : '💾 Mentés'}
          </button>
        </form>

        {/* 🔕 IDEIGLENESEN KIKAPCSOLVA AZ ÉRTESÍTÉSEK BLOKK
        <div style={{ marginTop: '30px', padding: '15px', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Értesítések beállítása</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Kapj azonnali jelzést a böngésződben vagy a telefonodon a rendeléseid állapotáról, illetve esetleges fizetési elmaradásokról.
          </p>
          <button 
            type="button"
            onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush} 
            style={{ 
              background: isSubscribed ? '#ef4444' : '#3b82f6', 
              color: 'white', 
              border: 'none', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              transition: '0.2s',
              width: '100%'
            }}
          >
            {isSubscribed ? '🔕 Értesítések kikapcsolása' : '🔔 Értesítések bekapcsolása'}
          </button>
        </div>
        */}

      </div>
      <button onClick={() => setIsProfileView(false)} style={{ ...styles.btnPrimary, background: '#64748b', boxShadow: 'none', marginTop: '15px' }}>⬅️ Vissza a rendeléshez</button>
    </div>
  );
}

export default ProfileSettings;
