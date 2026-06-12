require('dotenv').config({ path: './prisma/.env' });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const registerSchema = z.object({
  name: z.string().min(3, "A névnek legalább 3 karakternek kell lennie!").max(50, "A név túl hosszú!"),
  email: z.string().email("Érvénytelen e-mail cím formátum!"),
  password: z.string().min(2, "A jelszónak legalább 2 karakterből kell állnia!")
});

const loginSchema = z.object({
  email: z.string().email("Érvénytelen e-mail cím formátum!"),
  password: z.string().min(2, "A jelszó megadása kötelező!")
});

const updateProfileSchema = z.object({
  name: z.string().min(3, "A név legalább 3 karakter kell legyen!").max(50),
  email: z.string().email("Érvénytelen e-mail cím!"),
  password: z.string().optional().refine(val => !val || val.length >= 2, "Az új jelszónak legalább 2 karakternek kell lennie!")
});

const sandwichSchema = z.object({
  name: z.string().min(3, "A szendvics neve legalább 3 karakter legyen!").max(50, "Túl hosszú név!"),
  price: z.coerce.number({ invalid_type_error: "Az árnak számnak kell lennie!" }).int().positive("Az ár nem lehet nulla vagy negatív!"),
  isActive: z.boolean().optional()
});

const orderSchema = z.object({
  items: z.array(z.object({
    sandwichId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive("A darabszámnak legalább 1-nek kell lennie!")
  })).min(1, "Üres kosárral nem lehet rendelni!")
});

const feedbackSchema = z.object({
  feedback: z.string().min(5, "A panasznak legalább 5 karakter hosszú kell lennie!").max(500, "A panasz túl hosszú!")
});

const validateData = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errorMessage = 
        result.error?.issues?.[0]?.message || 
        result.error?.errors?.[0]?.message || 
        "Helytelen vagy hiányos adatok lettek beküldve!";
        
      return res.status(400).json({ error: errorMessage });
    }
    next();
  };
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (!token) return res.status(401).json({ error: "Hiányzó hitelesítési token! Jelentkezz be újra!" });

  jwt.verify(token, process.env.JWT_SECRET || 'szuper-titkos-szendvics-kulcs-2026', (err, user) => {
    if (err) return res.status(403).json({ error: "Érvénytelen vagy lejárt munkamenet!" });
    req.user = user; 
    next(); 
  });
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: "Nincs adminisztrátori jogosultságod ehhez a művelethez!" });
  }
  next();
};

const webpush = require('web-push');

// 🌟 VAPID beállítások az értesítésekhez
webpush.setVapidDetails(
  'mailto:szittja21@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

console.log("🔑 BACKEND Publikus Kulcs:", process.env.VAPID_PUBLIC_KEY ? process.env.VAPID_PUBLIC_KEY.substring(0, 15) + "..." : "HIÁNYZIK!");

// --- IDŐABLAK ÉS KARBANTARTÁS SEGÉDFÜGGVÉNYEK ---
const getStartOfCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay() || 7; 
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

const isOrderTimeValid = () => {
  // 🛠️ TESZT MÓD KAPCSOLÓ
  if (process.env.TEST_MODE === 'true') return true;

  const nowStr = new Date().toLocaleString("en-US", {timeZone: "Europe/Budapest"});
  const huDate = new Date(nowStr);
  const day = huDate.getDay();
  const hours = huDate.getHours();
  return day === 2 || (day === 3 && hours < 10);
};

const checkFeedbackWindow = (req, res, next) => {
  // 🛠️ TESZT MÓD KAPCSOLÓ
  if (process.env.TEST_MODE === 'true') return next();

  const nowStr = new Date().toLocaleString("en-US", {timeZone: "Europe/Budapest"});
  const huDate = new Date(nowStr);
  const day = huDate.getDay(); 
  const hours = huDate.getHours();
  const isFeedbackOpen = (day === 3 && hours >= 12) || (day === 4);

  if (!isFeedbackOpen) {
    return res.status(403).json({ error: "Panaszt és értékelést kizárólag szerda 12:00 és csütörtök éjfél között lehet beküldeni!" });
  }
  next();
};

const cleanupOldOrders = async () => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    await prisma.orderItem.deleteMany({ where: { order: { createdAt: { lt: oneWeekAgo }, isPaid: true } } });
    const deleted = await prisma.order.deleteMany({ where: { createdAt: { lt: oneWeekAgo }, isPaid: true } });
    if (deleted.count > 0) console.log(`🧹 Adatbázis karbantartás: ${deleted.count} régi, kifizetett rendelés törölve.`);
  } catch (err) { console.error("Hiba a karbantartás során:", err); }
};
cleanupOldOrders();
setInterval(cleanupOldOrders, 24 * 60 * 60 * 1000); 

