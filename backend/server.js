require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

// A Prisma automatikusan a .env fájlból olvassa ki az elérést!
const prisma = new PrismaClient();



const app = express();
app.use(cors());
app.use(express.json());

// Segédfüggvény az aktuális hét hétfőjének kiszámításához (00:00:00)
const getStartOfCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay() || 7; // Ha vasárnap (0), legyen 7
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

const isOrderTimeValid = () => {
  //const now = new Date();
  const now = new Date('2026-05-26T12:00:00Z'); // TESZTELÉSHEZ FIX IDŐPONT! Élesben: const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  // Kedd (2) egész nap VAGY Szerda (3) és 10 óra előtt
  return day === 2 || (day === 3 && hours < 10);
};

// AUTOMATIKUS TISZTÍTÁS: 3 hétnél régebbi, fizetett rendelések törlése
const cleanupOldOrders = async () => {
  try {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    
    // Először a kapcsolódó tételeket töröljük az adatbázis kényszerek miatt
    await prisma.orderItem.deleteMany({
      where: { order: { createdAt: { lt: threeWeeksAgo }, isPaid: true } }
    });
    
    const deleted = await prisma.order.deleteMany({
      where: { createdAt: { lt: threeWeeksAgo }, isPaid: true }
    });
    
    if (deleted.count > 0) {
      console.log(`🧹 Adatbázis karbantartás: ${deleted.count} régi, kifizetett rendelés törölve.`);
    }
  } catch (err) {
    console.error("Hiba a karbantartás során:", err);
  }
};
// Futtatás a szerver elindulásakor
cleanupOldOrders();

// --- AUTH VÉGPONTOK ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Ezzel az email címmel már regisztráltak!" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({ data: { name, email, password: hashedPassword } });
    res.json({ message: "Sikeres regisztráció!", userId: newUser.id });
  } catch (error) { res.status(500).json({ error: "Hiba a regisztráció során." }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Hibás email vagy jelszó!" });
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Hibás email vagy jelszó!" });
    
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) { res.status(500).json({ error: "Hiba a bejelentkezés során." }); }
});

// --- SZENDVICS KEZELÉS ---
app.get('/api/sandwiches', async (req, res) => {
  try {
    const sandwiches = await prisma.sandwich.findMany({ orderBy: { id: 'asc' } });
    res.json(sandwiches);
  } catch (error) { res.status(500).json({ error: "Hiba az adatbázis lekérdezésekor." }); }
});

app.post('/api/admin/sandwiches', async (req, res) => {
  try {
    const { name, price } = req.body;
    const newSandwich = await prisma.sandwich.create({ data: { name, price: parseInt(price) } });
    res.json(newSandwich);
  } catch (error) { res.status(500).json({ error: "Hiba a szendvics mentésekor." }); }
});

app.put('/api/admin/sandwiches/:id', async (req, res) => {
  try {
    const sandwichId = parseInt(req.params.id);
    const { name, price, isActive } = req.body;

    // 1. Frissítjük a szendvicset
    const updated = await prisma.sandwich.update({
      where: { id: sandwichId },
      data: { name, price: parseInt(price), isActive: Boolean(isActive) }
    });

    // 2. Ha inaktív lett, kivesszük a nyitott (eheti) rendelésekből
    if (!isActive) {
      const startOfWeek = getStartOfCurrentWeek();

      // Kikeressük az eheti rendeléseket, amikben benne van ez a szendvics
      const affectedItems = await prisma.orderItem.findMany({
        where: {
          sandwichId: sandwichId,
          order: { createdAt: { gte: startOfWeek } }
        }
      });

      for (let item of affectedItems) {
        // Töröljük a tételt
        await prisma.orderItem.delete({ where: { id: item.id } });

        // Újraszámoljuk a rendelés összegét a megmaradt tételekből
        const remainingItems = await prisma.orderItem.findMany({
          where: { orderId: item.orderId },
          include: { sandwich: true }
        });

        if (remainingItems.length === 0) {
          // Ha kiürült a rendelés (csak ezt a szendvicset rendelte), töröljük az egészet
          await prisma.order.delete({ where: { id: item.orderId } });
        } else {
          // Különben frissítjük az árat
          const newTotal = remainingItems.reduce((sum, i) => sum + (i.sandwich.price * i.quantity), 0);
          await prisma.order.update({
            where: { id: item.orderId },
            data: { totalPrice: newTotal }
          });
        }
      }
    }
    res.json(updated);
  } catch (error) { 
    res.status(500).json({ error: "Hiba a szendvics frissítésekor." }); 
  }
});

