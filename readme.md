# 🥪 Céges Szendvics Rendelő Applikáció

Egy teljes körű (Full-Stack) webalkalmazás, amely megkönnyíti a vállalati szendvicsrendelések leadását, összesítését és pénzügyi adminisztrációját. A rendszer szigorú időablakokkal, modern állapotkezeléssel és robusztus szerveroldali adatvalidációval rendelkezik.

## ✨ Főbb funkciók

### 👤 Felhasználói (Dolgozói) felület
* **Biztonságos azonosítás:** JWT alapú hitelesítés, titkosított jelszavakkal (Bcrypt) és 30 perces inaktivitási automatikus kiléptetéssel.
* **Időablakos rendelés:** Rendelést leadni vagy módosítani kizárólag kedden egész nap, és szerdán 10:00-ig lehetséges.
* **Intelligens kosár:** Zustand alapú globális állapotkezelés, amely a böngésző memóriájába (LocalStorage) menti a kosár tartalmát.
* **Tartozás figyelés:** Okos fizetési emlékeztető, amely az eheti tartozásokra csak szerda 14:00 után figyelmeztet, a korábbiakra viszont azonnal.
* **Visszajelzési rendszer:** Minőségbiztosítási panaszok beküldése dedikált időablakban (szerda 12:00 - csütörtök 23:59).

### 👑 Adminisztrátori felület
* **Heti összesítő (Dashboard):** Valós idejű összesítés az eheti rendelésekről (szendvicsek darabszáma, összérték, megrendelők bontása).
* **Készletkezelés (CRUD):** Új szendvicsek felvétele, árak módosítása, termékek ideiglenes elrejtése az étlapról (Active toggle).
* **Pénzügyi modul:** Rendelések fizetetté nyilvánítása. A felület automatikusan a lista elejére sorolja a tartozásokat.
* **Felhasználókezelés:** Adminisztrátori jogosultságok kiosztása és visszavonása (beépített védelemmel a Superadmin jogok megvonása ellen).
* **Rendeléskezelés:** Hibás rendelések teljes körű törlése szükség esetén.

## 🛠️ Használt technológiák

**Frontend:**
* React.js (Vite környezetben)
* Zustand (Globális állapotkezelés)
* React-Hot-Toast (Modern, animált értesítések)
* Natív CSS és Inline stílusok (Reszponzív, letisztult UI)

**Backend:**
* Node.js & Express.js (REST API végpontok)
* Prisma ORM (Adatbázis interakciók és sémakezelés)
* PostgreSQL / MySQL (Relációs adatbázis)
* Zod (Szigorú kérés-validációs köztesréteg / Middleware)
* JSON Web Token (JWT) (Végpontok védelme)

## 🚀 Telepítés és Futtatás (Helyi fejlesztés)

### Előfeltételek
* Node.js telepítve a gépen.
* Egy futó PostgreSQL vagy MySQL adatbázis (akár felhős, pl. Aiven, Render).

### 1. Repository klónozása és telepítés
```bash
# Backend függőségek telepítése
cd backend
npm install

# Frontend függőségek telepítése
cd ../frontend
npm install
```

### 2. Környezeti változók (.env) beállítása
A `backend` és a `frontend` mappákban is létre kell hozni egy-egy `.env` fájlt.

**Backend `.env` példa:**
```env
# Adatbázis kapcsolati URL (Prisma számára)
DATABASE_URL="mysql://felhasznalo:jelszo@host:port/database"

# Titkos kulcs a JWT tokenek generálásához
JWT_SECRET="szuper-titkos-kulcs"

# Fejlesztői mód az időablakok kikapcsolásához (opcionális)
TEST_MODE=true
```

**Frontend `.env` példa:**
```env
# A backend szerver címe
VITE_API_URL="http://localhost:3000"

# Fejlesztői mód az időablakok kikapcsolásához (opcionális)
VITE_TEST_MODE=true
```

### 3. Adatbázis sémák szinkronizálása
A `backend` mappában futtasd az alábbi parancsot, hogy a Prisma felépítse az adatbázis szerkezetét:
```bash
npx prisma db push
```

### 4. Alkalmazás indítása
```bash
# Backend indítása (a backend mappából)
npm run start
# vagy
node server.js

# Frontend indítása egy új terminálból (a frontend mappából)
npm run dev
```

## 🛡️ Biztonság és Architektúra

* **Zod Middleware:** Minden bejövő POST és PUT kérés (regisztráció, rendelés leadás, termék módosítás) egy Zod validációs rétegen megy keresztül. Érvénytelen formátumok (pl. negatív darabszám, rossz e-mail) el sem jutnak az adatbázis lekérdezésig.
* **Keep-Alive:** A `server.js` tartalmaz egy `/api/ping` végpontot, amely egy apró adatbázis-lekérdezéssel meggátolja, hogy a felhős adatbázisok (pl. Aiven ingyenes tier) "elaludjanak" inaktivitás esetén.
* **Adattakarítás:** A szerver automatikusan futtat egy Cron-szerű tisztító funkciót (`cleanupOldOrders`), amely fizikailag is eltávolítja az 1 hétnél régebbi, már kifizetett rendeléseket az adatbázis tehermentesítése érdekében.