app.get('/api/ping', async (req, res) => { 
  try {
    await prisma.$queryRaw`SELECT 1`; 
    res.status(200).json({ status: "ok", message: "A szerver ÉS az adatbázis is ébren van! ☕" }); 
  } catch (error) {
    console.error("Ébresztési hiba:", error);
    res.status(500).json({ error: "Szerver fut, de az adatbázis alszik/nem elérhető!" });
  }
});

// 📢 Újdonságok (Changelog) lekérése
app.get('/api/changelog', async (req, res) => {
  try {
    // Lekérjük az összes frissítést az adatbázisból
    const logs = await prisma.changelog.findMany();
    
    // 🌟 OKOS RENDEZÉS: Verziószám alapján csökkenő sorrendbe rakjuk
    // Ez garantálja, hogy a legnagyobb verzió (legújabb) lesz mindig legfelül, 
    // függetlenül attól, milyen sorrendben írtad a JSON fájlba!
    logs.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

    res.json(logs);
  } catch (error) {
    console.error("Hiba a changelog lekérésekor:", error);
    res.status(500).json({ error: "Nem sikerült lekérni a frissítéseket." });
  }
});

// =====================================================================
// --- VÉGPONTOK (Most már Zod védelemmel!) ---
// =====================================================================

// 🔔 ÚJ: PUSH ÉRTESÍTÉS FELIRATKOZÁS
app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user.id;

    // Megnézzük, van-e már ilyen eszköz beregisztrálva
    const existingSub = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint }
    });

    if (existingSub) {
      // Ha már létezik, frissítjük, hogy biztosan a jelenlegi userhez tartozzon
      await prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: { userId, keys: subscription.keys }
      });
    } else {
      // Ha új eszköz (pl. új telefon), elmentjük
      await prisma.pushSubscription.create({
        data: { userId, endpoint: subscription.endpoint, keys: subscription.keys }
      });
    }

    res.status(201).json({ message: "Sikeresen feliratkoztál az értesítésekre!" });
  } catch (error) {
    console.error("Hiba a push feliratkozásnál:", error);
    res.status(500).json({ error: "Hiba az értesítés beállításakor." });
  }
});

// 🔔 ÚJ: PUSH ÉRTESÍTÉS KÜLDÉSE (Szigorúan csak Adminoknak)
app.post('/api/admin/notifications/send', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, message, url } = req.body;
    
    // Lekérjük az összes feliratkozott eszközt
    const subscriptions = await prisma.pushSubscription.findMany();
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ error: "Még senki sem iratkozott fel az értesítésekre!" });
    }

    // Ezt a csomagot fogja megkapni a telefon/böngésző
    const payload = JSON.stringify({ title, body: message, url: url || '/' });
    let successCount = 0;

    // Végigmegyünk az összes eszközön, és kilőjük az üzenetet
    for (const sub of subscriptions) {
      try {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys
        };
        await webpush.sendNotification(pushConfig, payload);
        successCount++;
      } catch (err) {
        // Ha a Google/Apple visszadobja (pl. a user letiltotta az értesítést), töröljük az adatbázisból
        if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode ===403) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("Hiba egy eszköz értesítésekor:", err);
        }
      }
    }

    res.json({ message: `Értesítés sikeresen elküldve ${successCount} eszközre! 🚀` });
  } catch (error) {
    console.error("Szerverhiba értesítés küldésekor:", error);
    res.status(500).json({ error: "Belső hiba az értesítések küldésekor." });
  }
});

// 🔕 ÚJ: PUSH ÉRTESÍTÉS LEIRATKOZÁS
app.post('/api/notifications/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    // Kitöröljük az adatbázisból a telefonhoz/böngészőhöz tartozó egyedi azonosítót
    await prisma.pushSubscription.delete({
      where: { endpoint: endpoint }
    });
    
    res.json({ message: "Sikeresen leiratkoztál az értesítésekről!" });
  } catch (error) {
    // A P2025 egy Prisma hibakód: azt jelenti, hogy az adat már eleve nem is létezett
    if (error.code === 'P2025') {
      return res.json({ message: "Már le voltál iratkozva." });
    }
    console.error("Hiba leiratkozáskor:", error);
    res.status(500).json({ error: "Hiba az értesítés kikapcsolásakor." });
  }
});

