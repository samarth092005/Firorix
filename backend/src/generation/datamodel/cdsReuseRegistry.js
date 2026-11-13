/**
 * Fiorify — SAP CDS Reuse Registry (GEN-04)
 *
 * Provides a curated registry of released standard SAP CDS view entities
 * for S/4HANA 2023 On-Premise, with strict provenance tracking.
 */

export const STANDARD_CDS_VIEWS = Object.freeze([
  {
    technicalName: 'I_Currency',
    businessDescription: 'Currency Master Data (ISO & SAP Currency Codes)',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'SAP_BASIS',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['Currency'],
    supportedFields: ['Currency', 'Decimals', 'CurrencyISOCode', 'AlternativeCurrencyKey'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_Country',
    businessDescription: 'Country Master Data',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'SAP_BASIS',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['Country'],
    supportedFields: ['Country', 'CountryThreeLetterISOCode', 'CountryThreeDigitISOCode', 'CountryCurrency'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_UnitOfMeasure',
    businessDescription: 'Unit of Measure Dimension & Codes',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'SAP_BASIS',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['UnitOfMeasure'],
    supportedFields: ['UnitOfMeasure', 'UnitOfMeasureISOCode', 'UnitOfMeasureCommercialName', 'UnitOfMeasureNumberOfDecimals'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_BusinessPartner',
    businessDescription: 'Business Partner General Information',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'S4CORE',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['BusinessPartner'],
    supportedFields: ['BusinessPartner', 'BusinessPartnerCategory', 'BusinessPartnerGrouping', 'FirstName', 'LastName', 'OrganizationBPName1'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_Customer',
    businessDescription: 'Customer Master Data (FI/SD)',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'S4CORE',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['Customer'],
    supportedFields: ['Customer', 'CustomerName', 'CustomerAccountGroup', 'AuthorizationGroup', 'Country', 'CityName'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_Supplier',
    businessDescription: 'Supplier / Vendor Master Data (FI/MM)',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'S4CORE',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['Supplier'],
    supportedFields: ['Supplier', 'SupplierName', 'SupplierAccountGroup', 'Country', 'CityName', 'PostingIsBlocked'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_CompanyCode',
    businessDescription: 'Company Code Organizational Unit',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'S4CORE',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['CompanyCode'],
    supportedFields: ['CompanyCode', 'CompanyCodeName', 'CityName', 'Country', 'Currency', 'Language'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  },
  {
    technicalName: 'I_Plant',
    businessDescription: 'Plant / Logistics Facility Unit',
    category: 'MASTER_DATA',
    sourceSystem: 'S/4HANA Standard',
    sourceRelease: 'SAP S/4HANA 2023',
    softwareComponent: 'S4CORE',
    releaseContract: 'C1',
    documentedReleaseContract: 'C1',
    availabilityStatus: 'OFFICIAL_DOCUMENTATION',
    targetVerificationStatus: 'PENDING_S21_LIVE_CONNECTIVITY',
    isLiveVerified: false,
    verificationNote: 'Standard CDS View documented in SAP S/4HANA 2023 Help Portal. Target S21 verification pending live RFC/ADT reachability.',
    keyFields: ['Plant'],
    supportedFields: ['Plant', 'PlantName', 'ValuationArea', 'Customer', 'Supplier', 'FactoryCalendar'],
    provenance: 'OFFICIAL_SAP_DOCUMENTATION'
  }
]);

export class CdsReuseRegistry {
  constructor(entries = STANDARD_CDS_VIEWS) {
    this.entries = [...entries];
  }

  /**
   * Searches standard CDS views by technical name, description, or category.
   */
  search(query = '', category = null) {
    let results = this.entries;

    if (category) {
      results = results.filter((e) => e.category === category);
    }

    if (query && typeof query === 'string' && query.trim()) {
      const term = query.trim().toUpperCase();
      results = results.filter((e) =>
        e.technicalName.toUpperCase().includes(term) ||
        e.businessDescription.toUpperCase().includes(term) ||
        e.keyFields.some((k) => k.toUpperCase().includes(term))
      );
    }

    return results.map((e) => ({
      ...e,
      cdsViewName: e.technicalName,
      name: e.technicalName
    }));
  }

  /**
   * Retrieves a CDS view definition by exact technical name.
   */
  getByName(technicalName) {
    if (!technicalName) return null;
    return this.entries.find((e) => e.technicalName.toUpperCase() === technicalName.toUpperCase().trim()) || null;
  }
}

export const defaultCdsReuseRegistry = new CdsReuseRegistry();
