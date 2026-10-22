# Pathoclones

Interactive, evidence-linked organ models for clinical learning. The first model is the **breast**, built for Breast Cancer Awareness Month.

A pixel-art game on top of an evidence-linked simulation. Each tile on the board is a lobule of breast tissue. A clone of abnormal cells grows from one tile, colour-coded by stage (blue normal, gold hyperplasia, orange atypia, magenta DCIS, crimson invasive). Your habits change how fast it grows or whether it fades.

## How it plays

- Pick a level (Rookie, Warrior, Legend) and press play. One simulated year passes every second or so.
- Five habit cards: drinks, movement, weight, plate (fiber and soy) and scans. Change them at any time.
- **Risk radar:** one bar for how likely new clones are, one for growth pressure. When growth pressure drops below the line, early clones enter the shrink zone and can fade.
- **Tumor growth ladder:** tile counts per stage, with tumor size in mm once invasive.
- **Life chart:** bars for clone size over age, dots for your evolving risk.
- Points reward healthy years, the shrink zone, clones that fade and early detection. Late detection and spread cost points. Each level ends with a grade.
- Every habit has a `?` button with a plain-language reason and the PubMed sources behind it.

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
src/game/    levels, scoring rules, pixel board, pixel nebula, UI components
tests/       node:test suite
```

The engine is organ-agnostic in spirit: new organs mean a new state model, anatomy generator and evidence registry.