// 💸 Értesítés küldése KIZÁRÓLAG a tartozóknak
app.post('/api/notifications/send-debtors', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: "Nincs jogosultságod ehhez a művelethez!" });
  }

  try {
    const { title, body } = req.body;

    // Szűrés a tartozókra a sémád alapján
    const debtorsSubscriptions = await prisma.pushSubscription.findMany({
      where: {
        user: {
          orders: {
            some: {
              isPaid: false
            }
          }
        }
      }
    });

    if (debtorsSubscriptions.length === 0) {
      return res.json({ message: "Szuper hír: Nincs olyan tartozó, akinek aktív lenne az értesítése!" });
    }

    // Értesítések kiküldése
    const sendPromises = debtorsSubscriptions.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys // Mivel a sémában Json, itt egyből használhatjuk
      };
      
      return webpush.sendNotification(pushConfig, JSON.stringify({ title, body }))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            return prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        });
    });

    await Promise.all(sendPromises);
    res.json({ message: `Sikeresen elküldve ${debtorsSubscriptions.length} tartozó eszközére!` });
  } catch (error) {
    console.error("Hiba a célzott küldéskor:", error);
    res.status(500).json({ error: "Hiba az értesítések küldésekor." });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({ data: { isVacation: false } });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Hiba a beállítások lekérésekor." });
  }
});

app.put('/api/settings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { isVacation } = req.body;
    let settings = await prisma.settings.findFirst();
    
    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { isVacation: Boolean(isVacation) }
      });
    } else {
      settings = await prisma.settings.create({ data: { isVacation: Boolean(isVacation) } });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Hiba a beállítások mentésekor." });
  }
});

app.post('/api/register', validateData(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Ezzel az email címmel már regisztráltak!" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({ data: { name, email, password: hashedPassword } });
    res.json({ message: "Sikeres regisztráció!", userId: newUser.id });
  } catch (error) { res.status(500).json({ error: "Hiba a regisztráció során." }); }
});

app.post('/api/login', validateData(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Hibás email vagy jelszó!" });
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Hibás email vagy jelszó!" });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      process.env.JWT_SECRET || 'szuper-titkos-szendvics-kulcs-2026', 
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { res.status(500).json({ error: "Hiba a bejelentkezés során." }); }
});

// 🔒 Profil frissítés validációval
app.put('/api/users/:id', authenticateToken, validateData(updateProfileSchema), async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  if (req.user.id !== parseInt(id)) return res.status(403).json({ error: "Csak a saját profilodat szerkesztheted!" });
  
  try {
    const updateData = { name, email };
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) }, data: updateData, select: { id: true, name: true, email: true, role: true} 
    });
    res.json({ message: "Adataid sikeresen frissítve!", user: updatedUser });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: "Ez az e-mail cím már foglalt!" });
    res.status(500).json({ error: "Belső szerverhiba történt." });
  }
});

// 🔒 Visszajelzés validációja
app.put('/api/orders/:id/feedback', authenticateToken, checkFeedbackWindow, validateData(feedbackSchema), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { feedback } = req.body;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "A rendelés nem található!" });

    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: "Nincs jogosultságod!" });
    if (new Date(order.createdAt) < getStartOfCurrentWeek()) return res.status(403).json({ error: "Csak az eheti rendelésekre lehet panaszt tenni!" });
    
    await prisma.order.update({ where: { id: orderId }, data: { feedback } });
    res.json({ message: "Visszajelzés sikeresen mentve!" });
  } catch (error) { res.status(500).json({ error: "Szerverhiba történt mentés közben." }); }
});

app.get('/api/sandwiches', authenticateToken, async (req, res) => {
  try {
    const sandwiches = await prisma.sandwich.findMany({ orderBy: { id: 'asc' } });
    res.json(sandwiches);
  } catch (error) { res.status(500).json({ error: "Hiba az adatbázis lekérdezésekor." }); }
});

// 🔒 Szendvics létrehozása szigorú admin és Zod (ár, név) ellenőrzéssel
app.post('/api/admin/sandwiches', authenticateToken, isAdmin, validateData(sandwichSchema), async (req, res) => {
  try {
    const { name, price } = req.body;
    const newSandwich = await prisma.sandwich.create({ data: { name, price: parseInt(price) } });
    res.json(newSandwich);
  } catch (error) { res.status(500).json({ error: "Hiba a szendvics mentésekor." }); }
});

