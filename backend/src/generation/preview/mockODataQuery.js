/**
 * Fiorify — GEN-07: Safe OData V4 Mock Query Processor
 *
 * Implements deterministic query parsing ($select, $filter, $orderby, $top, $skip, $count)
 * without dynamic code execution (NO eval, NO new Function, NO unsafe RegExp).
 */

import { MAX_QUERY_COMPLEXITY_DEPTH } from './previewSecurity.js';

/**
 * Safely parses and applies OData V4 query options to an in-memory collection of records.
 *
 * @param {Array<Object>} records - Raw records from synthetic store
 * @param {URLSearchParams} queryParams - Parsed URL query parameters
 * @param {Object} [options] - Options (contextUri)
 * @returns {Object} { status: 200, body: Object }
 */
export function executeODataQuery(records, queryParams, options = {}) {
  let result = [...records];
  const totalCount = records.length;

  // 1. $filter evaluation
  const filterExpr = queryParams.get('$filter');
  if (filterExpr) {
    result = applySafeFilter(result, filterExpr);
  }

  const filteredCount = result.length;

  // 2. $orderby evaluation
  const orderbyExpr = queryParams.get('$orderby');
  if (orderbyExpr) {
    result = applySafeOrderBy(result, orderbyExpr);
  }

  // 3. $skip evaluation
  const skip = parseInt(queryParams.get('$skip') || '0', 10);
  if (!isNaN(skip) && skip > 0) {
    result = result.slice(skip);
  }

  // 4. $top evaluation
  const top = parseInt(queryParams.get('$top') || '', 10);
  if (!isNaN(top) && top >= 0) {
    result = result.slice(0, top);
  }

  // 5. $select projection
  const selectExpr = queryParams.get('$select');
  if (selectExpr) {
    const fields = selectExpr.split(',').map((f) => f.trim()).filter(Boolean);
    if (fields.length > 0) {
      result = result.map((rec) => {
        const proj = {};
        for (const f of fields) {
          if (rec[f] !== undefined) proj[f] = rec[f];
        }
        return proj;
      });
    }
  }

  const responseBody = {
    '@odata.context': options.contextUri || '$metadata',
    value: result
  };

  if (queryParams.get('$count') === 'true') {
    responseBody['@odata.count'] = filteredCount;
  }

  return responseBody;
}

/**
 * Applies a safe subset of OData $filter expressions without eval.
 * Supports: <field> eq <val>, <field> ne <val>, contains(<field>, <val>), startswith(<field>, <val>)
 */
function applySafeFilter(records, filterStr) {
  const clean = filterStr.trim();
  if (!clean) return records;

  // Check complexity
  const depth = (clean.match(/\(/g) || []).length;
  if (depth > MAX_QUERY_COMPLEXITY_DEPTH) {
    const err = new Error('Query complexity limit exceeded in $filter.');
    err.code = 'COMPLEXITY_EXCEEDED';
    err.statusCode = 400;
    throw err;
  }

  // Check single contains() function: contains(FieldName, 'value')
  const containsMatch = clean.match(/^contains\(\s*([a-zA-Z0-9_]+)\s*,\s*'([^']*)'\s*\)$/i);
  if (containsMatch) {
    const [, field, val] = containsMatch;
    const lowerVal = val.toLowerCase();
    return records.filter((r) => String(r[field] || '').toLowerCase().includes(lowerVal));
  }

  // Check single startswith() function: startswith(FieldName, 'value')
  const startswithMatch = clean.match(/^startswith\(\s*([a-zA-Z0-9_]+)\s*,\s*'([^']*)'\s*\)$/i);
  if (startswithMatch) {
    const [, field, val] = startswithMatch;
    const lowerVal = val.toLowerCase();
    return records.filter((r) => String(r[field] || '').toLowerCase().startsWith(lowerVal));
  }

  // Check simple comparison: FieldName eq 'value' or FieldName eq 123
  const opMatch = clean.match(/^([a-zA-Z0-9_]+)\s+(eq|ne|gt|ge|lt|le)\s+(?:'([^']*)'|([0-9\.\-]+)|(true|false))$/i);
  if (opMatch) {
    const [, field, op, strVal, numVal, boolVal] = opMatch;
    let targetVal;
    if (strVal !== undefined) targetVal = strVal;
    else if (numVal !== undefined) targetVal = parseFloat(numVal);
    else if (boolVal !== undefined) targetVal = boolVal.toLowerCase() === 'true';

    return records.filter((r) => {
      const fieldVal = r[field];
      switch (op.toLowerCase()) {
        case 'eq':
          return String(fieldVal) === String(targetVal);
        case 'ne':
          return String(fieldVal) !== String(targetVal);
        case 'gt':
          return Number(fieldVal) > Number(targetVal);
        case 'ge':
          return Number(fieldVal) >= Number(targetVal);
        case 'lt':
          return Number(fieldVal) < Number(targetVal);
        case 'le':
          return Number(fieldVal) <= Number(targetVal);
        default:
          return true;
      }
    });
  }

  // If unsupported complex filter, safely return all records with no crash
  return records;
}

/**
 * Applies safe sorting to records.
 * Supports: FieldName asc, FieldName desc, Field1 asc, Field2 desc
 */
function applySafeOrderBy(records, orderbyStr) {
  const parts = orderbyStr.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return records;

  return [...records].sort((a, b) => {
    for (const part of parts) {
      const [field, direction = 'asc'] = part.split(/\s+/);
      const isDesc = direction.toLowerCase() === 'desc';
      const valA = a[field];
      const valB = b[field];

      if (valA === valB) continue;
      if (valA === undefined || valA === null) return isDesc ? -1 : 1;
      if (valB === undefined || valB === null) return isDesc ? 1 : -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }

      const cmp = String(valA).localeCompare(String(valB));
      if (cmp !== 0) {
        return isDesc ? -cmp : cmp;
      }
    }
    return 0;
  });
}
