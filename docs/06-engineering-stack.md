# General Engineering Stack
| Technology | Purpose | Decision |
|---|---|---|
| TypeScript | Type-safe backend/frontend | Use |
| Node.js LTS | CAP runtime | Use supported version |
| SAP CAP | Domain services/orchestration | Main backend |
| SAPUI5 | FioriX frontend | Main UI |
| React | Alternative UI framework | Not selected; avoid duplicate UI stack |
| Python | Specialist AI/analysis worker | Optional after proof |
| HANA Cloud | Database | Selected |
| PostgreSQL | Alternative DB | Not selected |
| REST / OData | API styles | REST-style FioriX APIs; SAP OData where relevant |
| OpenAPI / JSON Schema | API and specification contracts | Recommended |
| Git + organisation Git platform | Version control and reviews | Required |
| npm | JS dependency/build | Required |
| CF CLI | BTP operations | Required |
| MTA / Cloud MTA Build Tool | Multi-target packaging | If topology requires |
| Docker | Local reproducible workers | Optional |
| ESLint / TypeScript checks | Static quality | Required |
| UI5 tooling | UI5 build | Required |
| Playwright / wdi5 | UI automation | Select after test spike |
| Jest/Mocha/Vitest | Unit tests | Choose compatible framework |
| pytest | Python tests | Only if Python worker exists |
| SAST/SCA tooling | Security and dependency scans | Organisation-approved |

CAP Node.js/TypeScript is the primary backend. Python is not mandatory. React is not selected for the FioriX shell because SAPUI5 is the chosen SAP-aligned UI framework.
