# AI/ML Design
Use hybrid architecture: deterministic evidence/rules first; AI assists interpretation and retrieval.

| Use case | Approach | Control |
|---|---|---|
| Transaction explanation | LLM from retrieved metadata | Cite objects; label inference |
| Requirement extraction | LLM draft from notes/specs | Consultant confirms |
| Catalogue retrieval | Keyword first; embeddings later | Only verified catalogue |
| Fit-gap explanation | Rules determine status; LLM explains | LLM cannot override evidence |
| Recommendation | Deterministic policy | Human review |
| Code assistance | Templates + structured specification | Validation and developer review |
| Validation explanation | LLM explains findings | Cannot turn FAIL into PASS |

AI provider is unconfirmed. Implement provider adapter and feature flags. SAP AI Core/Generative AI Hub is a candidate only if entitled and approved. No fine-tuning required for demo. Never send credentials or restricted source/business data externally without policy approval.
