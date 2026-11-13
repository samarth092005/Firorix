/**
 * Validates the FITGAP-01 request payload.
 * Enforces structured types for requirement, candidate, and context.
 */
export function validateFitGapAssessRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      error: 'Request body must be a JSON object containing requirement, candidate, and context.'
    };
  }

  // 1. Requirement validation
  if (!payload.requirement || typeof payload.requirement !== 'object' || Array.isArray(payload.requirement)) {
    return { isValid: false, error: 'Requirement object is required.' };
  }
  const { requirement } = payload;
  const reqTitle = requirement.title || requirement.statement || requirement.description;
  if (!reqTitle || typeof reqTitle !== 'string' || !reqTitle.trim()) {
    return { isValid: false, error: 'Requirement title or statement is required as a non-empty string.' };
  }
  if (requirement.id !== undefined && typeof requirement.id !== 'string') {
    return { isValid: false, error: 'Requirement id must be a string if provided.' };
  }
  if (requirement.title !== undefined && typeof requirement.title !== 'string') {
    return { isValid: false, error: 'Requirement title must be a string if provided.' };
  }
  if (requirement.statement !== undefined && typeof requirement.statement !== 'string') {
    return { isValid: false, error: 'Requirement statement must be a string if provided.' };
  }
  if (requirement.description !== undefined && typeof requirement.description !== 'string') {
    return { isValid: false, error: 'Requirement description must be a string if provided.' };
  }
  if (requirement.businessProcess !== undefined && typeof requirement.businessProcess !== 'string') {
    return { isValid: false, error: 'Requirement businessProcess must be a string if provided.' };
  }
  if (requirement.tcode !== undefined && typeof requirement.tcode !== 'string') {
    return { isValid: false, error: 'Requirement tcode must be a string if provided.' };
  }
  if (requirement.expectedFunctionality !== undefined && !Array.isArray(requirement.expectedFunctionality)) {
    return { isValid: false, error: 'Requirement expectedFunctionality must be an array of strings if provided.' };
  }
  if (requirement.requiredCapabilities !== undefined && !Array.isArray(requirement.requiredCapabilities)) {
    return { isValid: false, error: 'Requirement requiredCapabilities must be an array of strings if provided.' };
  }
  if (requirement.requiredOperations !== undefined && !Array.isArray(requirement.requiredOperations)) {
    return { isValid: false, error: 'Requirement requiredOperations must be an array of strings if provided.' };
  }
  if (requirement.mandatoryConditions !== undefined && !Array.isArray(requirement.mandatoryConditions)) {
    return { isValid: false, error: 'Requirement mandatoryConditions must be an array of strings if provided.' };
  }
  if (requirement.priority !== undefined && typeof requirement.priority !== 'string') {
    return { isValid: false, error: 'Requirement priority must be a string if provided.' };
  }

  // 2. Candidate validation
  if (payload.candidate === null) {
    // Valid custom build candidate scenario: No standard Fiori application exists in catalog
  } else if (!payload.candidate || typeof payload.candidate !== 'object' || Array.isArray(payload.candidate)) {
    return { isValid: false, error: 'Candidate application object is required.' };
  } else {
    const { candidate } = payload;
    if (!candidate.appId || typeof candidate.appId !== 'string' || !candidate.appId.trim()) {
      return { isValid: false, error: 'Candidate appId is required as a non-empty string.' };
    }
    if (candidate.appName !== undefined && typeof candidate.appName !== 'string') {
      return { isValid: false, error: 'Candidate appName must be a string if provided.' };
    }
    if (candidate.appType !== undefined && typeof candidate.appType !== 'string') {
      return { isValid: false, error: 'Candidate appType must be a string if provided.' };
    }
    if (candidate.uiTechnology !== undefined && typeof candidate.uiTechnology !== 'string') {
      return { isValid: false, error: 'Candidate uiTechnology must be a string if provided.' };
    }
    if (candidate.supportedProductRelease !== undefined && typeof candidate.supportedProductRelease !== 'string') {
      return { isValid: false, error: 'Candidate supportedProductRelease must be a string if provided.' };
    }
    if (candidate.productVersion !== undefined && typeof candidate.productVersion !== 'string') {
      return { isValid: false, error: 'Candidate productVersion must be a string if provided.' };
    }
    if (candidate.businessRole !== undefined && typeof candidate.businessRole !== 'string') {
      return { isValid: false, error: 'Candidate businessRole must be a string if provided.' };
    }
    if (candidate.businessRoles !== undefined && !Array.isArray(candidate.businessRoles)) {
      return { isValid: false, error: 'Candidate businessRoles must be an array of strings if provided.' };
    }
    if (candidate.capabilities !== undefined && !Array.isArray(candidate.capabilities)) {
      return { isValid: false, error: 'Candidate capabilities must be an array of strings if provided.' };
    }
    if (candidate.supportedCapabilities !== undefined && !Array.isArray(candidate.supportedCapabilities)) {
      return { isValid: false, error: 'Candidate supportedCapabilities must be an array of strings if provided.' };
    }
    if (candidate.odataServices !== undefined && !Array.isArray(candidate.odataServices)) {
      return { isValid: false, error: 'Candidate odataServices must be an array of strings if provided.' };
    }
    if (candidate.odataDependencies !== undefined && !Array.isArray(candidate.odataDependencies)) {
      return { isValid: false, error: 'Candidate odataDependencies must be an array of strings if provided.' };
    }
    if (candidate.verifiedODataServices !== undefined && !Array.isArray(candidate.verifiedODataServices)) {
      return { isValid: false, error: 'Candidate verifiedODataServices must be an array if provided.' };
    }
  }

  // 3. Context validation
  if (!payload.context || typeof payload.context !== 'object' || Array.isArray(payload.context)) {
    return { isValid: false, error: 'Context object is required.' };
  }
  const { context } = payload;
  if (context.systemId !== undefined && typeof context.systemId !== 'string') {
    return { isValid: false, error: 'Context systemId must be a string if provided.' };
  }
  if (context.client !== undefined && typeof context.client !== 'string') {
    return { isValid: false, error: 'Context client must be a string if provided.' };
  }
  if (context.systemRelease !== undefined && typeof context.systemRelease !== 'string') {
    return { isValid: false, error: 'Context systemRelease must be a string if provided.' };
  }
  if (context.activeGatewayServices !== undefined && !Array.isArray(context.activeGatewayServices)) {
    return { isValid: false, error: 'Context activeGatewayServices must be an array of strings if provided.' };
  }
  if (context.activeServices !== undefined && !Array.isArray(context.activeServices)) {
    return { isValid: false, error: 'Context activeServices must be an array of strings if provided.' };
  }
  if (context.userRoles !== undefined && !Array.isArray(context.userRoles)) {
    return { isValid: false, error: 'Context userRoles must be an array of strings if provided.' };
  }
  if (context.userAuthorizations !== undefined && !Array.isArray(context.userAuthorizations)) {
    return { isValid: false, error: 'Context userAuthorizations must be an array of strings if provided.' };
  }
  if (context.liveServices !== undefined && !Array.isArray(context.liveServices)) {
    return { isValid: false, error: 'Context liveServices must be an array if provided.' };
  }

  return { isValid: true };
}

