import { useState, useEffect } from 'react';
import { styles } from '../styles';

function ProfileSettings({ user, setUser, setIsProfileView }) {
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Frissíti a beviteli mezőket, amikor a komponens betöltődik
  useEffect(() => {
    if (user) {
      setEditProfileName(user.name || '');
      setEditProfileEmail(user.email || '');
      setEditProfilePassword('');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editProfileName, email: editProfileEmail, password: editProfilePassword })
    });
    const data = await res.json();
    if (res.ok) {
      setProfileMessage('✅ ' + data.message);
      setUser(data.user); // Azonnali frissítés a felületen
      localStorage.setItem('sandwichUser', JSON.stringify(data.user)); 
      setEditProfilePassword('');
    } else {
      setProfileMessage('❌ ' + data.error);
    }
  };

  return (
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
  );
}

export default ProfileSettings;