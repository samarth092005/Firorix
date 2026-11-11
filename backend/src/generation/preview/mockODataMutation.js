/**
 * FioriX — GEN-07: Mock OData Mutation Processor
 *
 * Implements Create, Update, Delete for mock OData V4 endpoints with strict
 * enforcement of architecture profile permissions (READ_ONLY_QUERY rejection).
 */

import { RAP_PROFILES } from '../architecture/architectureContract.js';

/**
 * Handles an OData Create (POST) request on an EntitySet.
 */
export function executeCreate(entity, payload, syntheticStore, architecture) {
  if (architecture?.selectedProfile === RAP_PROFILES.READ_ONLY_QUERY) {
    const err = new Error('Create operations are not permitted for the READ_ONLY_QUERY architecture profile.');
    err.code = 'PROFILE_READ_ONLY';
    err.statusCode = 405;
    throw err;
  }

  const fields = entity.fields || [];
  const keyField = fields.find((f) => f.isKey) || fields[0];
  const newRecord = { ...payload };

  // Validate mandatory fields
  for (const f of fields) {
    if (f.isMandatory && !f.isKey && (newRecord[f.name] === undefined || newRecord[f.name] === '')) {
      const err = new Error(`Mandatory field "${f.name}" is missing in create payload.`);
      err.code = 'MANDATORY_FIELD_MISSING';
      err.statusCode = 400;
      throw err;
    }
  }

  // Ensure key is populated with synthetic MOCK- prefix
  if (keyField && (!newRecord[keyField.name] || newRecord[keyField.name] === '')) {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    newRecord[keyField.name] = `MOCK-${nextNum}`;
  }

  // Set administrative tracking fields
  const now = new Date().toISOString();
  newRecord.CreatedBy = 'MOCK_ADMIN';
  newRecord.CreatedAt = now;
  newRecord.LastChangedBy = 'MOCK_ADMIN';
  newRecord.LastChangedAt = now;
  newRecord.LocalLastChangedAt = now;

  const records = syntheticStore[entity.name] || [];
  records.push(newRecord);
  syntheticStore[entity.name] = records;

  return {
    status: 201,
    record: newRecord
  };
}

/**
 * Handles an OData Update (PATCH / PUT) request on an entity instance.
 */
export function executeUpdate(entity, keyVal, payload, syntheticStore, architecture) {
  if (architecture?.selectedProfile === RAP_PROFILES.READ_ONLY_QUERY) {
    const err = new Error('Update operations are not permitted for the READ_ONLY_QUERY architecture profile.');
    err.code = 'PROFILE_READ_ONLY';
    err.statusCode = 405;
    throw err;
  }

  const fields = entity.fields || [];
  const keyField = fields.find((f) => f.isKey) || fields[0];
  const records = syntheticStore[entity.name] || [];
  const index = records.findIndex((r) => String(r[keyField.name]) === String(keyVal));

  if (index === -1) {
    const err = new Error(`Entity "${entity.name}" with key "${keyVal}" not found.`);
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const existing = records[index];
  const updated = {
    ...existing,
    ...payload,
    [keyField.name]: existing[keyField.name], // Prevent mutating primary key
    LastChangedBy: 'MOCK_ADMIN',
    LastChangedAt: new Date().toISOString(),
    LocalLastChangedAt: new Date().toISOString()
  };

  records[index] = updated;
  syntheticStore[entity.name] = records;

  return {
    status: 200,
    record: updated
  };
}

/**
 * Handles an OData Delete (DELETE) request on an entity instance.
 */
export function executeDelete(entity, keyVal, syntheticStore, architecture) {
  if (architecture?.selectedProfile === RAP_PROFILES.READ_ONLY_QUERY) {
    const err = new Error('Delete operations are not permitted for the READ_ONLY_QUERY architecture profile.');
    err.code = 'PROFILE_READ_ONLY';
    err.statusCode = 405;
    throw err;
  }

  const fields = entity.fields || [];
  const keyField = fields.find((f) => f.isKey) || fields[0];
  const records = syntheticStore[entity.name] || [];
  const index = records.findIndex((r) => String(r[keyField.name]) === String(keyVal));

  if (index === -1) {
    const err = new Error(`Entity "${entity.name}" with key "${keyVal}" not found.`);
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  records.splice(index, 1);
  syntheticStore[entity.name] = records;

  return {
    status: 204
  };
}
