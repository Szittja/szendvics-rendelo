require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://admin:password123@localhost:5432/sandwich_db"
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("⏳ Admin jogosultság beállítása...");
  
  // Minden eddig regisztrált felhasználó ADMIN lesz
  const updatedUsers = await prisma.user.updateMany({
    data: { role: 'ADMIN' },
  });

  console.log(`✅ Sikeresen beállítottuk az ADMIN jogosultságot ${updatedUsers.count} felhasználónak!`);
}

main()
  .catch((e) => {
    console.error("Hiba történt:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });