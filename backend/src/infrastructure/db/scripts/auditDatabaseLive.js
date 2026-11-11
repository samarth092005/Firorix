import DatabasePool from '../pool.js';

async function auditDatabase() {
  console.log('Connecting to PostgreSQL...');
  const pool = await DatabasePool.getPool();
  const client = await pool.connect();

  try {
    // 1. Version & Current DB
    const verRes = await client.query('SELECT version();');
    const dbRes = await client.query('SELECT current_database(), current_schema();');
    console.log('\n--- POSTGRESQL VERSION & CONTEXT ---');
    console.log(`Version: ${verRes.rows[0].version}`);
    console.log(`Database: ${dbRes.rows[0].current_database}, Schema: ${dbRes.rows[0].current_schema}`);

    // 2. Extensions
    const extRes = await client.query('SELECT extname, extversion FROM pg_extension;');
    console.log('\n--- EXTENSIONS ---');
    for (const r of extRes.rows) {
      console.log(`- ${r.extname} (${r.extversion})`);
    }

    // 3. Tables
    const tabRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`\n--- TABLES IN PUBLIC SCHEMA (${tabRes.rowCount}) ---`);
    for (const r of tabRes.rows) {
      console.log(`- ${r.table_name}`);
    }

    // 4. Enums
    const enumRes = await client.query(`
      SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      GROUP BY t.typname;
    `);
    console.log(`\n--- ENUMS (${enumRes.rowCount}) ---`);
    for (const r of enumRes.rows) {
      console.log(`- ${r.typname}: [${r.values}]`);
    }

    // 5. Columns & Types
    const colRes = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    const tables = {};
    for (const r of colRes.rows) {
      if (!tables[r.table_name]) tables[r.table_name] = [];
      tables[r.table_name].push(`${r.column_name} (${r.data_type}${r.is_nullable === 'NO' ? ' NOT NULL' : ''})`);
    }
    console.log('\n--- TABLE COLUMNS ---');
    for (const [t, cols] of Object.entries(tables)) {
      console.log(`\nTable: ${t} (${cols.length} columns)`);
      for (const c of cols) {
        console.log(`    ${c}`);
      }
    }

    // 6. Foreign Keys
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `);
    console.log(`\n--- FOREIGN KEYS (${fkRes.rowCount}) ---`);
    for (const r of fkRes.rows) {
      console.log(`- ${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`);
    }

    // 7. Indexes
    const idxRes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log(`\n--- INDEXES (${idxRes.rowCount}) ---`);
    for (const r of idxRes.rows) {
      console.log(`- ${r.tablename}: ${r.indexname}`);
    }

    // 8. Migration History
    const migRes = await client.query('SELECT * FROM schema_migrations ORDER BY applied_at;');
    console.log(`\n--- MIGRATION HISTORY (${migRes.rowCount}) ---`);
    for (const r of migRes.rows) {
      console.log(`- Version ${r.version}: ${r.name} (Applied: ${r.applied_at}, Checksum: ${r.checksum})`);
    }

    // 9. Pool Health Check
    const health = await DatabasePool.healthCheck();
    console.log('\n--- POOL STATUS ---');
    console.log(JSON.stringify(health, null, 2));

  } finally {
    client.release();
    await DatabasePool.close();
  }
}

auditDatabase().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