// --- RENDELÉSEK (SZIGORÚ HEI BONTÁSSAL) ---
app.post('/api/orders', async (req, res) => {
  try {
    if (!isOrderTimeValid()) return res.status(403).json({ error: "Rendelést csak kedden, vagy szerdán délelőtt 10:00-ig lehet leadni!" });
    const { userId, items, totalPrice } = req.body;
    const startOfWeek = getStartOfCurrentWeek();

    // Csak az eheti meglévő rendelést keressük meg
    const existingOrder = await prisma.order.findFirst({
      where: { userId: userId, createdAt: { gte: startOfWeek } },
      include: { items: true }
    });

    if (existingOrder) {
      for (let newItem of items) {
        const existingItem = existingOrder.items.find(i => i.sandwichId === newItem.sandwichId);
        if (existingItem) {
          await prisma.orderItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + newItem.quantity }
          });
        } else {
          await prisma.orderItem.create({
            data: { orderId: existingOrder.id, sandwichId: newItem.sandwichId, quantity: newItem.quantity }
          });
        }
      }
      const updatedOrder = await prisma.order.update({
        where: { id: existingOrder.id },
        data: { totalPrice: existingOrder.totalPrice + totalPrice }
      });
      return res.json({ message: "Hozzáadva az eheti rendelésedhez!", order: updatedOrder });
    } else {
      const newOrder = await prisma.order.create({
        data: {
          userId, totalPrice,
          items: { create: items.map(item => ({ sandwichId: item.sandwichId, quantity: item.quantity })) }
        }
      });
      return res.json({ message: "Rendelés sikeresen rögzítve!", order: newOrder });
    }
  } catch (error) { res.status(500).json({ error: "Hiba a rendelés mentésekor." }); }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: parseInt(req.params.userId) },
      include: { items: { include: { sandwich: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: "Hiba a rendelések lekérésekor." }); }
});

// LIVE RENDELÉS-TÉTEL SZERKESZTÉS (+/-)
app.put('/api/order-items/:id', async (req, res) => {
  try {
    if (!isOrderTimeValid()) return res.status(403).json({ error: "Módosítani csak szerda 10:00-ig lehet!" });
    const itemId = parseInt(req.params.id);
    const { newQuantity } = req.body;

    const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { sandwich: true } });
    if (!item) return res.status(404).json({ error: "A tétel nem található!" });

    if (newQuantity <= 0) {
      await prisma.orderItem.delete({ where: { id: itemId } });
    } else {
      await prisma.orderItem.update({ where: { id: itemId }, data: { quantity: newQuantity } });
    }

    // Újraszámoljuk a rendelés végösszegét
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

// TELJES TÖRLÉS
app.delete('/api/orders/:id', async (req, res) => {
  try {
    if (!isOrderTimeValid()) return res.status(403).json({ error: "Törölni csak szerda 10:00-ig lehet!" });
    const orderId = parseInt(req.params.id);
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    res.json({ message: "Rendelés törölve!" });
  } catch (error) { res.status(500).json({ error: "Hiba a törlésnél." }); }
});

// --- ADMIN CONTROL ---
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: { select: { name: true, email: true } }, items: { include: { sandwich: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: "Hiba az adatok lekérésekor." }); }
});

app.put('/api/admin/orders/:id/pay', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
    const updatedOrder = await prisma.order.update({ where: { id: orderId }, data: { isPaid: !currentOrder.isPaid } });
    res.json({ message: "Fizetés frissítve!", isPaid: updatedOrder.isPaid });
  } catch (error) { res.status(500).json({ error: "Hiba a státuszváltáskor." }); }
});

// CSŐSZÍTŐ: Kifejezetten csak az eheti tételeket adja össze
app.get('/api/admin/summary', async (req, res) => {
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