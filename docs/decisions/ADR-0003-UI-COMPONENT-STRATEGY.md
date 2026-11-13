# ADR-0003: UI Component & Design System Strategy
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Senior Enterprise UX Architect, Senior React Engineer, SAP Fiori UX Specialist  
**Technical Scope:** Fiorify Web Frontend Component Architecture  

---

## 1. Context and Problem Statement
Fiorify is implemented in React 18 with TypeScript and Vite. It must reflect SAP Fiori design principles (Horizon theme) while maintaining rapid responsiveness, high density, and clean accessibility. We need a clear strategy regarding whether to force `@ui5/webcomponents-react` across every DOM element, rely on standard HTML/CSS with SAP tokens, or adopt a selective hybrid approach.

## 2. Decision
1. **Primary Component Foundation:** Maintain the established custom React component library styled with **official SAP Fiori Horizon design tokens** (`tokens.css`, `components.css`).
2. **Selective Adoption of UI5 Web Components:** Adopt `@ui5/webcomponents` or `@ui5/webcomponents-react` selectively only where complex SAP-specific behaviors (such as specialized shell bars or analytical tables) provide clear functional value without degrading bundle size or developer velocity.
3. **No Decorative Clutter:** Strictly eliminate AI chatbot sidecars, glowing gradients, and unnecessary animations.
4. **Accessible Enterprise Tables & Forms:** Data tables, filter bars, status badges, and modals must adhere to W3C ARIA standards and keyboard navigation.

## 3. Consequences
- **Positive:** Sub-second Vite HMR, small bundle size (~380 kB total JS), complete control over layout and responsiveness, zero shadow-DOM styling headaches.
- **Trade-off:** Custom React components must be maintained to adhere strictly to SAP Fiori visual guidelines.
