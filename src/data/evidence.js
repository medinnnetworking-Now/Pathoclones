// Evidence registry. Every entry below was retrieved from PubMed (PMID + DOI) during
// development. Effect sizes are copied from the abstracts, not from memory.
//
// `status`:
//   'anchored'   – the simulation uses the published effect size directly
//   'directional'– published evidence supports the direction; the magnitude in the
//                  simulation is an illustrative assumption
//   'pending'    – no verified citation yet; the lever is a model assumption
//
// NutritionFacts.org slots are intentionally empty: the build sandbox could not reach
// nutritionfacts.org, so no video links were verified. Add them to `nutritionFacts`.

export const SOURCES = {
  sun2020: {
    id: 'sun2020',
    cite: 'Sun Q et al. Alcohol Alcohol 2020;55(3):246-253',
    title: 'Alcohol consumption by beverage type and risk of breast cancer: a dose-response meta-analysis of prospective cohort studies',
    pmid: '32090238',
    doi: '10.1093/alcalc/agaa012',
    design: 'Meta-analysis, 22 cohorts, 45,350 cases',
    finding: 'Each additional 10 g/day of alcohol: RR 1.10 (95% CI 1.08-1.13). Postmenopausal: RR 1.11 (1.09-1.13). Effect concentrated in ER+ disease.',
  },
  jun2023: {
    id: 'jun2023',
    cite: 'Jun S et al. Epidemiol Health 2023;45:e2023092',
    title: 'Cancer risk based on alcohol consumption levels: a comprehensive systematic review and meta-analysis',
    pmid: '37905315',
    doi: '10.4178/epih.e2023092',
    design: 'Systematic review + meta-analysis, 106 cohort studies',
    finding: 'Light alcohol intake was associated with higher breast cancer risk; the authors conclude no level of intake is risk-free for cancer.',
  },
  zhou2022: {
    id: 'zhou2022',
    cite: 'Zhou X et al. Eur J Epidemiol 2022;37(7):701-712',
    title: 'Alcohol consumption, blood DNA methylation and breast cancer: a Mendelian randomisation study',
    pmid: '35708873',
    doi: '10.1007/s10654-022-00886-1',
    design: 'Meta-analysis + Mendelian randomisation',
    finding: 'Observational dose-response: about +4% risk per 10 g/day. Identified alcohol-linked DNA methylation sites associated with breast cancer incidence.',
  },
  activity2018: {
    id: 'activity2018',
    cite: 'Value Health 2018;22:104-128',
    title: 'Physical activity and risk of breast cancer: a meta-analysis of 38 cohort studies in 45 study reports',
    pmid: '30661625',
    doi: '10.1016/j.jval.2018.06.020',
    design: 'Meta-analysis, 38 cohorts, 68,416 cases',
    finding: 'Overall RR 0.87 (0.84-0.90); premenopausal 0.83, postmenopausal 0.91. Linear trend: -3% risk per 10 MET-h/week of recreational activity.',
  },
  activity2017: {
    id: 'activity2017',
    cite: 'Menopause 2017;24:322-344',
    title: 'Moderate-vigorous recreational physical activity and breast cancer risk, stratified by menopause status',
    pmid: '27779567',
    doi: '10.1097/GME.0000000000000745',
    design: 'Systematic review + meta-analysis',
    finding: 'High vs low activity: RR 0.80 (premenopausal) and 0.79 (postmenopausal); weaker in cohort-only and activity-adjusted analyses (postmenopausal cohorts RR 0.90).',
  },
  vandie2024: {
    id: 'vandie2024',
    cite: 'van Die MD et al. JNCI Cancer Spectr 2024;8(1)',
    title: 'Phytonutrients and outcomes following breast cancer: a systematic review and meta-analysis of observational studies',
    pmid: '38070485',
    doi: '10.1093/jncics/pkad104',
    design: 'Meta-analysis of 32 observational studies',
    finding: 'Soy isoflavones: 26% lower recurrence (HR 0.74, 0.60-0.92), largest reduction near 60 mg/day. Soy protein/products and ER+ cancer-specific mortality HR 0.75. Enterolactone (lignan marker) all-cause mortality HR 0.69. No effect for cruciferous vegetables.',
  },
  ho2021: {
    id: 'ho2021',
    cite: 'Ho SC et al. Cancer Treat Res Commun 2021;27:100350',
    title: 'Pre-diagnosis and early post-diagnosis dietary soy isoflavone intake and survival outcomes: a prospective cohort of early stage breast cancer survivors',
    pmid: '33770661',
    doi: '10.1016/j.ctarc.2021.100350',
    design: 'Prospective cohort, 1,460 women',
    finding: 'Moderate (third-quartile) isoflavone intake was associated with lower all-cause mortality (HR 0.34 pre-diagnosis, 0.44 post-diagnosis).',
  },
  mauny2022: {
    id: 'mauny2022',
    cite: 'Mauny A et al. Cancers 2022;14(24):6163',
    title: 'Phytoestrogens and breast cancer: should French recommendations evolve?',
    pmid: '36551648',
    doi: '10.3390/cancers14246163',
    design: 'Systematic review of 7 prospective cohorts',
    finding: 'No study found significant adverse effects of soy isoflavones on recurrence or mortality; the authors judge soy intake safe for survivors, pending larger studies.',
  },
  fiber2020: {
    id: 'fiber2020',
    cite: 'Jayedi A et al. Nutr Cancer 2020;73:1570-1580',
    title: 'Dietary fiber and survival in women with breast cancer: a dose-response meta-analysis of prospective cohort studies',
    pmid: '32795218',
    doi: '10.1080/01635581.2020.1803928',
    design: 'Meta-analysis, 7 cohorts, 11,295 patients',
    finding: 'Highest vs lowest fiber intake: all-cause mortality RR 0.63 (0.52-0.77); breast-cancer-specific mortality RR 0.72 (0.54-0.96). Evidence quality moderate (all-cause) to low (cancer-specific).',
  },
  ecig2021: {
    id: 'ecig2021',
    cite: 'Canelo-Aybar C et al. J Med Screen 2021;28(4):389-404',
    title: 'Benefits and harms of breast cancer mammography screening for women at average risk: systematic review for the European Commission Initiative on Breast Cancer',
    pmid: '33632023',
    doi: '10.1177/0969141321993866',
    design: 'Systematic review, 10 RCTs, 616,641 women',
    finding: 'Breast cancer mortality RR 0.77 (0.66-0.90) at 50-69; 0.88 (0.76-1.02) under 50. Overdiagnosis probability about 17% (50-69) and 23% (<50).',
  },
  ctfphc2024: {
    id: 'ctfphc2024',
    cite: 'Bennett A et al. Syst Rev 2024;13:304',
    title: 'Screening for breast cancer: a systematic review update to inform the Canadian Task Force guideline',
    pmid: '39702409',
    doi: '10.1186/s13643-024-02700-3',
    design: 'Systematic review update',
    finding: 'RCT-based breast cancer mortality RR 0.85 (0.78-0.93) for screening mammography; absolute benefit rises with age decade. GRADE certainty low to very low overall.',
  },
  kim2024: {
    id: 'kim2024',
    cite: 'Kim J, Munster PN. Ann Oncol 2025;36(2):134-148',
    title: 'Estrogens and breast cancer',
    pmid: '39522613',
    doi: '10.1016/j.annonc.2024.10.824',
    design: 'Review',
    finding: 'Estrogen-plus-progestin HRT consistently increases breast cancer risk in postmenopausal women; estrogen-alone HRT has little impact. Progestogens are proposed as the main hormonal driver.',
  },
  prentice2021: {
    id: 'prentice2021',
    cite: 'Prentice RL et al. Am J Epidemiol 2021;190(3):365-375',
    title: 'Randomized trial evaluation of the benefits and risks of menopausal hormone therapy among women 50-59 years of age',
    pmid: '33025002',
    doi: '10.1093/aje/kwaa210',
    design: 'Women\'s Health Initiative RCTs, 18-year follow-up',
    finding: 'Estrogen plus progestin increased breast cancer risk; conjugated estrogens alone did not.',
  },
};

