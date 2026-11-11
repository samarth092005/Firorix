# ADR-0007: Durable Artifact Storage Strategy & Document Management
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Database Architect, BTP Platform Architect, Senior Solution Architect  
**Technical Scope:** Generated Artifacts, Export ZIPs, and Document Persistence  

---

## 1. Context and Problem Statement
FioriX generates reviewable draft application files (ABAP CDS View Entities, RAP Service Definitions, SAPUI5 manifests, and ZIP bundles). Cloud Foundry application containers possess ephemeral local filesystems that are wiped on container restart, scale-out, or redeployment. We must define a durable, enterprise-compliant storage architecture without assuming arbitrary hyperscaler storage (such as AWS S3) is entitled.

## 2. Decision
1. **Durable Storage Hierarchy:**
   - **Tier 1 (Preferred Enterprise):** **SAP Document Management Service (DMS)**, Integration Option, CMIS-compliant repository on SAP BTP.
   - **Tier 2 (Fallback - Self-Contained):** Dedicated **HANA Cloud Large Object (LOB) table** (`GENERATED_ARTIFACT_CONTENT`) within the HDI container for text drafts under a strict 10 MB per-project size ceiling.
2. **Metadata vs. Content Separation:** Relational metadata (file path, file name, MIME type, byte size, SHA-256 checksum, template version, and generation timestamp) is stored in the relational `GENERATED_ARTIFACT` table. File payload bytes are accessed via an abstracted storage adapter (`IArtifactStorageService`).
3. **Automated Purge Policy:** Generated draft artifacts older than 90 days that have not been approved for transport are automatically flagged for archiving or deletion.

## 3. Consequences
- **Positive:** Zero risk of silent file loss upon container restart; 100% compliant with SAP BTP security; zero external cloud vendor dependencies.
- **Trade-off:** If DMS is unentitled, HANA LOB tables consume database RAM if retention rules are not strictly enforced.
