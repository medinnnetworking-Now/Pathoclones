# Luminara: Breast Cancer Awareness Month

A luminous, filament-style journey through breast cancer. A woman's silhouette is drawn in glowing strands. The camera flies into the breast and follows a cancer stage by stage, then through treatment, then to what can reverse it and what genes say.

Aesthetic reference: connectome-style light on pure black, an elegant serif, a coloured italic verb per stage and lime mono stats.

## Views

- **Journey** (11 stages, tap, swipe or use the arrow keys): healthy tissue, hyperplasia, atypia, DCIS, invasive cancer, lymph node spread, screening and diagnosis, surgery, radiation, systemic therapy, survivorship.
- **Reversal** (top right): a live lab. An early clone is simulated while you change five habits and watch it fade or grow. Below it, what contributes to prevention and reversal, with evidence strength and sources.
- **Genetics** (top right): BRCA1 and BRCA2 on a glowing DNA helix, lifetime risk in carriers, other risk genes, options such as MRI, risk-reducing surgery and olaparib, and preventive genomics.

Each stage has a "Learn more" sheet with PubMed and DOI links for the studies behind it.

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

## Layout

```
src/sim/     engine, RNG, timeline controller, cohort runner
src/data/    evidence registry (PubMed-verified)
src/stage/   filament geometry, shaders, Three.js scene and camera choreography
src/content/ journey, reversal and genetics copy
src/ui/      story and reversal panels
tests/       node:test suite
```

The engine is organ-agnostic in spirit: new organs mean a new state model, anatomy generator and evidence registry.
