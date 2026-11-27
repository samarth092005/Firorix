/**
 * Fiorify — SQL Dialect Helper (PostgreSQL & SAP HANA Cloud)
 *
 * Provides dialect-aware SQL generation, parameter expansion ($N -> ?),
 * case-insensitive search, and upsert (ON CONFLICT vs MERGE INTO) helpers
 * so repositories work cleanly on both local PostgreSQL and SAP HANA Cloud.
 */

export function getActiveDialect(poolOrAdapter) {
  if (poolOrAdapter && typeof poolOrAdapter.getDialect === 'function') {
    return poolOrAdapter.getDialect();
  }
  const env = (
    process.env.FIORIFY_DB_DIALECT ||
    process.env.FIORIFY_DATABASE_ADAPTER ||
    process.env.FIORIFY_PERSISTENCE ||
    ''
  ).toLowerCase();
  if (env === 'hana') return 'hana';
  if (env === 'postgres') return 'postgres';
  return process.env.NODE_ENV === 'production' ? 'hana' : 'postgres';
}

/**
 * Converts PostgreSQL-style $1, $2 placeholders to positional ? placeholders for HANA,
 * expanding the params array in exact placeholder order (handles reused $N params).
 */
export function adaptParameterizedSql(sql, params = [], dialect = 'postgres') {
  if (dialect !== 'hana' || !sql || typeof sql !== 'string') {
    return { sql, params };
  }
  const expandedParams = [];
  const adaptedSql = sql.replace(/\$(\d+)/g, (_match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    expandedParams.push(params[idx]);
    return '?';
  });
  return { sql: adaptedSql, params: expandedParams };
}

/**
 * Generates a dialect-safe case-insensitive LIKE expression using $N placeholder.
 */
export function caseInsensitiveLike(column, paramIndex, dialect = 'postgres') {
  if (dialect === 'hana') {
    return `LOWER(${column}) LIKE LOWER($${paramIndex})`;
  }
  return `${column} ILIKE $${paramIndex}`;
}

/**
 * Generates a dialect-safe UPSERT statement (ON CONFLICT for Postgres, MERGE INTO for HANA).
 * Expects $1..$N placeholders matching `columns` order.
 */
