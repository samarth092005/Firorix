# AI/ML Architecture & Governance Policy
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Core Principle: Advisory & Optional

Fiorify is an **enterprise engineering and decision-governance workbench**, not an AI chatbot or conversational SaaS product.

Deterministic rules, verified SAP technical metadata, and human consultant reviews govern all assessments:
- **AI is Optional:** Fiorify is 100% functionally complete and operational without an AI provider.
- **AI is Advisory:** Any AI output is labeled `AI_ADVISORY` and must be confirmed by a human consultant.
- **Provider-Independence:** AI capabilities are isolated behind an abstract interface (`IAIProvider`). The default implementation is a local, deterministic rule-based heuristic engine.

---

## 2. Permitted vs. Prohibited AI Capabilities

### What AI May Assist With:
1. Drafting natural-language business process descriptions from unstructured functional notes.
2. Proposing draft business requirements for human consultant review.
3. Suggesting relevant standard Fiori catalog search keywords.
4. Explaining fit-gap findings and validation error messages in plain language.
5. Summarizing assessment executive briefs.

### What AI Must NEVER Do:
1. **Never invent SAP repository objects** (programs, tables, includes, or CDS views).
2. **Never invent OData services** or catalog application IDs.
3. **Never confirm a business requirement** (strictly requires human consultant sign-off).
4. **Never approve a recommendation** or override an architectural decision.
5. **Never bypass SAP authorization** or validation checks.
6. **Never execute automated changes** or transport writes in an SAP system.

---

## 3. Data Privacy & Zero Leakage Containment

- Proprietary ABAP source code, internal table schemas, and business comments must never be transmitted to external, unvetted commercial LLMs.
- When an enterprise provider (such as SAP AI Core / Generative AI Hub) is configured, automated deterministic sanitization filters must scrub employee names, customer account numbers, and company codes prior to payload transmission.
