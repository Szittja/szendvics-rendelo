import { useState, useEffect } from 'react';
import { styles } from '../styles';
import { toast } from 'react-hot-toast'; // 🌟 ÚJ IMPORT

function ProfileSettings({ user, setUser, setIsProfileView }) {
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
        toast.success('Adataid sikeresen frissítve!'); // 🌟 SIKER TOAST
        setUser(data.user); 
        localStorage.setItem('sandwichUser', JSON.stringify(data.user)); 
        setEditProfilePassword('');
      } else {
        toast.error(data.error); // 🌟 HIBA TOAST
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569' }}>Név</label>
            <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} style={{ ...styles.input, background: 'white' }} placeholder="Pl. Kiss Péter" required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569' }}>E-mail cím</label>
            <input type="email" value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)} style={{ ...styles.input, background: 'white' }} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569' }}>Új jelszó (Opcionális)</label>
            <input type="password" value={editProfilePassword} onChange={e => setEditProfilePassword(e.target.value)} style={{ ...styles.input, background: 'white' }} placeholder="Csak akkor töltsd ki, ha módosítani akarod" />
          </div>
          
          <button type="submit" disabled={isLoading} style={{ ...styles.btnSuccess, marginTop: '10px', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isLoading ? <span className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></span> : '💾 Mentés'}
          </button>
        </form>
      </div>
      <button onClick={() => setIsProfileView(false)} style={{ ...styles.btnPrimary, background: '#64748b', boxShadow: 'none' }}>⬅️ Vissza a rendeléshez</button>
    </div>
  );
}

export default ProfileSettings;