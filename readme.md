# SzendvicsRendelő - AI Projekt Átadás-Átvételi Dokumentum

Kérlek, olvasd el az alábbi projekt specifikációt, és ez alapján folytassuk a fejlesztést. Ne generálj azonnal kódot, csak igazold vissza, hogy megértetted a struktúrát, és várd meg a következő utasításomat!

## 📌 Projekt Összefoglaló
Egy belső, céges szendvicsrendelő webes alkalmazást fejlesztünk, amit a kollégák (pl. Gergő, Tamás, Péter) használnak a szerdai közös étkezések menedzselésére. Az alkalmazás immár élesített, reszponzív és modern felülettel rendelkezik.

## 🛠 Tech Stack & Verziók
* **Adatbázis:** PostgreSQL (Felhő alapú hosting: **Neon.tech**)
* **ORM:** Prisma (Kritikus: **v6.19.3**-as verziót használunk! A Prisma v7-re történő frissítést szándékosan visszavontuk inkompatibilitás miatt. Ne használj `prisma.config.js`-t, sem `.wasm` adaptereket. A natív NodeJS library engine-t használjuk.)
* **Backend:** Node.js, Express, `bcrypt` (jelszótitkosítás), CORS.
* **Frontend:** React (Vite), natív CSS (stílus objektumokkal a komponensben), modern "kártyás", színátmenetes (linear-gradient) és CSS Grid alapú reszponzív dizájn.
* **Hosting / Deployment:** **Render.com** (Különálló Web Service a backendnek és Static Site a frontendnek).

## 🏗 Adatbázis Struktúra (Prisma Schema)
* **User:** `id`, `name`, `email`, `password`, `role` (USER vagy ADMIN).
* **Sandwich:** `id`, `name`, `price`, `isActive` (Logikai kapcsoló a kínálatból való ideiglenes elrejtéshez).
* **Order:** `id`, `userId`, `totalPrice`, `isPaid`, `createdAt`.
* **OrderItem:** `id`, `orderId`, `sandwichId`, `quantity`.

## ⚙️ Üzleti Logika (Backend)
1. **Időkorlát (Time Window):** Rendelni és a rendelést módosítani csak **kedden egész nap, és szerdán 10:00-ig** lehet. A backend ezen kívül 403-as hibát dob. (Teszteléshez jelenleg a szerveren ez fixen `return true`-ra van állítva, de a logika be van kötve).
2. **Heti Összefűzés:** Ha egy felhasználó a héten újra rendel, a szerver nem csinál új `Order` rekordot, hanem megkeresi az aktuális hét hétfőjétől leadott rendelését, és **hozzáfűzi/frissíti** a darabszámokat az `OrderItem`-ekben, majd újraszámolja a végösszeget.
3. **Automatikus Takarítás:** A `server.js` indulásakor lefut egy funkció, ami automatikusan törli a **3 hétnél régebbi, kifizetett** rendeléseket, hogy ne hízzon az adatbázis.
4. **Fizetés Kezelése:** Az admin tudja pipálni a rendeléseket (Fizetve / Tartozik).
5. **Profil Frissítése:** A backend lekezeli a felhasználói adatok (név, email, új jelszó) frissítését a `/api/users/:id` végponton, a jelszavak biztonságos (bcrypt) újratitkosításával.

## 🖥️ Felhasználói Felület (Frontend - App.jsx)
1. **Auth & Munkamenet:** Regisztráció és Login egy modernizált, letisztult felületen. A rendszer a sikeres belépést `localStorage`-ben tárolja, így **frissítés (F5) után is bejelentkezve marad** a felhasználó.
2. **Három fő nézet:** `USER`, `ADMIN` és `PROFIL`.
3. **User Nézet (Reszponzív CSS Grid):** - Szendvicsek listázása, `+` / `-` darabszám választóval.
   - Kosár (ragadós / sticky oldalsávban PC-n, mobilon szépen a lista alá tördelve).
   - "Eddigi rendeléseim" blokk az eheti rendelésekkel.
   - A már leadott rendeléseken **élőben módosítható** a darabszám (+/- gombokkal az időablakon belül), ami azonnal frissíti az adatbázist.
   - Figyelmeztető sáv: Ha a felhasználónak van korábbi, kifizetetlen rendelése, a rendszer felül egy piros sávban figyelmezteti.
   - Az időablakon (Szerda 10:00) kívül eső időpontokban a kosárba tevő, törlő és módosító gombok "disabled" (inaktív) állapotba kerülnek vizuálisan is.
4. **Profil Beállítások Nézet:**
   - A fejlécben a felhasználó nevére (vagy e-mail címére) kattintva érhető el.
   - Lehetőséget biztosít a megjelenített név, az e-mail cím és a jelszó azonnali módosítására.
5. **Admin Nézet:**
   - Kék színű **Heti Összesítő** kártya (csak az eheti rendelések összesített darabszámai fajtánként, a beszerzés megkönnyítésére).
   - Kollégák összesített rendeléseinek listája Fizetve/Tartozik gombokkal.
   - Kínálat (Sandwich) menedzselése: új hozzáadása, meglévők szerkesztése (név, ár módosítása), illetve aktív/inaktív állapot kapcsolása.

## 🚀 Jelenlegi Státusz
A projekt stabil alappal rendelkezik, az adatbázis szinkronban van (Neon.tech). A felület teljesen reszponzív, és a rendelési időablak logikája hibátlanul működik. Az alkalmazás **élesítve van a Render.com** platformon.

## 🌍 Telepítés, Helyi Futtatás és Élesítés (Deployment)

Mivel a `.env` fájl biztonsági okokból nem szerepel a Git repository-ban, az alábbi lépéseket kell követni:

### 1. Helyi fejlesztői környezet
1. **Függőségek telepítése:** A backend és frontend mappákban is futtasd le az `npm install` parancsot.
2. **Környezeti változók beállítása (Backend):**
   Hozz létre egy `.env` fájlt a backend gyökerében a következő tartalommal:
   `DATABASE_URL="postgresql://FELHASZNALO:JELSZO@HOST:PORT/ADATBAZIS?sslmode=require"`
3. **Környezeti változók beállítása (Frontend):**
   Hozz létre egy `.env` fájlt a frontend gyökerében:
   `VITE_API_URL="http://localhost:3000"`
4. **Adatbázis szinkronizálása:** Futtasd a backend mappában: `npx prisma db push`
5. **Indítás:** Backend: `npm start` | Frontend: `npm run dev`

### 2. Élesítés (Render.com)
* A projekt megosztva fut: egy **Web Service** (Node.js API) és egy **Static Site** (React/Vite).
* A Static Site beállításainál a *Build Command* `npm install && npm run build`, a *Publish directory* pedig a `dist` mappa.
* **Éles környezeti változók (Environment Variables a Render felületén):**
  * A backendnél be van állítva a `DATABASE_URL` a Neon.tech éles adatbázisra.
  * A frontendnél be van állítva a `VITE_API_URL` a futó Render backend URL-jére (perjel `/` nélkül a végén).