const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Teszt adatok generálása indult...');

  // 1. Teszt felhasználó létrehozása
  const hashedPassword = await bcrypt.hash('jelszo123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'teszt@ceg.hu' },
    update: {},
    create: {
      name: 'Teszt Elek',
      email: 'teszt@ceg.hu',
      password: hashedPassword,
      role: 'USER'
    },
  });
  console.log(`👤 Létrehozva: ${testUser.name} (Belépés: teszt@ceg.hu / jelszo123)`);

  // 2. Keresünk egy szendvicset, vagy ha egyáltalán nincs az adatbázisban, csinálunk egyet
  let targetSandwich = await prisma.sandwich.findFirst();
  
  if (!targetSandwich) {
    targetSandwich = await prisma.sandwich.create({
      data: { name: 'Teszt Szalámis', price: 1200 }
    });
    console.log(`🥪 Új teszt szendvics létrehozva: ${targetSandwich.name}`);
  } else {
    console.log(`🥪 Meglévő szendvics kiválasztva: ${targetSandwich.name}`);
  }

  // 3. Múlt heti (kifizetetlen) rendelés generálása
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 12); 

  const oldOrder = await prisma.order.create({
    data: {
      userId: testUser.id,
      totalPrice: targetSandwich.price * 2,
      isPaid: false, 
      createdAt: pastDate,
      items: {
        create: [
          { sandwichId: targetSandwich.id, quantity: 2 }
        ]
      }
    }
  });

  console.log(`📦 Múlt heti teszt rendelés létrehozva!`);
  console.log(`📅 Dátum: ${pastDate.toLocaleString('hu-HU')}`);
  console.log(`💰 Tartozás: ${oldOrder.totalPrice} Ft`);
}

main()
  .catch(e => {
    console.error("❌ Hiba történt a generálás során:");
    console.error(e);
  })
  .finally(async () => await prisma.$disconnect());