// 🔒 Szendvics módosítása validációval
app.put('/api/admin/sandwiches/:id', authenticateToken, isAdmin, validateData(sandwichSchema), async (req, res) => {
  try {
    const sandwichId = parseInt(req.params.id);
    const { name, price, isActive } = req.body;

    const updated = await prisma.sandwich.update({
      where: { id: sandwichId },
      data: { name, price: parseInt(price), isActive: Boolean(isActive) }
    });

    if (!isActive) {
      const startOfWeek = getStartOfCurrentWeek();
      const affectedItems = await prisma.orderItem.findMany({ where: { sandwichId: sandwichId, order: { createdAt: { gte: startOfWeek } } } });
      for (let item of affectedItems) {
        await prisma.orderItem.delete({ where: { id: item.id } });
        const remainingItems = await prisma.orderItem.findMany({ where: { orderId: item.orderId }, include: { sandwich: true } });
        if (remainingItems.length === 0) {
          await prisma.order.delete({ where: { id: item.orderId } });
        } else {
          const newTotal = remainingItems.reduce((sum, i) => sum + (i.sandwich.price * i.quantity), 0);
          await prisma.order.update({ where: { id: item.orderId }, data: { totalPrice: newTotal } });
        }
      }
    }
    res.json(updated);
  } catch (error) { res.status(500).json({ error: "Hiba a szendvics frissítésekor." }); }
});

// 🔒 A legfontosabb: Rendelés leadása validációval (csak pozitív darabszám és létező kosár!)
app.post('/api/orders', authenticateToken, validateData(orderSchema), async (req, res) => {
  try {
    if (!isOrderTimeValid()) return res.status(403).json({ error: "Rendelést csak kedden, vagy szerdán délelőtt 10:00-ig lehet leadni!" });
    
    const userId = req.user.id; 
    const { items } = req.body; 
    const startOfWeek = getStartOfCurrentWeek();

    let serverCalculatedAddedPrice = 0;
    const validNewItems = [];

    for (const item of items) {
      const sandwich = await prisma.sandwich.findUnique({ where: { id: item.sandwichId } });
      if (!sandwich) return res.status(404).json({ error: `A szendvics nem található.` });
      if (!sandwich.isActive) return res.status(400).json({ error: `A(z) ${sandwich.name} jelenleg nem rendelhető!` });

      serverCalculatedAddedPrice += sandwich.price * item.quantity;
      validNewItems.push({ sandwichId: item.sandwichId, quantity: item.quantity });
    }

    const existingOrder = await prisma.order.findFirst({
      where: { userId: userId, createdAt: { gte: startOfWeek } },
      include: { items: true }
    });

    if (existingOrder) {
      for (let newItem of validNewItems) {
        const existingItem = existingOrder.items.find(i => i.sandwichId === newItem.sandwichId);
        if (existingItem) {
          await prisma.orderItem.update({
            where: { id: existingItem.id }, data: { quantity: existingItem.quantity + newItem.quantity }
          });
        } else {
          await prisma.orderItem.create({
            data: { orderId: existingOrder.id, sandwichId: newItem.sandwichId, quantity: newItem.quantity }
          });
        }
      }
      const updatedOrder = await prisma.order.update({
        where: { id: existingOrder.id }, data: { totalPrice: existingOrder.totalPrice + serverCalculatedAddedPrice } 
      });
      return res.json({ message: "Hozzáadva az eheti rendelésedhez!", order: updatedOrder });
    } else {
      const newOrder = await prisma.order.create({
        data: { userId, totalPrice: serverCalculatedAddedPrice, items: { create: validNewItems } }
      });
      return res.json({ message: "Rendelés sikeresen rögzítve!", order: newOrder });
    }
  } catch (error) { res.status(500).json({ error: "Hiba a rendelés mentésekor." }); }
});

app.get('/api/orders/user/:userId', authenticateToken, async (req, res) => {
  try {
    const paramUserId = parseInt(req.params.userId);
    if (req.user.id !== paramUserId && req.user.role !== 'ADMIN') return res.status(403).json({ error: "Nincs jogosultságod mások rendeléseit lekérdezni!" });
    
    const orders = await prisma.order.findMany({
      where: { userId: paramUserId }, include: { items: { include: { sandwich: true } } }, orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: "Hiba a rendelések lekérésekor." }); }
});

