# FioriX Design System & Visual Standards
**Project:** FioriX — SAP S/4HANA On-Premise Fiori App Discovery, Assessment and Controlled Generation Platform  
**Document Version:** 1.0.0  
**Phase:** Sprint 1 Frontend Implementation  

---

## 1. Design System Philosophy

The FioriX Design System is engineered to feel indistinguishable from official SAP enterprise tools while delivering the responsiveness, modularity, and rapid feedback of modern React applications.

### Key Pillars
- **Zero Decorative Hype:** No pulsating gradients, no AI robot illustrations, no glowing sci-fi borders.
- **High Information Density with Visual Calm:** Clean, deliberate white space with dense data tables, clear visual hierarchy, and readable typography.
- **Semantic Color Usage:** Colors convey system state, test results, and governance decisions—never decorative embellishment.

---

## 2. Color Palette & Token Hierarchy

```css
:root {
  /* Core Brand & Shell */
  --fiori-navy: #142C40;          /* Global TopBar background & primary brand */
  --fiori-navy-hover: #1c3c56;    /* TopBar hover state */
  --fiori-sidebar-bg: #FFFFFF;    /* Clean white navigation sidebar */
  --fiori-sidebar-hover: #F0F4F7; /* Navigation hover background */
  --fiori-sidebar-active: #E5EFF5;/* Selected navigation item background */

  /* Primary Interactive Accents */
  --fiori-teal: #28718A;          /* Primary button, link, and active accent */
  --fiori-teal-hover: #1f586c;    /* Interactive hover state */
  --fiori-teal-light: #EBF3F6;    /* Subtle accent background */

  /* Neutral Backgrounds & Surfaces */
  --fiori-bg: #F5F7F9;            /* Global canvas background */
  --fiori-surface: #FFFFFF;       /* Object cards, data tables, modals */
  --fiori-surface-subtle: #FAFCFD;/* Alternate table row or subtle container */

  /* Typography */
  --fiori-text-primary: #1D2D3E;  /* High-contrast headers and body text */
  --fiori-text-secondary: #667788;/* Subtitles, table headers, metadata */
  --fiori-text-muted: #8E9EAE;    /* Placeholders, disabled text */
  --fiori-text-inverse: #FFFFFF;  /* Text on dark navy backgrounds */

  /* Structural Borders */
  --fiori-border: #DCE3E8;        /* Standard table borders and card outlines */
  --fiori-border-light: #EEF2F5;  /* Subtle interior dividers */
  --fiori-border-focus: #28718A;  /* Form focus outline */

  /* Semantic Governance States */
  --fiori-success: #107E3E;       /* PASS, ADOPT, VERIFIED, CONNECTED */
  --fiori-success-bg: #EDF7F0;    /* Light green chip background */
  --fiori-success-border: #A3D9B5;

  --fiori-warning: #E9730C;       /* PARTIAL, EXTEND, INFERRED, WARNING */
  --fiori-warning-bg: #FEF6EC;    /* Light orange chip background */
  --fiori-warning-border: #F8CB96;

  --fiori-error: #BB0000;         /* UNSUPPORTED, BUILD, FAIL, OFFLINE */
  --fiori-error-bg: #FDF0F0;      /* Light red chip background */
  --fiori-error-border: #E8A5A5;

  --fiori-neutral: #6A6D70;       /* UNKNOWN, NOT_RUN, DRAFT, REVIEW */
  --fiori-neutral-bg: #F2F4F5;    /* Light grey chip background */
  --fiori-neutral-border: #D1D5D8;

  /* Elevation Shadows */
  --fiori-shadow-sm: 0 1px 3px rgba(20, 44, 64, 0.06);
  --fiori-shadow-md: 0 4px 12px rgba(20, 44, 64, 0.08);
  --fiori-shadow-lg: 0 12px 28px rgba(20, 44, 64, 0.12);
}
```

---

## 3. Typography Scale

The font stack prioritizes **SAP 72**, falling back to standard clean enterprise sans-serif typefaces (`-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `"Helvetica Neue"`, `Arial`, `sans-serif`):

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display Header** | 24px (1.5rem) | 600 SemiBold | 1.25 | Page Titles, Assessment Names |
| **Section Header** | 18px (1.125rem) | 600 SemiBold | 1.3 | Card Headers, Modal Titles |
| **Subheader** | 14px (0.875rem) | 600 SemiBold | 1.4 | Table Section Headers, Group Titles |
| **Body Primary** | 13px (0.8125rem)| 400 Regular | 1.5 | Standard Table Cells, Paragraphs |
| **Body Secondary**| 12px (0.75rem) | 400 Regular | 1.4 | Timestamps, Metadata, Helper Text |
| **Status Badge** | 11px (0.6875rem)| 600 SemiBold | 1.2 | Uppercase Status Pills & Badges |
| **Code / DDL** | 12px (0.75rem) | 400 Regular | 1.6 | Monospace DDL, CDS, JSON Snippets |

---

## 4. Status Badges & Chips

All system badges follow a strict two-tone pill pattern (subtle tinted background + dark border + high-contrast text):

```
+--------------------------------------------------------------+
| [ VERIFIED ]       (Green: #107E3E on #EDF7F0)               |
| [ INFERRED ]       (Amber: #E9730C on #FEF6EC)               |
| [ UNKNOWN ]        (Grey:  #6A6D70 on #F2F4F5)               |
| [ NOT AUTHORIZED ] (Red:   #BB0000 on #FDF0F0)               |
+--------------------------------------------------------------+
| [ ADOPT ]          (Green: Standard app fully matches)       |
| [ EXTEND ]         (Amber: Standard app + supported BAdI)    |
| [ BUILD ]          (Red/Indigo: Custom build required)       |
| [ REVIEW ]         (Grey: Insufficient evidence to decide)   |
+--------------------------------------------------------------+
```

---

## 5. Component Interaction Guidelines

1. **Tables:**
   - Headers: Fixed, grey background (`--fiori-bg`), uppercase tracking, sort indicators.
   - Rows: Subtle border-bottom, hover highlight (`--fiori-surface-subtle`), clickable with cursor pointer when actionable.
2. **Filter Bars:**
   - Positioned directly above data tables with aligned Search input, Multi-select dropdowns, and "Reset Filters" action.
3. **Modals & Dialogs:**
   - Backdrop: Solid dark navy overlay at 40% opacity (`rgba(20, 44, 64, 0.4)`).
   - Card: Pure white surface with `--fiori-shadow-lg`, clear header with title, scrollable body (max-height 75vh), and sticky footer with primary and secondary button actions.
4. **Code Viewers (Generation Studio):**
   - Dark technical background (`#161B22` / `#0D1117`) or high-contrast light grey (`#F8FAFB`) with syntax highlighting for CDS, DDL, XML, and JSON.
