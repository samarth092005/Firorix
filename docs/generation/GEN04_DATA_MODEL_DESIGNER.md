# FIORIX GENERATION STUDIO — MILESTONE GEN-04 SPECIFICATION
## Data Model Designer, ABAP CDS Typing, Composition vs Association & Multi-Category Validation

**Version:** 1.0.0  
**Status:** Approved & Implemented  
**Classification:** Core Functional Specification  
**Component:** Data Model Designer (`backend/src/generation/datamodel/`, `frontend/src/features/generation/components/DataModelDesigner.tsx`)

---

## 1. Executive Summary

Milestone **GEN-04 (Data Model Designer)** provides the visual and semantic data modeling workspace for SAP S/4HANA 2023 Clean Core applications. It empowers architects to define ABAP Core Data Services (CDS) entity hierarchies, field definitions with strict ABAP DDIC primitive types, composition and association relationships, and integration with standard SAP CDS reuse views.

Key architectural achievements:
1. **Three-Pane Cockpit UI:** Entity hierarchy navigation with Standard SAP CDS View search, field definition and typing editor, and real-time multi-category validation report panel.
2. **RAP Hierarchy Semantics:** Rigid distinction between Compositions (parent-child ownership) and Associations (reference/navigation).
3. **Cycle Prevention:** Rigorous cycle detection for compositions preventing invalid circular parent-child hierarchies.
4. **ABAP Data Types & Reference Binding:** Full support for `abap.curr` requiring currency code references (`abap.cuky`) and `abap.quan` requiring unit of measure references (`abap.unit`).
5. **Standard SAP CDS Reuse Registry:** Searchable, curated catalog of SAP S/4HANA released C1 views (e.g., `I_Currency`, `I_Country`, `I_UnitOfMeasure`, `I_BusinessPartner`).
6. **Multi-Category Validation Engine:** Automated static analysis verifying Structural, Relationship, SAP Compatibility, and Business Integrity rules.

---

## 2. ABAP CDS Entity Hierarchy & Primitive Types

### 2.1 Entity Classifications
- `ROOT`: Top-level business object node (e.g., `PurchaseOrder`). Exactly one root entity is recommended per RAP business object.
- `CHILD`: Subordinate owned entity tied to root via Composition (e.g., `PurchaseOrderItem`, `PurchaseOrderScheduleLine`).
- `REFERENCE`: Master data or transactional entity accessed via Association (e.g., `Supplier`).
- `VALUE_HELP`: Entity providing dropdown or value help domain values (e.g., `DeliveryStatusVH`).

### 2.2 Supported ABAP Primitive Types
All field definitions strictly adhere to SAP S/4HANA 2023 CDS primitive types:
| ABAP Type | Description | Constraints & Reference Rules |
| :--- | :--- | :--- |
| `abap.char(N)` | Character string of length $N$ | Length $1 \le N \le 1333$ |
| `abap.string` | Dynamic length string | Unbounded text |
| `abap.numc(N)` | Numeric character string | Length $1 \le N \le 255$ |
| `abap.int4` | 4-byte signed integer | Range $-2^{31} \dots 2^{31}-1$ |
| `abap.int8` | 8-byte signed integer | Range $-2^{63} \dots 2^{63}-1$ |
| `abap.dec(P,S)`| Packed decimal | Precision $P$, Scale $S$ |
| `abap.curr(P,S)`| Currency amount | Requires `cukyField` or `currencyRef` |
| `abap.cuky(5)` | Currency code | ISO currency key reference |
| `abap.quan(P,S)`| Quantity amount | Requires `unitField` or `unitRef` |
| `abap.unit(3)` | Unit of measure | SAP/ISO unit of measure reference |
| `abap.dats` | Calendar date (YYYYMMDD) | ISO date format |
| `abap.tims` | Time (HHMMSS) | ISO time format |
| `abap.utclong` | High-precision UTC timestamp | Recommended for administrative fields |
| `abap.boolean` | ABAP Boolean flag | Values `'X'` or `''` |
| `abap.raw(N)` | Byte sequence | Binary data |

---

## 3. Composition vs Association Semantics & Cycle Detection