app.put('/api/order-items/:id', authenticateToken, async (req, res) => {
  try {
    if (!isOrderTimeValid()) return res.status(403).json({ error: "Módosítani csak szerda 10:00-ig lehet!" });
    const itemId = parseInt(req.params.id);
    const { newQuantity } = req.body;

    const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { sandwich: true, order: true } });
    if (!item) return res.status(404).json({ error: "A tétel nem található!" });

    if (item.order.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: "Nincs jogosultságod!" });
    if (new Date(item.order.createdAt) < getStartOfCurrentWeek()) return res.status(403).json({ error: "Korábbi hetek rendeléseit már nem lehet módosítani!" });

    if (newQuantity <= 0) {
      await prisma.orderItem.delete({ where: { id: itemId } });
    } else {
      await prisma.orderItem.update({ where: { id: itemId }, data: { quantity: newQuantity } });
    }

    const remainingItems = await prisma.orderItem.findMany({ where: { orderId: item.orderId }, include: { sandwich: true } });
    if (remainingItems.length === 0) {
      await prisma.order.delete({ where: { id: item.orderId } });
    } else {
      const newTotal = remainingItems.reduce((sum, i) => sum + (i.sandwich.price * i.quantity), 0);
      await prisma.order.update({ where: { id: item.orderId }, data: { totalPrice: newTotal } });
    }
    res.json({ message: "Sikeresen frissítve!" });
  } catch (error) { res.status(500).json({ error: "Hiba a tétel frissítésekor." }); }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    if (!isOrderTimeValid()) return res.status(403).json({ error: "Törölni csak szerda 10:00-ig lehet!" });
    const orderId = parseInt(req.params.id);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "A rendelés nem található!" });

    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: "Nincs jogosultságod!" });
    if (new Date(order.createdAt) < getStartOfCurrentWeek()) return res.status(403).json({ error: "Korábbi hetek rendeléseit már nem lehet törölni!" });

    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    res.json({ message: "Rendelés törölve!" });
  } catch (error) { res.status(500).json({ error: "Hiba a törlésnél." }); }
});

// --- ADMIN VÉGPONTOK ---
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: { select: { name: true, email: true } }, items: { include: { sandwich: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: "Hiba az adatok lekérésekor." }); }
});

app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    await prisma.orderItem.deleteMany({ where: { orderId: orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    res.json({ message: "Rendelés sikeresen törölve az admin által!" });
  } catch (error) { res.status(500).json({ error: "Szerverhiba a törlés során." }); }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { id: 'asc' } });
    res.json(users);
  } catch (error) { res.status(500).json({ error: "Hiba a felhasználók lekérésekor." }); }
});

app.put('/api/admin/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
  const { role } = req.body;
  const requesterId = req.user.id; 

  try {
    if (requesterId === parseInt(req.params.id) && role === 'USER') return res.status(403).json({ error: "Saját magadtól nem veheted el az admin jogot!" });
    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!targetUser) return res.status(404).json({ error: "A módosítandó felhasználó nem található!" });
    if (targetUser.email === 'erdelyi.peter@compmarket.hu' && role === 'USER') return res.status(403).json({ error: "A Főadminisztrátor (Superadmin) jogosultsága nem vonható meg!" });

    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role } });
    res.json({ message: "Jogosultság sikeresen módosítva!" });
  } catch (error) { res.status(500).json({ error: "Hiba a jogosultság módosításakor." }); }
});

app.put('/api/admin/orders/:id/pay', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
    const updatedOrder = await prisma.order.update({ where: { id: orderId }, data: { isPaid: !currentOrder.isPaid } });
    res.json({ message: "Fizetés frissítve!", isPaid: updatedOrder.isPaid });
  } catch (error) { res.status(500).json({ error: "Hiba a státuszváltáskor." }); }
});

app.get('/api/admin/summary', authenticateToken, isAdmin, async (req, res) => {
  try {
    const startOfWeek = getStartOfCurrentWeek();
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startOfWeek } },
      include: { items: { include: { sandwich: true } } }
    });

    let totalQuantity = 0; let totalPrice = 0; const itemsSummary = {};
    orders.forEach(order => {
      totalPrice += order.totalPrice;
      order.items.forEach(item => {
        totalQuantity += item.quantity;
        const name = item.sandwich.name;
        itemsSummary[name] = (itemsSummary[name] || 0) + item.quantity;
      });
    });
    res.json({ totalQuantity, totalPrice, itemsSummary });
  } catch (error) { res.status(500).json({ error: "Hiba az összesítésnél." }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 A szerver sikeresen elindult a http://localhost:${PORT} címen!`));
