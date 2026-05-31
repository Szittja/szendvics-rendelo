# SzendvicsRendelő - AI Projekt Átadás-Átvételi Dokumentum

Kérlek, olvasd el az alábbi projekt specifikációt, és ez alapján folytassuk a fejlesztést. Ne generálj azonnal kódot, csak igazold vissza, hogy megértetted a struktúrát, és várd meg a következő utasításomat!

## 📌 Projekt Összefoglaló
Egy belső, céges szendvicsrendelő webes alkalmazást fejlesztünk, amit a kollégák (pl. Gergő, Tamás, Péter) használnak a szerdai közös étkezések menedzselésére. 

## 🛠 Tech Stack & Verziók
* **Adatbázis:** PostgreSQL
* **ORM:** Prisma (Kritikus: **v6.19.3**-as verziót használunk! A Prisma v7-re történő frissítést szándékosan visszavontuk inkompatibilitás miatt. Ne használj `prisma.config.js`-t, sem `.wasm` adaptereket. A natív NodeJS library engine-t használjuk.)
* **Backend:** Node.js, Express, `bcrypt` (jelszótitkosítás), CORS.
* **Frontend:** React (Vite), natív CSS (stílus objektumokkal a komponensben), modern "kártyás" és CSS Grid alapú reszponzív dizájn.

## 🏗 Adatbázis Struktúra (Prisma Schema)
* **User:** `id`, `name`, `email`, `password`, `role` (USER vagy ADMIN).
* **Sandwich:** `id`, `name`, `price`.
* **Order:** `id`, `userId`, `totalPrice`, `isPaid`, `createdAt`.
* **OrderItem:** `id`, `orderId`, `sandwichId`, `quantity`.

## ⚙️ Üzleti Logika (Backend)
1. **Időkorlát (Time Window):** Rendelni és a rendelést módosítani csak **kedden egész nap, és szerdán 10:00-ig** lehet. A backend ezen kívül 403-as hibát dob. (Teszteléshez jelenleg a szerveren ez fixen `return true`-ra van állítva, de a logika be van kötve).
2. **Heti Összefűzés:** Ha egy felhasználó a héten újra rendel, a szerver nem csinál új `Order` rekordot, hanem megkeresi az aktuális hét hétfőjétől leadott rendelését, és **hozzáfűzi/frissíti** a darabszámokat az `OrderItem`-ekben, majd újraszámolja a végösszeget.
3. **Automatikus Takarítás:** A `server.js` indulásakor lefut egy funkció, ami automatikusan törli a **3 hétnél régebbi, kifizetett** rendeléseket, hogy ne hízzon az adatbázis.
4. **Fizetés Kezelése:** Az admin tudja pipálni a rendeléseket (Fizetve / Tartozik).

## 🖥️ Felhasználói Felület (Frontend - App.jsx)
1. **Auth:** Regisztráció és Login egy felületen.
2. **Két nézet:** `ADMIN` (váltógombbal elérhető) és Normál `USER`.
3. **User Nézet:** 
   - Szendvicsek listázása, `+` / `-` darabszám választóval.
   - Kosár (ragadós / sticky oldalsávban).
   - "Eddigi rendeléseim" blokk az eheti rendelésekkel.
   - A már leadott rendeléseken **élőben módosítható** a darabszám (+/- gombokkal az időablakon belül), ami azonnal frissíti az adatbázist.
   - Figyelmeztető sáv: Ha a felhasználónak van korábbi, kifizetetlen rendelése, a rendszer felül egy piros sávban figyelmezteti.
   - **Új fejlesztés alatt:** Az időablakon (Szerda 10:00) kívül eső időpontokban a kosárba tevő, törlő és módosító gombok "disabled" (inaktív) állapotba kerülnek vizuálisan is.
4. **Admin Nézet:**
   - Kék színű **Heti Összesítő** kártya (csak az eheti rendelések összesített darabszámai fajtánként, a beszerzés megkönnyítésére).
   - Kollégák összesített rendeléseinek listája Fizetve/Tartozik gombokkal.
   - Kínálat (Sandwich) menedzselése: új hozzáadása, meglévők szerkesztése (név, ár módosítása).

## 🚀 Jelenlegi Státusz
A projekt stabil alappal rendelkezik, az adatbázis szinkronban van (Prisma v6-on). A felületen a rendelési időablak (kedd 0:00 - szerda 10:00) logikája mind a frontend (vizuális inaktiválás), mind a backend (403-as hibakód) oldalán implementálva van. A rendszer fel van készítve az élesítésre (Deployment).

## 🌍 Telepítés és Helyi Futtatás (Deployment)

Mivel a `.env` fájl biztonsági okokból nem szerepel a Git repository-ban, a projekt klónozása után az alábbi lépéseket kell követni:

1. **Függőségek telepítése:**
   A backend és frontend mappákban is futtasd le az `npm install` parancsot.
2. **Környezeti változók beállítása:**
   Hozz létre egy `.env` fájlt a backend gyökerében a következő tartalommal:
   `DATABASE_URL="postgresql://FELHASZNALO:JELSZO@HOST:PORT/ADATBAZIS?schema=public"`
3. **Adatbázis szinkronizálása:**
   Futtasd a backend mappában: `npx prisma db push`
4. **Alkalmazás indítása:**
   - Backend: `node server.js`
   - Frontend: `npm run dev`