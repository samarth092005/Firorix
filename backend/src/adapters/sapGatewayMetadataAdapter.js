/**
 * Fiorify — SAP Gateway Metadata Adapter
 *
 * Discovers and inspects registered SAP Gateway OData services directly
 * from SAP S/4HANA 2023 System S21 (Client 200).
 *
 * Key Capabilities:
 * - Queries /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection.
 * - Extracts technical service names, titles, versions, descriptions, and endpoints.
 * - Queries and parses individual service $metadata documents (EDMX XML).
 * - Extracts EntitySets, EntityTypes, properties, primary keys, and operations (FunctionImports).
 * - Implements in-memory caching to avoid redundant round-trips over 1,300+ catalog records.
 * - Strictly read-only; records provenance as LIVE_SAP_S21.
 */

import { btpDestinationAdapter, sanitizeErrorMessage } from './btpDestinationAdapter.js';

export const GATEWAY_CATALOG_PATH = '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection';

/**
 * Parses SAP OData v2 EDMX XML metadata into structured JSON.
 * Extracts EntitySets, EntityTypes, properties, keys, and FunctionImports.
 */
export function parseEdmxMetadata(xmlString = '') {
  if (typeof xmlString !== 'string' || xmlString.trim().length === 0) {
    return { entitySets: [], entityTypesCount: 0, functionImports: [] };
  }

  // 1. Extract EntitySets
  const entitySets = [];
  const entitySetRegex = /<EntitySet\s+Name="([^"]+)"\s+EntityType="([^"]+)"(?:\s+sap:creatable="([^"]+)")?(?:\s+sap:updatable="([^"]+)")?(?:\s+sap:deletable="([^"]+)")?/gi;
  let match;
  while ((match = entitySetRegex.exec(xmlString)) !== null) {
    entitySets.push({
      name: match[1],
      entityType: match[2],
      creatable: match[3] !== 'false',
      updatable: match[4] !== 'false',
      deletable: match[5] !== 'false',
      keys: [],
      propertiesCount: 0,
      properties: []
    });
  }

  // 2. Extract EntityTypes with Keys and Properties
  const entityTypes = [];
  const entityTypeBlockRegex = /<EntityType\s+Name="([^"]+)"[\s\S]*?<\/EntityType>/gi;
  while ((match = entityTypeBlockRegex.exec(xmlString)) !== null) {
    const block = match[0];
    const typeName = match[1];

    // Extract Keys
    const keyMatch = block.match(/<Key>([\s\S]*?)<\/Key>/i);
    const keys = [];
    if (keyMatch) {
      const propRefRegex = /<PropertyRef\s+Name="([^"]+)"/gi;
      let pr;
      while ((pr = propRefRegex.exec(keyMatch[1])) !== null) {
        keys.push(pr[1]);
      }
    }

    // Extract Properties
    const properties = [];
    const propRegex = /<Property\s+Name="([^"]+)"\s+Type="([^"]+)"(?:\s+Null\w*="([^"]+)")?(?:\s+MaxLength="([^"]+)")?(?:\s+sap:label="([^"]*)")?/gi;
    let propMatch;
    while ((propMatch = propRegex.exec(block)) !== null) {
      properties.push({
        name: propMatch[1],
        type: propMatch[2],
        nullable: propMatch[3] !== 'false',
        maxLength: propMatch[4] ? Number(propMatch[4]) || propMatch[4] : undefined,
        label: propMatch[5] || propMatch[1]
      });
    }

    entityTypes.push({
      name: typeName,
      keys,
      properties
    });
  }

  // Link properties and keys to EntitySets
  for (const es of entitySets) {
    const cleanType = es.entityType.split('.').pop();
    const foundType = entityTypes.find((et) => et.name === cleanType);
    if (foundType) {
      es.keys = foundType.keys;
      es.propertiesCount = foundType.properties.length;
      es.properties = foundType.properties;
    }
  }

  // 3. Extract FunctionImports (Operations)
  const functionImports = [];
  const fiRegex = /<FunctionImport\s+Name="([^"]+)"(?:\s+ReturnType="([^"]+)")?(?:\s+m:HttpMethod="([^"]+)")?/gi;
  while ((match = fiRegex.exec(xmlString)) !== null) {
    functionImports.push({
      name: match[1],
      returnType: match[2] || 'void',
      httpMethod: match[3] || 'POST'
    });
  }

  return {
    entitySets,
    entityTypesCount: entityTypes.length,
    functionImports
  };
}

export class SapGatewayMetadataAdapter {
  constructor(options = {}) {
    this.adapter = options.btpAdapter || btpDestinationAdapter;
    this.cacheTtlMs = Number(options.cacheTtlMs) || 5 * 60 * 1000; // 5 minutes default
    this.catalogCache = null;
    this.catalogCacheTime = 0;
    this.metadataCache = new Map();
    this.maxCacheEntries = Number(options.maxCacheEntries) || 200;
  }

