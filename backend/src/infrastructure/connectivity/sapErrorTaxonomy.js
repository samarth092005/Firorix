/**
 * Fiorify — SAP Connectivity Error Taxonomy (Stage S3)
 *
 * Implements deterministic error classification and ensures connectivity failures
 * are NEVER conflated with missing transactions or non-existent Fiori applications.
 */

export const CONNECTIVITY_STATUSES = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  CONFIGURED: 'CONFIGURED',
  CONNECTED: 'CONNECTED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_BLOCKED: 'AUTHORIZATION_BLOCKED',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  DESTINATION_NOT_FOUND: 'DESTINATION_NOT_FOUND',
  CLOUD_CONNECTOR_UNAVAILABLE: 'CLOUD_CONNECTOR_UNAVAILABLE',
  PARTIAL_ACCESS: 'PARTIAL_ACCESS',
  RELEASE_UNVERIFIED: 'RELEASE_UNVERIFIED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
});

export const SAP_ERROR_CATEGORIES = Object.freeze({
  CONNECTIVITY_FAILURE: 'CONNECTIVITY_FAILURE',
  SECURITY_BLOCKED: 'SECURITY_BLOCKED',
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
  PAYLOAD_INVALID: 'PAYLOAD_INVALID',
  GATEWAY_FAULT: 'GATEWAY_FAULT',
  ABAP_DUMP: 'ABAP_DUMP'
});

/**
 * Predicate to determine if a status code or error represents a connectivity or infrastructure failure.
 * When true, downstream engines MUST NOT classify transactions as "missing" or recommend BUILD.
 */
export function isConnectivityFailure(statusCodeOrError) {
  if (!statusCodeOrError) return false;
  const code = typeof statusCodeOrError === 'string'
    ? statusCodeOrError.toUpperCase()
    : (statusCodeOrError.statusCode || statusCodeOrError.code || '');

  const connectivityCodes = [
    'TIMEOUT',
    'NETWORK_UNAVAILABLE',
    'NETWORK_UNREACHABLE',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENOTFOUND',
    'DESTINATION_NOT_FOUND',
    'DESTINATION_RESOLUTION_FAILED',
    'DESTINATION_SERVICE_ERROR',
    'CLOUD_CONNECTOR_UNAVAILABLE',
    'AUTHENTICATION_FAILED',
    'AUTHORIZATION_BLOCKED',
    'LIVE_CONNECTION_FAILED',
    'CONNECTION_ERROR',
    'SERVICE_UNAVAILABLE',
    'GATEWAY_UNAVAILABLE',
    'NOT_CONFIGURED'
  ];

  return connectivityCodes.includes(code) || code.includes('TIMEOUT') || code.includes('CONN');
}

/**
 * Classifies HTTP response status and error into structured taxonomy
 */
export function classifySapError(httpStatus, errorBody = {}) {
  const status = Number(httpStatus);
  const msg = typeof errorBody === 'string' ? errorBody : (errorBody.message || errorBody.errorMessage || '');

  if (status === 401) {
    return {
      category: SAP_ERROR_CATEGORIES.SECURITY_BLOCKED,
      connectivityStatus: CONNECTIVITY_STATUSES.AUTHENTICATION_FAILED,
      statusCode: 'AUTHENTICATION_FAILED',
      isInfrastructureFailure: true,
      canConcludeMissingApp: false,
      recommendedAction: 'Check technical user credentials in BTP destination or Cloud Connector configuration.'
    };
  }

  if (status === 403) {
    return {
      category: SAP_ERROR_CATEGORIES.SECURITY_BLOCKED,
      connectivityStatus: CONNECTIVITY_STATUSES.AUTHORIZATION_BLOCKED,
      statusCode: 'AUTHORIZATION_BLOCKED',
      isInfrastructureFailure: true,
      canConcludeMissingApp: false,
      recommendedAction: 'Verify required SAP Basis authorizations (S_ADT_RES, S_DEVELOP, S_SERVICE, S_TABU_DIS).'
    };
  }

  if (status === 404) {
    // If the path was the gateway catalog itself, it is a service failure;
    // if querying a specific service entity, it might be entity not found
    const isCatalogEndpoint = msg.includes('CATALOGSERVICE') || msg.includes('discovery');
    return {
      category: isCatalogEndpoint ? SAP_ERROR_CATEGORIES.CONNECTIVITY_FAILURE : SAP_ERROR_CATEGORIES.TARGET_NOT_FOUND,
      connectivityStatus: isCatalogEndpoint ? CONNECTIVITY_STATUSES.SERVICE_UNAVAILABLE : CONNECTIVITY_STATUSES.CONNECTED,
      statusCode: isCatalogEndpoint ? 'GATEWAY_SERVICE_NOT_ACTIVATED' : 'NOT_FOUND',
      isInfrastructureFailure: isCatalogEndpoint,
      canConcludeMissingApp: !isCatalogEndpoint,
      recommendedAction: isCatalogEndpoint
        ? 'Activate standard SAP Gateway Catalog service via transaction /IWFND/MAINT_SERVICE.'
        : 'Verify object naming and release availability.'
    };
  }

  if (status === 502 || status === 503) {
    return {
      category: SAP_ERROR_CATEGORIES.CONNECTIVITY_FAILURE,
      connectivityStatus: CONNECTIVITY_STATUSES.CLOUD_CONNECTOR_UNAVAILABLE,
      statusCode: 'CLOUD_CONNECTOR_UNAVAILABLE',
      isInfrastructureFailure: true,
      canConcludeMissingApp: false,
      recommendedAction: 'Check SAP Cloud Connector tunnel status and subaccount connectivity.'
    };
  }

  if (status === 504 || status === 408) {
    return {
      category: SAP_ERROR_CATEGORIES.CONNECTIVITY_FAILURE,
      connectivityStatus: CONNECTIVITY_STATUSES.TIMEOUT,
      statusCode: 'TIMEOUT',
      isInfrastructureFailure: true,
      canConcludeMissingApp: false,
      recommendedAction: 'Verify SAP S/4HANA ICM listener and network latency.'
    };
  }

  if (status >= 500) {
    return {
      category: SAP_ERROR_CATEGORIES.GATEWAY_FAULT,
      connectivityStatus: CONNECTIVITY_STATUSES.PARTIAL_ACCESS,
      statusCode: 'INTERNAL_SERVER_ERROR',
      isInfrastructureFailure: true,
      canConcludeMissingApp: false,
      recommendedAction: 'Inspect SAP Gateway error log (/IWFND/ERROR_LOG) or ST22 short dumps.'
    };
  }

  return {
    category: SAP_ERROR_CATEGORIES.CONNECTIVITY_FAILURE,
    connectivityStatus: CONNECTIVITY_STATUSES.UNKNOWN,
    statusCode: 'UNKNOWN_ERROR',
    isInfrastructureFailure: true,
    canConcludeMissingApp: false,
    recommendedAction: 'Inspect network connection and gateway response payload.'
  };
}
