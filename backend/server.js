require('dotenv').config({ path: './prisma/.env' });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod'); // 🛡️ ÚJ IMPORT: Zod validációs könyvtár

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// =====================================================================
// 🛡️ BIZTONSÁG 2.0: ZOD VALIDÁCIÓS SÉMÁK
// =====================================================================

const registerSchema = z.object({
  name: z.string().min(3, "A névnek legalább 3 karakternek kell lennie!").max(50, "A név túl hosszú!"),
  email: z.string().email("Érvénytelen e-mail cím formátum!"),
  password: z.string().min(3, "A jelszónak legalább 3 karakterből kell állnia!")
});

const loginSchema = z.object({
  email: z.string().email("Érvénytelen e-mail cím formátum!"),
  password: z.string().min(3, "A jelszó megadása kötelező!")
});

const updateProfileSchema = z.object({
  name: z.string().min(3, "A név legalább 3 karakter kell legyen!").max(50),
  email: z.string().email("Érvénytelen e-mail cím!"),
  // A jelszó opcionális, de ha megadják, min 3 karakter kell legyen
  password: z.string().optional().refine(val => !val || val.length >= 3, "Az új jelszónak legalább 3 karakternek kell lennie!")
});

const sandwichSchema = z.object({
  name: z.string().min(3, "A szendvics neve legalább 3 karakter legyen!").max(50, "Túl hosszú név!"),
  // A coerce.number() biztosítja, hogy ha a frontend "1200" szövegként küldi, számmá alakítja
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

// 🛡️ A VALIDÁCIÓS ŐRSZEM (Middleware)
// Ez a kis blokk elfogja a kérést, leellenőrzi a Zod sémával, és azonnal visszadobja, ha rossz az adat!
// 🛡️ BIZTONSÁGI ŐRSZEM - VÉGLEGES, GOLYÓÁLLÓ VERZIÓ
const validateData = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      // Biztonságos kiolvasás: megpróbálja az 'issues'-t, majd az 'errors'-t. 
      // Ha egyik sincs, nem fagy le, hanem beugrik az alapértelmezett szöveg!
      const errorMessage = 
        result.error?.issues?.[0]?.message || 
        result.error?.errors?.[0]?.message || 
        "Helytelen vagy hiányos adatok lettek beküldve!";
        
      return res.status(400).json({ error: errorMessage });
    }
    
    // Ha minden jó, mehet tovább a végpontra!
    next();
  };
};

// =====================================================================
// --- KORÁBBI BIZTONSÁGI KÖZTESRÉTEGEK (JWT & Admin) ---
// =====================================================================

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
    // 🛡️ BIZTONSÁGOS ÉBRENTARTÁS: Küldünk egy villámgyors "üres" kérdést a Prismán át
    await prisma.$queryRaw`SELECT 1`; 
    res.status(200).json({ status: "ok", message: "A szerver ÉS az adatbázis is ébren van! ☕" }); 
  } catch (error) {
    console.error("Ébresztési hiba:", error);
    res.status(500).json({ error: "Szerver fut, de az adatbázis alszik/nem elérhető!" });
  }
});

// =====================================================================
// --- VÉGPONTOK (Most már Zod védelemmel!) ---
// =====================================================================

// 🔒 Itt kapja meg a validateData az ő feladatát!
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

// 🔒 Visszajelzés validációja (min 5 karakter!)
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
      // A negatív és nulla darabszámokat már a Zod elkapta a kapuban!
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