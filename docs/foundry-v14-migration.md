# Foundry VTT v14 Migration Guide & Compatibility Report (JANUS7)

**Status:** Research & Planning  
**Target Version:** Foundry VTT v14 (Stable)  
**Baseline Node.js:** 24.x

## Overview

Foundry VTT v14 introduces significant architectural shifts, moving away from legacy Measured Templates toward a unified Scene Region system and finalizing the ApplicationV2 transition. For JANUS7, this means both a hardening of existing bridges and a cleanup of the ActiveEffect data model.

---

## 1. Core Infrastructure Requirements

### Node.js 24
Foundry v14 officially requires **Node.js 24**.
*   **Impact:** Development tools (`tools/*.mjs`) and linting must be validated against Node 24.
*   **Action:** Verify that `spawnSync` calls in validators handle Node 24's strict ESM/CJS boundaries.

---

## 2. Breaking API Changes & Data Model

### Active Effects Overhaul
The data structure for creating and updating Active Effects has changed.
*   **Legacy (v11-v13):** `ActiveEffect#changes` (Array)
*   **Canonical (v14):** `ActiveEffect#system#changes` (Array)
*   **Affected Files:**
    *   [postroll-buff.js](file:///d:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/bridge/dsa5/postroll-buff.js)
    *   [timed-conditions.js](file:///d:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/bridge/dsa5/timed-conditions.js)
*   **Migration Path:**
    ```javascript
    // Update _buildEffectData() to use the system object:
    return {
      name: "Effect Name",
      system: {
        changes: [ ... ]
      }
    };
    ```

### Measured Templates Deprecation
Measured Templates are fully removed as a core data type and replaced by **Scene Regions**.
*   **Impact:** High. Any logic relying on template overlapping must migrate to Region intersections.
*   **JANUS7 Advantage:** The `SceneRegionsBridge` is already built on Regions. We should extend it to handle the new native Region types (Circle, Rectangle, Polygon).

---

## 3. UI & Application Framework

### ApplicationV2 & Native Pop-outs
v14 stabilizes the "Native Pop-out" feature where apps can be rendered in a separate browser window.
*   **Requirement:** Apps must use `ApplicationV2` (HandlebarsApplicationMixin).
*   **Action:** Ensure all JANUS7 apps have a unique `id` and `window.resizable: true` to support seamless pop-out transitions.

---

## 4. New Opportunities

### Native Scene Levels
v14 supports multi-level scenes out of the box.
*   **Feature Idea:** Map `academy.currentLocationId` not just to a 2D region, but to a specific **Scene Level**. This allows the "Academy Map" to be a single Scene with multiple floors, while the bridge automatically detects if a student is on the "Ground Floor" or the "Astronomy Tower".

---

## 5. Migration Checklist

- [ ] Update `package.json` to include Node 24 engine requirements.
- [ ] Refactor `DSA5PostRollBuffBridge` to the v14 `system.changes` data model.
- [ ] Audit `SceneRegionsBridge` for enhanced V14 interaction hooks (`tokenAnimateRegion`).
- [ ] Complete `ApplicationV2` refactoring for all sidebar and dashboard components.
- [ ] Verify security validator handles v14's native private class features (`#private`).
