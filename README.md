# Pathoclones

Interactive, evidence-linked organ models for clinical learning. The first model is the **breast**, built for Breast Cancer Awareness Month.

The organ is drawn as readable anatomy (duct tree, lobules, skin and adipose envelope, nipple, axillary nodes). Each lobule's colour and size shows the state of the clone living in it. The backdrop and UI take their look from Webb-style nebulae and stellar telemetry.

## What it teaches

- **Clonal evolution:** normal tissue, hyperplasia, atypia, DCIS and invasive carcinoma are modeled as nested clones that compete, advance and can go extinct.
- **Decisions change the environment:** alcohol, activity, BMI, fiber, soy, hormone therapy and screening feed a tissue model (inflammation, estrogenic drive, proliferation, genomic stability, immune surveillance). Habits are integrated over months, not applied instantly.
- **Reversal window:** early lesions regress only when proliferative drive falls well below the reference level. In situ and invasive disease do not regress through lifestyle in this model; they need clinical treatment.
- **Timeline branching:** scrub back, change a lever and the future re-runs from that point.
- **Cohort view:** 600 simulated lives under your decisions vs the reference lifestyle, with shared random seeds.

## Evidence policy

Every citation in `src/data/evidence.js` was retrieved from PubMed (PMID and DOI) and the effect sizes were copied from the abstracts. Each lever is labelled:

| Badge | Meaning |
| --- | --- |
| Anchored | The simulation applies the published effect size directly (alcohol, activity, soy). |
| Directional | Evidence supports the direction; the magnitude is an illustrative assumption (fiber mapping, HRT magnitude, screening sensitivity). |
| Assumption | No verified citation yet (BMI effect size, inherited-risk multipliers). |

NutritionFacts.org slots are intentionally empty. The build sandbox could not reach that site, so no video links were verified. Add them to `nutritionFacts` in `src/data/evidence.js` after checking the live pages.

Soy and fiber are applied only to established disease, because the cited evidence comes from breast cancer survivors.

## Limitations

This is an educational model, not a diagnostic tool, risk calculator or medical advice.

- The absolute reference rate (about 10% invasive diagnosis by 85) is calibrated to be plausible, not predictive.
- Relative risks in the cohort view can exceed published initiation effects because progression assumptions are layered on top.
- Tissue proxies (inflammation, estrogenic drive, proliferation, genomic stability, immune surveillance) are illustrative composites, not measured quantities.
- Regression of precursor lesions under lifestyle change is a mechanism the model demonstrates; it is not established as a clinical effect.
- Observational associations are not proof of cause.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests (calibration, determinism, snapshot branching, directional checks)
npm run build
```

Add `?debug` to the URL to expose `window.__pc` (scene and controller) for inspection.

## Layout

```
src/sim/     engine, RNG, timeline controller, cohort runner
src/data/    evidence registry (PubMed-verified)
src/scene/   procedural anatomy, shaders, Three.js scene
src/ui/      panels and configuration
tests/       node:test suite
```

The engine is organ-agnostic in spirit: new organs mean a new state model, anatomy generator and evidence registry.