  /**
   * Retrieves registered Gateway services from S21 Gateway Catalog.
   * Supports filtering by search keyword and optional cache refresh.
   */
  async getCatalogServices(options = {}) {
    const { search = '', refresh = false, limit = 0 } = options;
    const now = Date.now();

    // Check memory cache
    if (!refresh && this.catalogCache && now - this.catalogCacheTime < this.cacheTtlMs) {
      return this.filterAndReturnCatalog(this.catalogCache, search, limit, true);
    }

    const response = await this.adapter.executeRequest({
      path: GATEWAY_CATALOG_PATH,
      method: 'GET',
      params: {
        $format: 'json'
      }
    });

    if (!response.success) {
      return {
        success: false,
        statusCode: response.statusCode || 'GATEWAY_ERROR',
        httpStatus: response.httpStatus || 502,
        errorMessage: response.errorMessage || 'Failed to retrieve SAP Gateway catalog.',
        services: [],
        provenance: 'LIVE_SAP_S21',
        timestamp: new Date().toISOString()
      };
    }

    const rawResults = response.data?.d?.results || response.data?.d || [];
    const normalizedServices = rawResults.map((s) => ({
      id: s.ID || '',
      technicalServiceName: s.TechnicalServiceName || s.Title || '',
      title: s.Title || s.TechnicalServiceName || '',
      description: s.Description || '',
      version: Number(s.TechnicalServiceVersion) || 1,
      serviceUrl: s.ServiceUrl || '',
      metadataUrl: s.MetadataUrl || '',
      author: s.Author || '',
      isSapService: s.IsSapService === 'true' || s.IsSapService === true,
      serviceType: s.ServiceType || '',
      updatedDate: s.UpdatedDate || ''
    }));

    this.catalogCache = normalizedServices;
    this.catalogCacheTime = now;

    return this.filterAndReturnCatalog(normalizedServices, search, limit, false);
  }

  /**
   * Filters cached catalog services based on search string and limit.
   */
  filterAndReturnCatalog(services, search = '', limit = 0, fromCache = false) {
    let filtered = services;

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim().toUpperCase();
      filtered = services.filter((s) =>
        s.id.toUpperCase().includes(term) ||
        s.technicalServiceName.toUpperCase().includes(term) ||
        s.title.toUpperCase().includes(term) ||
        s.description.toUpperCase().includes(term)
      );
    }

    const totalCount = filtered.length;
    const finalServices = limit > 0 ? filtered.slice(0, limit) : filtered;

    return {
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      totalCount,
      returnedCount: finalServices.length,
      fromCache,
      services: finalServices,
      provenance: 'LIVE_SAP_S21',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Retrieves and parses the $metadata document for a specific technical service from S21.
   */
  async getServiceMetadata(serviceTechnicalName = '') {
    if (!serviceTechnicalName || typeof serviceTechnicalName !== 'string' || serviceTechnicalName.trim().length === 0) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        httpStatus: 400,
        errorMessage: 'Technical service name is required.'
      };
    }

    const cleanName = serviceTechnicalName.trim();

    // Check metadata cache
    if (this.metadataCache.has(cleanName)) {
      return {
        ...this.metadataCache.get(cleanName),
        fromCache: true,
        timestamp: new Date().toISOString()
      };
    }

    // Determine metadata path
    // Most standard SAP services are located at /sap/opu/odata/sap/<TECHNICAL_NAME>/$metadata
    let metadataPath = `/sap/opu/odata/sap/${cleanName}/$metadata`;

    // If catalog is already loaded, check if we have the specific MetadataUrl
    if (this.catalogCache) {
      const found = this.catalogCache.find(
        (s) => s.technicalServiceName === cleanName || s.title === cleanName || s.id.startsWith(cleanName)
      );
      if (found && found.metadataUrl) {
        try {
          const parsedUrl = new URL(found.metadataUrl);
          metadataPath = parsedUrl.pathname;
        } catch {
          // Keep default if URL parsing fails
        }
      }
    }

    const startTime = Date.now();
    const response = await this.adapter.executeRequest({
      path: metadataPath,
      method: 'GET',
      headers: {
        Accept: 'application/xml, text/xml, */*'
      }
    });

    if (!response.success) {
      return {
        success: false,
        statusCode: response.statusCode || 'METADATA_FETCH_FAILED',
        httpStatus: response.httpStatus || 502,
        technicalServiceName: cleanName,
        metadataPath,
        errorMessage: response.errorMessage || `Failed to fetch $metadata for service ${cleanName}`,
        provenance: 'LIVE_SAP_S21',
        timestamp: new Date().toISOString()
      };
    }

    const xmlData = response.data;
    if (typeof xmlData !== 'string' || xmlData.trim().length === 0) {
      return {
        success: false,
        statusCode: 'MALFORMED_METADATA',
        httpStatus: 502,
        technicalServiceName: cleanName,
        errorMessage: `Service ${cleanName} returned empty or non-string $metadata payload.`,
        provenance: 'LIVE_SAP_S21',
        timestamp: new Date().toISOString()
      };
    }

    const parsed = parseEdmxMetadata(xmlData);
    const result = {
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      technicalServiceName: cleanName,
      metadataPath,
      metadata: {
        entitySetsCount: parsed.entitySets.length,
        entitySets: parsed.entitySets,
        entityTypesCount: parsed.entityTypesCount,
        functionImportsCount: parsed.functionImports.length,
        functionImports: parsed.functionImports
      },
      rawXmlLength: xmlData.length,
      elapsedMs: Date.now() - startTime,
      fromCache: false,
      provenance: 'LIVE_SAP_S21',
      timestamp: new Date().toISOString()
    };

    if (this.metadataCache.size >= this.maxCacheEntries) {
      const oldestKey = this.metadataCache.keys().next().value;
      if (oldestKey) this.metadataCache.delete(oldestKey);
    }
    this.metadataCache.set(cleanName, result);
    return result;
  }
}

export const sapGatewayMetadataAdapter = new SapGatewayMetadataAdapter();