### 3.1 RAP Semantic Boundaries
- **Composition (`COMPOSITION`):**
  - Represents strict lifecycle and ownership dependency.
  - The child cannot exist without the parent.
  - Deleting the parent cascades deletion to composed children.
  - Cardinality is strictly directed from parent to child (e.g., `[0..*]`).
- **Association (`ASSOCIATION`):**
  - Represents non-owning navigation to independent master data or reference views.
  - Deleting the source does not cascade to the target.
  - Used for value helps, master data lookups, and cross-BO references.

### 3.2 Composition Cycle Detection Algorithm
To prevent infinite recursion in ABAP RAP runtime structures, the `dataModelService` evaluates an adjacency graph of all compositions using Depth-First Search (DFS) with recursion stack tracking:
```javascript
function detectCompositionCycles(entities, relationships) {
  const adj = new Map();
  // Build directed adjacency list exclusively for COMPOSITION edges
  for (const rel of relationships) {
    if (rel.relationshipType === 'COMPOSITION') {
      if (!adj.has(rel.sourceEntityId)) adj.set(rel.sourceEntityId, []);
      adj.get(rel.sourceEntityId).push(rel.targetEntityId);
    }
  }

  const visited = new Set();
  const recStack = new Set();

  function dfs(nodeId, path) {
    visited.add(nodeId);
    recStack.add(nodeId);
    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path, neighbor])) return true;
      } else if (recStack.has(neighbor)) {
        throw new Error(`Circular composition detected: ${[...path, neighbor].join(' -> ')}`);
      }
    }
    recStack.delete(nodeId);
    return false;
  }

  for (const entity of entities) {
    if (!visited.has(entity.entityId)) {
      dfs(entity.entityId, [entity.entityId]);
    }
  }
}
```

---

## 4. Standard SAP CDS Reuse Registry

The registry provides access to SAP S/4HANA standard released CDS views (`C1` release contract), preventing duplicate data model creation for canonical entities:
- `I_Currency`: ISO and SAP Currency Master
- `I_Country`: Country Master Data and Codes
- `I_UnitOfMeasure`: Units of Measurement and conversion rules
- `I_BusinessPartner`: Central Business Partner Master
- `I_Customer`: Customer Financial and Sales Data
- `I_Supplier`: Supplier Procurement Data
- `I_Product`: Product / Material Master View
- `I_Plant`: Plant / Storage Location Organizational Hierarchy
- `I_CompanyCode`: Financial Company Code Master

Architects can search the registry via `GET /api/v1/generation/cds-registry/search?q=...` and link views directly as reference entities.

---

## 5. Multi-Category Validation Engine

The `dataModelValidator` executes static analysis and produces a structured report across four dimensions:

### 5.1 Categories & Rules
1. **Structural Rules:**
   - At least one `ROOT` entity must exist (`RULE_ROOT_EXISTS`).
   - Every entity must possess at least one primary key field (`RULE_PRIMARY_KEY_EXISTS`).
   - Entity and field names must satisfy ABAP naming conventions (uppercase alphanumeric, max 30 chars).
2. **Relationship Rules:**
   - Relationship target entities must exist (`RULE_TARGET_EXISTS`).
   - Cardinality strings must be valid RAP syntax (`[0..1]`, `[1..1]`, `[0..*]`, `[1..*]`).
   - No circular compositions (`RULE_NO_CIRCULAR_COMPOSITIONS`).
3. **SAP Compatibility Rules:**
   - Currency fields (`abap.curr`) must specify an existing `cukyField` or `currencyRef` (`RULE_CURRENCY_BINDING`).
   - Quantity fields (`abap.quan`) must specify an existing `unitField` or `unitRef` (`RULE_UNIT_BINDING`).
   - Primary key fields cannot use floating-point or dynamic string types.
4. **Business Integrity Rules:**
   - Traceability: Entities should be linked to at least one confirmed requirement.
   - Child entities should not be orphaned (must have an inbound composition from parent).

### 5.2 Severity & Lifecycle Gating
Findings are classified into:
- `ERROR`: Blocks progression to `DATA_MODEL_VALIDATED`.
- `WARNING`: Documented deviation; does not block progression if accepted by architect.
- `INFO`: Optimization suggestion or best practice guideline.

When `errorCount === 0`, the validation passes and the project lifecycle automatically advances to `DATA_MODEL_VALIDATED`.
