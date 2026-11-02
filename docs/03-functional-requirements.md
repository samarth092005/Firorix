# Functional Requirements
## System management
Register system alias, environment, release, destination reference and owner. Test connection and report capability status. Never expose secrets.

## Transaction explorer
Single T-Code first. Validate against selected system. Create assessment and asynchronous job. Excel and system-wide scans are later capabilities.

## Technical discovery
Retrieve transaction metadata and supported repository objects. Discover CDS, tables and services only where evidence exists. Store source, timestamp, scan and discovery status.

## Business analysis
Capture process, actors, activities, inputs, outputs, rules, validations, approvals, exceptions and roles. Support manual and AI-drafted requirements; require consultant confirmation.

## Fiori catalogue
Search standard SAP apps and display app ID, type, product version, components, services, prerequisites and extensibility where published. Separate customer-specific apps.

## Fit-gap
Compare each confirmed requirement with app capabilities. Statuses: SUPPORTED, PARTIAL, UNSUPPORTED, UNKNOWN.

## Decision
Record ADOPT, EXTEND, BUILD or REVIEW with rationale, reviewer and version.

## Generation
Require approved BUILD decision and complete requirements. Generate only validated release-specific patterns. Store draft files and template version. No automatic activation or transport initially.

## Validation
Structural, UI build, metadata, SAP-side, authorization and clean-core checks where available. Statuses: PASS, FAIL, WARNING, NOT_EXECUTED, REQUIRES_HUMAN_REVIEW.
