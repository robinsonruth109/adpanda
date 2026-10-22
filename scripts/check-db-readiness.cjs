// Read-only MySQL schema inventory. Never creates or alters tables.
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const database = await prisma.$queryRawUnsafe("SELECT DATABASE() AS databaseName");
    const tables = await prisma.$queryRawUnsafe(
      "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    );
    const names = tables.map((r) => r.tableName);
    const migrationTable = names.includes("_prisma_migrations");
    console.log("[AdPanda schema inventory] Connected: yes");
    console.log("[AdPanda schema inventory] Schema:", database[0]?.databaseName ? "(database selected)" : "(missing)");
    console.log("[AdPanda schema inventory] Tables count:", names.length);
    console.log("[AdPanda schema inventory] Table names:", names.join(", ") || "(empty)");
    console.log("[AdPanda schema inventory] Prisma migration history:", migrationTable ? "present" : "absent");
    if (names.length > 0 && !migrationTable) {
      console.log("[AdPanda schema inventory] CAUTION: existing tables without Prisma history. DO NOT apply initial migration until reconciled.");
    } else if (names.length === 0) {
      console.log("[AdPanda schema inventory] Empty schema; initial migration candidate may be applicable after backup/review.");
    } else {
      console.log("[AdPanda schema inventory] Schema exists. Check prisma migrate status separately.");
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error("[AdPanda schema inventory] FAILED:", error?.code || error?.message || String(error));
  process.exitCode = 1;
});
