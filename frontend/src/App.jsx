import { useState, useEffect } from 'react'
import { styles } from './styles';
import Login from './components/Login';
import Cart from './components/Cart';
import AdminDashboard from './components/AdminDashboard';
import ProfileSettings from './components/ProfileSettings';
import SandwichCard from './components/SandwichCard';
import { toast, Toaster } from 'react-hot-toast'; 
import { useStore } from './store';
import SandwichSkeleton from './components/SandwichSkeleton';
import './App.css'

// Segédfüggvény a VAPID kulcs átalakításához
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {
  const { 
    user, setUser, logout, 
    cart, setCart, addToCart, clearCart, 
    isAdminView, setIsAdminView, 
    isProfileView, setIsProfileView 
  } = useStore();

  const [sandwiches, setSandwiches] = useState([])
  const [isLoadingSandwiches, setIsLoadingSandwiches] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [quantities, setQuantities] = useState({})
  const [myOrders, setMyOrders] = useState([])
  const [hasUnpaid, setHasUnpaid] = useState(false)
  const [isOrderingOpen, setIsOrderingOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState('');
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [isVacationMode, setIsVacationMode] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // 🛡️ BIZTONSÁGI ELLENŐRZÉS INDÍTÁSKOR
  useEffect(() => {
    const storedUser = localStorage.getItem('sandwichUser');
    const lastActivity = localStorage.getItem('lastActivityTime');
    
    if (storedUser && lastActivity) {
      const now = Date.now();
      const INACTIVITY_LIMIT = 30 * 60 * 1000; 
      
      if (now - parseInt(lastActivity, 10) > INACTIVITY_LIMIT) {
        logout(); 
        toast('A munkameneted biztonsági okokból lejárt. Kérlek, jelentkezz be újra!', { 
          id: 'logout-toast', 
          icon: '⏱️' 
        });
      }
    }
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    };
    checkSubscription();
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
        setTimeLeft("Teszt mód aktív (Korlátlan idő)");
        return;
      }

      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      
      const isOpen = day === 2 || (day === 3 && hours < 10);
      setIsOrderingOpen(isOpen);
      setIsFeedbackOpen((day === 3 && hours >= 12) || day === 4);

      // ⏱️ VISSZASZÁMLÁLÓ LOGIKA (Ha nyitva van a rendelés)
      if (isOpen) {
        const target = new Date(now);
        const daysToWednesday = 3 - day;
        target.setDate(now.getDate() + daysToWednesday);
        target.setHours(10, 0, 0, 0);
        

        const diff = target.getTime() - now.getTime();
        if (diff > 0) {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          
          const formatTime = (num) => num.toString().padStart(2, '0');
          setTimeLeft(`${formatTime(h)}:${formatTime(m)}:${formatTime(s)}`);
          setIsEndingSoon(diff <= 15 * 60 * 1000);
        } else {
          setTimeLeft('');
          setIsEndingSoon(false);
        }
      }
    }
    
    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 1000); 
    return () => clearInterval(interval);
  }, []);

  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('sandwichToken');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  const loadSandwiches = () => {
    setIsLoadingSandwiches(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/sandwiches`, { headers: getAuthHeaders() })
      .then(res => {
        if (res.status === 401 || res.status === 403) handleLogout(true);
        return res.json();
      })
      .then(data => { 
        if (Array.isArray(data)) setSandwiches(data); 
        setIsLoadingSandwiches(false); 
      })
      .catch(err => {
        console.error("Hiba a szendvicsek betöltésekor", err);
        setIsLoadingSandwiches(false);
      });
  }

  const loadSettings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setIsVacationMode(data.isVacation);
      }
    } catch (error) {
      console.error("Hiba a beállítások betöltésekor", error);
    }
  };
  const toggleVacationMode = async () => {
    const newState = !isVacationMode;
    setIsVacationMode(newState); // Azonnali frissítés a felületen
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVacation: newState })
      });
      
      if (res.ok) {
        toast.success(newState ? "🏖️ Szabadság mód BEKAPCSOLVA" : "✅ Szabadság mód KIKAPCSOLVA");
      } else {
        throw new Error('Hiba a mentésnél');
      }
    } catch (error) {
      setIsVacationMode(!newState); // Visszaállítás, ha hiba volt
      toast.error("Hiba történt a beállítás mentése során!");
    }
  };

  useEffect(() => { if (user) {loadSandwiches(); loadSettings();}}, [user])

  const loadMyOrders = async (userId) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/user/${userId}`, { headers: getAuthHeaders() });
    if (res.status === 401 || res.status === 403) return handleLogout(true);
    const data = await res.json()
    setMyOrders(data)

    const now = new Date();
    const thisMonday = getThisMonday();
    
    const thisWednesday2PM = new Date(thisMonday);
    thisWednesday2PM.setDate(thisMonday.getDate() + 2);
    thisWednesday2PM.setHours(14, 0, 0, 0);
    
    const isPastDeadline = now >= thisWednesday2PM;

    const hasDebt = data.some(order => {
      if (order.isPaid) return false; 
      
      const orderDate = new Date(order.createdAt);
      if (orderDate < thisMonday) {
        return true; 
      } else {
        return isPastDeadline; 
      }
    });
    
    setHasUnpaid(hasDebt);
  }

  useEffect(() => {
    if (user && !isAdminView) loadMyOrders(user.id)
  }, [isAdminView, user])

  const handleQuantityChange = (sandwichId, value) => {
    setQuantities(prev => ({ ...prev, [sandwichId]: parseInt(value) || 1 }));
  };

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
          clearCart();
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
    toast.dismiss();
    logout(); 
    setHasUnpaid(false); 
    
    if (isAuto === true) {
      toast('Munkamenet lejárt! Inaktivitás miatt automatikusan kijelentkeztettünk.', { 
        id: 'logout-toast', 
        icon: '⏱️' 
      });
    }
  }

  // 🔔 PUSH ÉRTESÍTÉSEK ENGEDÉLYEZÉSE
  const subscribeToPush = async () => {

    // 1. Támogatja-e a böngésző a legalapvetőbb funkciókat?
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error("Ebből a böngészőből nem lehet feliratkozni! (Használj Chrome-ot, iOS-en pedig a Safariból add a Főképernyőhöz!)");
      return;
    }

    // 2. Engedély kérése a felhasználótól
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Nem adtál engedélyt az értesítésekre, így nem tudunk szólni!");
        return;
      }
    } catch (error) {
      toast.error("Hiba az engedély kérésekor! Próbáld meg Chrome-ból telepíteni az alkalmazást.");
      return;
    }

    try {
      // 3. Service Worker regisztrálása
      const registration = await navigator.serviceWorker.ready;

      // 🌟 ÚJ: Beragadt, régi feliratkozások törlése
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        console.log("👻 Régi, beragadt feliratkozás sikeresen törölve a böngészőből!");
      }
      
      // 4. Publikus kulcs átalakítása
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

      // 5. Feliratkozás a böngésző Push szolgáltatójánál (Google/Apple)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 6. Elküldjük a feliratkozási adatokat a saját backendünknek
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(subscription)
      });

      if (res.ok) {
        setIsSubscribed(true);
        toast.success("Sikeresen feliratkoztál az értesítésekre! 🔔");
      } else {
        throw new Error('Hiba a szerver oldalon');
      }
    } catch (error) {
      console.error("Feliratkozási hiba:", error);
      toast.error("Hiba történt a feliratkozás során.");
    }
  };

  // 🔕 PUSH ÉRTESÍTÉSEK KIKAPCSOLÁSA
  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        toast.info("Jelenleg nem vagy feliratkozva az értesítésekre.");
        return;
      }

      // 1. Töröljük a kapcsolatot magából a böngészőből
      const isUnsubscribed = await subscription.unsubscribe();

      if (isUnsubscribed) {
        // 2. Szólunk a backendnek, hogy törölje az adatbázisból is
        await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/unsubscribe`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        setIsSubscribed(false);
        toast.success("Sikeresen kikapcsoltad az értesítéseket! 🔕");
      }
    } catch (error) {
      console.error("Hiba a leiratkozásnál:", error);
      toast.error("Hiba történt a leiratkozás során.");
    }
  };

  // 🔔 TESZT ÉRTESÍTÉS KÜLDÉSE (Admin)
  const sendTestNotification = async () => {
    const message = window.prompt("Mit üzenjünk a feliratkozóknak?", "🥪 Készülj, mindjárt zárul a rendelés!");
    if (!message) return; // Ha a Mégse gombra nyomott, kilépünk

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/notifications/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: "Szendvics Szerda",
          message: message,
          url: "/"
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Hálózati hiba az értesítés küldésekor.");
    }
  };

  // 💸 Emlékeztető küldése a tartozóknak
  const sendToDebtors = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/send-debtors`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(), // A token-t tartalmazó fejléc-kezelőd
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: "Fizetési emlékeztető 🥪", 
          body: "Hahó! Kérlek, ne felejtsd el kiegyenlíteni a korábbi szendvics rendelésedet!" 
        })
      });

      const data = await res.json();
      toast.info(data.message); 
    } catch (error) {
      console.error("Hiba a küldésnél:", error);
      toast.error("Hiba történt a küldés során.");
    }
  };

  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const [changelogData, setChangelogData] = useState([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);

  // 📢 Changelog betöltése oldalbetöltéskor
  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/changelog`);
        if (res.ok) {
          const data = await res.json();
          setChangelogData(data);
          
          if (data.length > 0) {
            const lastSeenVersion = localStorage.getItem('lastSeenVersion');
            if (lastSeenVersion !== data[0].version) {
              setHasUnreadUpdates(true);
            }
          }
        }
      } catch (error) {
        console.error("Nem sikerült betölteni a frissítéseket:", error);
      }
    };
    fetchChangelog();
  }, []);

  const openChangelog = () => {
    setShowChangelog(true);
    setHasUnreadUpdates(false);
    if (changelogData.length > 0) {
      localStorage.setItem('lastSeenVersion', changelogData[0].version);
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🌙 Sötét mód betöltése
  useEffect(() => {
    const savedTheme = localStorage.getItem('sandwichTheme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // 🌓 Téma váltó gomb logikája
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('sandwichTheme', newTheme ? 'dark' : 'light');
    
    if (newTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // 🔕 IDEIGLENESEN KIKAPCSOLVA AZ ÉRTESÍTÉS BEKÉRŐ ABLAK LOGIKÁJA
  /*
  useEffect(() => {
    if (user && !isAdminView) {
      const promptAnswered = localStorage.getItem('pushPromptAnswered');
      const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

      if (isPushSupported && !promptAnswered) {
        const permission = 'Notification' in window ? Notification.permission : 'default';
        if (permission === 'default') {
          const timer = setTimeout(() => setShowPushPrompt(true), 1500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [user, isAdminView]);
  */

  const handleAcceptPushPrompt = async () => {
    localStorage.setItem('pushPromptAnswered', 'true');
    setShowPushPrompt(false);
    await subscribeToPush(); 
  };

  const handleDeclinePushPrompt = () => {
    localStorage.setItem('pushPromptAnswered', 'true');
    setShowPushPrompt(false);
    toast.info("Értesítések elhalasztva. Később a fenti gombbal bekapcsolhatod!");
  };

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
        <Toaster 
          position="top-center" 
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
        <Login onLoginSuccess={(userData) => {
          toast.dismiss();
          setUser(userData);
        }} /> 
      </>
    );
  }

  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif', color: 'var(--text-main)', padding: '0 0 50px 0' }}>
      
      <Toaster 
        position="top-center" 
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

      <header style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', padding: '15px 0' }}>
        <div style={styles.pageContainer}>
          <div style={styles.headerWrap}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <h1 style={{ ...styles.textMain, margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src="/icon-192.png" 
                  alt="Logó" 
                  style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} 
                />
                Szendvics Szerda
              </h1>
              {user && (
                <button 
                  onClick={() => { setIsProfileView(true); setIsAdminView(false); }}
                  style={{ background: isProfileView ? 'var(--bg-input)' : 'transparent', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s' }}
                  title="Profilom szerkesztése"
                >
                  👤 {user.name ? user.name : user.email}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isAdminView && user?.role === 'ADMIN' && <button style={styles.btnPrimary} onClick={() => { setIsAdminView(false); setIsProfileView(false); }}>Felhasználói Nézet</button>}
              {!isAdminView && user?.role === 'ADMIN' && <button style={styles.btnPrimary} onClick={() => { setIsAdminView(true); setIsProfileView(false); }}>📊 Admin Műszerfal</button>}
              {/* 🌓 Sötét/Világos mód gomb */}
              <button 
                onClick={toggleTheme}
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: '0.2s',
                  color: 'var(--text-main)'
                }}
                title={isDarkMode ? "Világos mód bekapcsolása" : "Sötét mód bekapcsolása"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              {/* 📢 Újdonságok Gomb */}
              <button 
                onClick={openChangelog}
                style={{ 
                  position: 'relative',
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-main)',
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: '0.2s'
                }}
                title="Mi új a programban?"
              >
                📢
                {/* 🔴 A piros értesítő pötty */}
                {hasUnreadUpdates && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    width: '12px', height: '12px', background: '#ef4444', 
                    borderRadius: '50%', border: '2px solid var(--bg-card)'
                  }}></span>
                )}
              </button>
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
          <div style={{ background: 'var(--bg-warning)', border: '1px solid var(--border-warning)', color: 'var(--text-warning)', padding: '16px 24px', borderRadius: '12px', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⏳ Jelenleg nincs rendelési időszak! Új rendelést leadni vagy meglévőt módosítani csak kedden egész nap, és szerdán 10:00-ig lehet.
          </div>
        )}

        {isOrderingOpen && !isAdminView && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '16px 24px', borderRadius: '16px', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '15px' }}>
              ✅ Rendelési időszak nyitva! 
              <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '14px' }}>(Szerda 10:00-ig)</span>
            </div>

            <div style={{ background: 'var(--bg-input)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
              ⏱️ Hátralévő idő: 
              <span style={{ 
                fontFamily: 'monospace', 
                fontSize: '16px', 
                letterSpacing: '1px', 
                color: isEndingSoon ? '#ef4444' : '#f59e0b',
                fontWeight: isEndingSoon ? '900' : 'bold',
                animation: isEndingSoon ? 'pulse 1.5s infinite' : 'none'
              }}>
                {timeLeft}
              </span>
            </div>

          </div>
        )}

        {isProfileView ? (
          <ProfileSettings 
            user={user} 
            setUser={setUser} 
            setIsProfileView={setIsProfileView} 
            isSubscribed={isSubscribed} 
            subscribeToPush={subscribeToPush} 
            unsubscribeFromPush={unsubscribeFromPush} 
          />
        ) : isAdminView ? (
          <>
          {/* ⚙️ RENDSZER BEÁLLÍTÁSOK (Admin nézetben) */}
            <div style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>              
              
              {/* 1. Szabadság mód (EZT MEGHAGYTUK!) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)' }}>🏖️ Szabadság üzemmód</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Ha bekapcsolod, a felhasználók nem látják a kínálatot és nem tudnak rendelni.</span>
                </div>
                <button onClick={toggleVacationMode} style={{ background: isVacationMode ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                  {isVacationMode ? '🔒 Kikapcsolás' : '🏖️ Szabadság bekapcsolása'}
                </button>
              </div>

              {/* 🔕 IDEIGLENESEN KIKAPCSOLVA: 2. Globális értesítés */}
              {/*
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '15px', marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)' }}>📢 Értesítés küldése mindenkinek</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Azonnali push üzenet küldése az összes feliratkozónak.</span>
                </div>
                <button onClick={sendTestNotification} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💬 Üzenet írása
                </button>
              </div>
              */}

              {/* 🔕 IDEIGLENESEN KIKAPCSOLVA: 3. Célzott értesítés a tartozóknak */}
              {/*
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)' }}>💸 Tartozók figyelmeztetése</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Célzott automatikus emlékeztető azoknak, akiknek van kifizetetlen rendelése.</span>
                </div>
                <button onClick={sendToDebtors} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💸 Emlékeztető küldése
                </button>
              </div>
              */}

            </div>
            
          <AdminDashboard user={user} sandwiches={sandwiches} loadSandwiches={loadSandwiches} /></>
        ) : (
          <div className="user-layout">
              <div className="section-kinalat">
                <h2 style={styles.textMain}>Elérhető finomságok</h2>
                
                {isVacationMode ? (
                  /* 🏖️ SZABADSÁG ÜZEMMÓD */
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', boxSizing: 'border-box', width: '100%' }}>
                    <h2 style={{ fontSize: '50px', margin: '0 0 15px 0' }}>🏖️</h2>
                    <h3 style={{ color: 'var(--text-main)', margin: '0 0 10px 0', fontSize: '24px' }}>A héten szabadságon vagyok!</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '16px', lineHeight: '1.5' }}>
                      Ezen a héten sajnos szünetel a rendelés. <br />
                      Jövő héten újra várunk a megszokott, legfinomabb szendvicsekkel!
                    </p>
                  </div>
                ) : (
                  /* 🥪 NORMÁL ÜZEMMÓD: Kínálat */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
                    {isLoadingSandwiches ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <SandwichSkeleton key={index} />
                      ))
                    ) : (
                      sandwiches.filter(sw => sw.isActive).map(sw => (
                        <SandwichCard 
                          key={sw.id} 
                          sw={sw} 
                          quantities={quantities} 
                          setQuantities={setQuantities} 
                          isOrderingOpen={isOrderingOpen} 
                          addToCart={handleAddToCart} 
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            
            <div className="section-rendelesek">
              <h2 style={{...styles.textMain, marginTop: '0' }}>Eddigi rendeléseim</h2>
              {myOrders.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Még nem adtál le rendelést ebben a rendszerben.</p> : (
                <div>
                  {myOrders.map(order => {
                    const orderDate = new Date(order.createdAt);
                    const isThisWeek = orderDate >= getThisMonday();
                  
                    return (
                      <div key={order.id} style={{ ...styles.card, borderLeft: order.isPaid ? '5px solid #10b981' : '5px solid #f59e0b' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Leadási idő: {orderDate.toLocaleString('hu-HU')}</span> <br/>
                            <span style={{ fontWeight: 'bold', color: order.isPaid ? '#10b981' : '#f59e0b' }}>{order.isPaid ? '✅ Fizetve' : '⏳ Tartozás'}</span>
                          </div>
                          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{order.totalPrice} Ft</span>
                        </div>
                  
                        {isThisWeek ? (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                              {order.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '10px 15px', borderRadius: '8px' }}>
                                  <span style={{ color: 'var(--text-main)' }}>{item.sandwich?.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button onClick={() => updateOrderItem(item.id, item.quantity - 1)} disabled={!isOrderingOpen} style={{ background: '#ef4444', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '5px', fontWeight: 'bold', cursor: isOrderingOpen ? 'pointer' : 'not-allowed' }}>-</button>
                                    <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center', color: 'var(--text-main)' }}>{item.quantity} db</span>
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
                                <div style={{ background: 'var(--bg-input)', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', textAlign: 'left', maxWidth: '100%' }}>
                                  <b>Visszajelzésed:</b> {order.feedback}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                              {order.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '10px 15px', borderRadius: '8px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>{item.sandwich?.name}</span>
                                  <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{item.quantity} db</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                              🔒 Ez a rendelés egy korábbi héthez tartozik, így már lezárult.
                            </div>
                            {order.feedback && (
                              <div style={{ background: 'var(--bg-input)', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', textAlign: 'left', maxWidth: '100%', marginTop: '10px' }}>
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

      {/* 🔕 IDEIGLENESEN KIKAPCSOLVA AZ EGYSZERI ÉRTESÍTÉS BEKÉRŐ ABLAK */}
      {/* {showPushPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Kérsz értesítést a szendvicsekről? 🥪</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Kapj azonnali jelzést, ha lezárul a rendelés, vagy emlékeztetőt a fizetésről! Később bármikor kikapcsolhatod.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
              <button 
                onClick={handleDeclinePushPrompt}
                style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
              >
                Most nem
              </button>
              <button 
                onClick={handleAcceptPushPrompt}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
              >
                Igen, kérem! 🔔
              </button>
            </div>
          </div>
        </div>
      )}
      */}
    
      {/* 📢 Frissítési Jegyzék (Changelog) Modal */}
      {showChangelog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '500px',
            maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>✨ Újdonságok</h2>
              <button 
                onClick={() => setShowChangelog(false)} 
                style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✖
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {changelogData.map((log, index) => (
                <div key={index}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ background: index === 0 ? '#3b82f6' : 'var(--bg-input)', color: index === 0 ? 'white' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}>
                      {log.version}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{log.date}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                    {log.changes.map((change, i) => (
                      <li key={i} style={{ marginBottom: '5px' }}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button 
                onClick={() => setShowChangelog(false)}
                style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