// Levers shown in the Decisions panel. `evidence` lists source ids.
export const LEVER_EVIDENCE = {
  alcohol: {
    status: 'anchored',
    effect: 'RR 1.10 per +10 g/day (1.11 postmenopausal) applied to lesion initiation.',
    sources: ['sun2020', 'jun2023', 'zhou2022'],
    nutritionFacts: [],
  },
  activity: {
    status: 'anchored',
    effect: '-3% initiation risk per +10 MET-h/week of recreational activity (linear).',
    sources: ['activity2018', 'activity2017'],
    nutritionFacts: [],
  },
  soy: {
    status: 'anchored',
    effect: 'Recurrence/progression hazard x0.74 at 60 mg/day isoflavones, scaled linearly below. Acts on established disease only: the evidence is in survivors.',
    sources: ['vandie2024', 'ho2021', 'mauny2022'],
    nutritionFacts: [],
  },
  fiber: {
    status: 'directional',
    effect: 'Cancer-specific mortality RR 0.72 for highest vs lowest intake. The 10 g/day to 30 g/day mapping is an illustrative assumption. Acts on established disease only.',
    sources: ['fiber2020'],
    nutritionFacts: [],
  },
  hrt: {
    status: 'directional',
    effect: 'Direction from WHI/RCT evidence: combined estrogen+progestin raises risk, estrogen-alone does not. The x1.25 magnitude for combined therapy is an illustrative assumption.',
    sources: ['kim2024', 'prentice2021'],
    nutritionFacts: [],
  },
  screening: {
    status: 'directional',
    effect: 'Screening detects lesions earlier (sensitivity values are illustrative). Published context: mortality RR 0.77 at 50-69 with ~17% overdiagnosis; certainty low to very low in the Canadian review.',
    sources: ['ecig2021', 'ctfphc2024'],
    nutritionFacts: [],
  },
  bmi: {
    status: 'pending',
    effect: 'Adiposity raises postmenopausal estrogenic drive in the model (illustrative +10% initiation risk per 5 BMI units after menopause). No verified citation yet.',
    sources: [],
    nutritionFacts: [],
  },
  inherited: {
    status: 'pending',
    effect: 'Multipliers for inherited risk are illustrative teaching values, not estimates for any specific variant.',
    sources: [],
    nutritionFacts: [],
  },
};
