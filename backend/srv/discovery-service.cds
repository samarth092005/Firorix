using { fiorix.discovery as discovery } from '../db/schema';

service DiscoveryService @(path: '/odata/v4/discovery') {

  @readonly entity Systems as projection on discovery.Systems;
  @readonly entity Transactions as projection on discovery.Transactions;
  @readonly entity FioriApps as projection on discovery.FioriApps;
  @readonly entity TCodeMappings as projection on discovery.TCodeMappings;

  // Custom action for evidence-based transaction search
  action searchTransaction(
    systemId : String,
    tcode    : String,
    language : String
  ) returns {
    requestId     : String;
    mode          : String;
    timestamp     : DateTime;
    overallStatus : String;
    transaction   : {
      tcode          : String;
      exists         : Boolean;
      classification : String;
      description    : String;
      program        : String;
      screenNumber   : String;
      packageName    : String;
      originalSystem : String;
      softwareComponent : String;
      metadataStatus : String;
      evidence       : array of String;
    };
    matching      : {
      status     : String;
      candidates : array of {
        appId         : String;
        appName       : String;
        appType       : String;
        uiTechnology  : String;
        matchType     : String;
        productVersion: String;
        rationale     : String;
      };
    };
    errorMessage  : String;
  };
}
