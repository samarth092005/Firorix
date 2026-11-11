namespace fiorix.discovery;

using { cuid, managed } from '@sap/cds/common';

entity Systems : managed {
  key systemId           : String(32);
      systemName         : String(128);
      client             : String(3);
      release            : String(64);
      mode               : String(16); // 'MOCK' | 'LIVE_SAP'
      active             : Boolean default true;
      softwareComponents : array of String;
      rfcDestination     : String(64);
      odataServiceUrl    : String(256);
}

entity Transactions : managed {
  key tcode              : String(20);
      exists             : Boolean;
      classification     : String(16); // 'STANDARD' | 'CUSTOM' | 'PARTNER' | 'UNKNOWN'
      description        : String(256);
      program            : String(40);
      screenNumber       : String(4);
      packageName        : String(30);
      originalSystem     : String(10);
      softwareComponent  : String(30);
      metadataStatus     : String(16); // 'COMPLETE' | 'INCOMPLETE' | 'NOT_AVAILABLE'
      evidence           : array of String;
}

entity FioriApps : managed {
  key appId              : String(32);
      appName            : String(256);
      appType            : String(32);
      uiTechnology       : String(64); // 'SAP Fiori elements' | 'SAP GUI for HTML' | 'SAPUI5 freestyle'
      productVersion     : String(128);
      softwareComponent  : String(30);
      sourceLabel        : String(128);
      descriptorStatus   : String(32);
      accessStatus       : String(32);
}

entity TCodeMappings : cuid, managed {
  systemId               : String(32);
  tcode                  : String(20);
  appId                  : String(32);
  matchType              : String(32); // 'EXPLICIT_SUCCESSOR' | 'SAP_GUI_HTML' | 'FUNCTIONAL_ALTERNATIVE' | 'NO_STANDARD_APP_EXISTS' | 'CATALOGUE_PENDING_VERIFICATION' | 'RELEASE_INCOMPATIBLE' | 'DIRECT_MATCH'
  rationale              : String(500);
  reviewStatus           : String(32);
  releaseCompatibility   : String(16); // 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN'
}