export function buildUpsertSql({ table, conflictCols, columns, updateCols = [], dialect = 'postgres' }) {
  if (dialect === 'hana') {
    const selectCols = columns.map((col, idx) => `$${idx + 1} AS ${col}`).join(', ');
    const onClause = conflictCols.map((c) => `target.${c} = src.${c}`).join(' AND ');
    const insertCols = columns.join(', ');
    const insertVals = columns.map((c) => `src.${c}`).join(', ');

    if (updateCols.length === 0) {
      return `MERGE INTO ${table} AS target
        USING (SELECT ${selectCols} FROM DUMMY) AS src
        ON (${onClause})
        WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})`;
    }

    const updateClause = updateCols.map((c) => `target.${c} = src.${c}`).join(', ');
    return `MERGE INTO ${table} AS target
      USING (SELECT ${selectCols} FROM DUMMY) AS src
      ON (${onClause})
      WHEN MATCHED THEN UPDATE SET ${updateClause}
      WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})`;
  }

  const placeholders = columns.map((_c, idx) => `$${idx + 1}`).join(', ');
  const conflictTarget = conflictCols.join(', ');
  if (updateCols.length === 0) {
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO NOTHING;`;
  }
  const updateSet = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSet};`;
}

/**
 * Translates common PostgreSQL-isms (ILIKE, ::casts, set_config, BEGIN) for HANA compatibility.
 */
export function translatePostgresSqlToHana(sql, params = []) {
  if (!sql || typeof sql !== 'string') return { sql, params, skip: false };
  const trimmed = sql.trim().replace(/;+$/, '');

  // Transaction control & Postgres session config
  if (/^BEGIN$/i.test(trimmed)) {
    return { sql: null, params: [], skip: true };
  }
  if (/^COMMIT$/i.test(trimmed)) {
    return { sql: null, params: [], skip: true };
  }
  if (/^ROLLBACK$/i.test(trimmed)) {
    return { sql: null, params: [], skip: true };
  }
  if (/SELECT\s+set_config\s*\(\s*'app\.current_tenant'/i.test(trimmed)) {
    return { sql: "SET 'TENANT_ID' = ?", params: [params[0]], skip: false };
  }

  let normalized = sql
    // Remove Postgres-specific ::type casts (e.g. $9::timestamptz, $1::jsonb)
    .replace(/::[a-zA-Z0-9_]+/g, '')
    // Replace ILIKE with LOWER(a) LIKE LOWER(b)
    .replace(/([a-zA-Z0-9_.]+)\s+ILIKE\s+(\$\d+)/gi, 'LOWER($1) LIKE LOWER($2)');

  // Convert simple INSERT ... ON CONFLICT (...) DO NOTHING / DO UPDATE to HANA MERGE INTO
  const onConflictMatch = normalized.match(
    /INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*ON\s+CONFLICT\s*\(([^)]+)\)\s*DO\s+(NOTHING|UPDATE\s+SET\s+[\s\S]+?)(?:\s+RETURNING\s+[\s\S]+?)?;?\s*$/i
  );
  if (onConflictMatch) {
    const [, table, colsRaw, valsRaw, conflictRaw, actionRaw] = onConflictMatch;
    const cols = colsRaw.split(',').map((s) => s.trim());
    const vals = valsRaw.split(',').map((s) => s.trim());
    const conflictCols = conflictRaw.split(',').map((s) => s.trim());

    if (cols.length === vals.length) {
      const selectCols = cols.map((col, idx) => `${vals[idx]} AS ${col}`).join(', ');
      const onClause = conflictCols.map((c) => `target.${c} = src.${c}`).join(' AND ');
      const insertCols = cols.join(', ');
      const insertVals = cols.map((c) => `src.${c}`).join(', ');

      if (/^NOTHING$/i.test(actionRaw.trim())) {
        normalized = `MERGE INTO ${table} AS target USING (SELECT ${selectCols} FROM DUMMY) AS src ON (${onClause}) WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})`;
      } else {
        const setPart = actionRaw.replace(/^UPDATE\s+SET\s+/i, '').trim();
        const assignments = setPart
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
          .map((a) => {
            const [lhs, rhs] = a.split('=').map((x) => x.trim());
            const hanaRhs = rhs
              .replace(/EXCLUDED\.([a-zA-Z0-9_]+)/gi, 'src.$1')
              .replace(new RegExp(`${table}\\.([a-zA-Z0-9_]+)`, 'gi'), 'target.$1');
            return `target.${lhs} = ${hanaRhs}`;
          })
          .join(', ');
        normalized = `MERGE INTO ${table} AS target USING (SELECT ${selectCols} FROM DUMMY) AS src ON (${onClause}) WHEN MATCHED THEN UPDATE SET ${assignments} WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})`;
      }
    }
  }

  // Strip trailing RETURNING ... if still present on INSERT/UPDATE
  normalized = normalized.replace(/\s+RETURNING\s+[^;]+;?\s*$/i, '');

  const { sql: adaptedSql, params: expandedParams } = adaptParameterizedSql(normalized, params, 'hana');
  return { sql: adaptedSql, params: expandedParams, skip: false };
}

/**
 * Wraps a HanaAdapter in a DatabasePool-compatible interface for repositories.
 */
export function createHanaPoolWrapper(hanaAdapter) {
  const execQuery = async (sql, params = []) => {
    const { sql: hanaSql, params: hanaParams, skip } = translatePostgresSqlToHana(sql, params);
    if (skip || !hanaSql) {
      return { rows: [], rowCount: 0 };
    }
    // Pass already-adapted ? SQL directly through hanaAdapter
    return hanaAdapter.query(hanaSql, hanaParams);
  };

  return {
    getDialect: () => 'hana',
    query: execQuery,
    getClient: async () => {
      await hanaAdapter.getClient();
      return {
        query: execQuery,
        release: () => {}
      };
    },
    connect: async () => {
      await hanaAdapter.getClient();
      return {
        query: execQuery,
        release: () => {}
      };
    }
  };
}

/**
 * Returns the active pool/adapter for repositories (HANA wrapper when dialect=hana, else Postgres pool).
 */
export async function resolveRepositoryPool(explicitPool, defaultDatabaseAdapter) {
  if (getActiveDialect(explicitPool) === 'hana') {
    if (explicitPool && typeof explicitPool.getDialect === 'function' && explicitPool.getDialect() === 'hana') {
      return createHanaPoolWrapper(explicitPool);
    }
    return createHanaPoolWrapper(defaultDatabaseAdapter);
  }
  return explicitPool;
}
