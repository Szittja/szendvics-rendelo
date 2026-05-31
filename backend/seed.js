require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Kapcsolat felépítése (ugyanaz, mint a szervernél)
const pool = new Pool({
  connectionString: "postgresql://admin:password123@localhost:5432/sandwich_db"
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("⏳ Szendvicsek feltöltése indul...");
  
  // Szendvicsek beszúrása az adatbázisba
  await prisma.sandwich.createMany({
    data: [
      { name: "Zöldséges melles", price: 1200 },
      { name: "Zöldséges combos", price: 1100 },
      { name: "Csípős melles", price: 1400 },
      { name: "Csípős combos", price: 1800 }
    ]
  });

  console.log("✅ Szendvicsek sikeresen hozzáadva az adatbázishoz!");
}

// A kód futtatása, majd a kapcsolat lezárása
main()
  .catch((e) => {
    console.error("Hiba történt:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });