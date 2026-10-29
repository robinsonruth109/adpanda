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
    if (process.argv.includes("--require-migrated")) {
      const expected = ["User", "Session", "Merchant", "MerchantMember", "Kitchen", "MenuCategory", "MenuItem", "Order", "Rider", "LedgerAccount", "_prisma_migrations"];
      const missing = expected.filter((name) => !names.includes(name));
      if (missing.length) throw new Error("Migration validation failed: missing tables " + missing.join(", "));
      const rows = await prisma.$queryRawUnsafe("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = ? ORDER BY started_at DESC LIMIT 1", "20261022_initial");
      if (!rows.some((r) => r.migration_name === "20261022_initial" && r.finished_at && !r.rolled_back_at))
        throw new Error("Migration validation failed: initial migration not recorded as successful");
      console.log("[AdPanda schema inventory] VERIFIED: initial migration applied and essential tables present.");
    }
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