/**
 * Maps incoming canonical request properties to the internal fitGapAssessmentEngine model.
 * Bridges both canonical naming and raw engine property names seamlessly.
 */
export function normalizeFitGapInput(payload) {
  const { requirement, candidate, context = {} } = payload;

  const reqCapabilities = Array.isArray(requirement.requiredCapabilities)
    ? requirement.requiredCapabilities
    : Array.isArray(requirement.expectedFunctionality)
      ? requirement.expectedFunctionality
      : [];

  const reqOperations = Array.isArray(requirement.requiredOperations)
    ? requirement.requiredOperations
    : [];

  let priority = requirement.priority || 'MEDIUM';
  if (typeof priority === 'string' && (priority.toUpperCase() === 'MUST' || priority.toUpperCase() === 'MANDATORY' || priority.toUpperCase() === 'HIGH')) {
    priority = 'MANDATORY';
  }

  const normalizedRequirement = {
    id: requirement.id || `REQ-${Date.now()}`,
    title: requirement.title || requirement.statement || requirement.description || 'Untitled Business Requirement',
    description: requirement.description || requirement.statement || requirement.title || '',
    statement: requirement.statement || requirement.description || requirement.title || '',
    businessProcess: requirement.businessProcess || '',
    tcode: requirement.tcode || '',
    requiredCapabilities: reqCapabilities,
    expectedFunctionality: reqCapabilities,
    requiredOperations: reqOperations,
    mandatoryConditions: Array.isArray(requirement.mandatoryConditions) ? requirement.mandatoryConditions : [],
    priority,
    customizationRequirements: Array.isArray(requirement.customizationRequirements)
      ? requirement.customizationRequirements
      : []
  };

  const cand = payload.candidate || {
    appId: 'CUSTOM_RAP_TARGET',
    appName: `Custom Modernization for ${payload.context?.transactionCode || payload.requirement?.tcode || 'Transaction'}`,
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori elements',
    isCustomBuild: true
  };

  const candCapabilities = Array.isArray(cand.supportedCapabilities)
    ? cand.supportedCapabilities
    : Array.isArray(cand.capabilities)
      ? cand.capabilities
      : [];

  const candODataDeps = Array.isArray(cand.odataDependencies)
    ? cand.odataDependencies
    : Array.isArray(cand.odataServices)
      ? cand.odataServices
      : [];

  const candRoles = Array.isArray(cand.businessRoles)
    ? cand.businessRoles
    : typeof cand.businessRole === 'string' && cand.businessRole.trim()
      ? [cand.businessRole.trim()]
      : [];

  const productVersion = cand.productVersion || cand.supportedProductRelease || '';

  const normalizedCandidate = {
    appId: String(cand.appId).trim(),
    appName: cand.appName || cand.appId,
    appType: cand.appType || 'Transactional',
    uiTechnology: cand.uiTechnology || 'SAP Fiori elements',
    productVersion,
    supportedProductRelease: productVersion,
    businessProcess: cand.businessProcess || cand.lineOfBusiness || '',
    businessRoles: candRoles,
    businessRole: typeof cand.businessRole === 'string' ? cand.businessRole : (candRoles[0] || ''),
    odataDependencies: candODataDeps,
    odataServices: candODataDeps,
    supportedCapabilities: candCapabilities,
    capabilities: candCapabilities,
    verifiedODataServices: Array.isArray(cand.verifiedODataServices) ? cand.verifiedODataServices : [],
    documentationUrl: cand.documentationUrl || `https://fal.cloud.sap/apps/${cand.appId}`
  };

  const activeServices = Array.isArray(context.activeServices)
    ? context.activeServices
    : Array.isArray(context.activeGatewayServices)
      ? context.activeGatewayServices
      : [];

  const userAuthorizations = Array.isArray(context.userAuthorizations)
    ? context.userAuthorizations
    : Array.isArray(context.userRoles)
      ? context.userRoles
      : [];

  const systemRelease = context.systemRelease || context.targetSystem?.release || 'SAP S/4HANA 2023';
  const systemId = context.systemId || context.targetSystem?.systemId || 'S21-200';

  const normalizedContext = {
    targetSystem: {
      systemId,
      release: systemRelease,
      client: context.client || '200'
    },
    systemId,
    client: context.client || '200',
    systemRelease,
    activeServices,
    activeGatewayServices: activeServices,
    liveServices: Array.isArray(context.liveServices) ? context.liveServices : [],
    userAuthorizations,
    userRoles: userAuthorizations,
    customVariantActive: Boolean(context.customVariantActive)
  };

  return {
    requirement: normalizedRequirement,
    candidate: normalizedCandidate,
    context: normalizedContext
  };
}
