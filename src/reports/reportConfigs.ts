// Report template configs — per-test visual/narrative settings consumed by the
// unified pdf-lib generator (src/pdf-generator/generateReportPdf.ts).
// This file was referenced-but-missing in the original draft and is authored
// here for all 9 tests.

import { ReportTemplateConfig, TestId } from '@/types/assessment';

export const REPORT_CONFIGS: Record<TestId, ReportTemplateConfig> = {
  commerce: {
    testId: 'commerce',
    reportTitle: 'Commerce Career Selector',
    reportSubtitle: 'Psychometric Career Assessment & Counseling Report',
    accentHex: [0.15, 0.39, 0.92], // #2563EB blue
    methodologySteps: [
      { title: '76 Situational Items', desc: '4 targeted statements per cluster rated on a 5-point Likert scale (max 20 pts/cluster).' },
      { title: 'Domain Classification', desc: 'Measures macro inclination across 8 Financial clusters versus 11 Non-Financial clusters.' },
      { title: 'Relative Norm Tiering', desc: 'Classifies all 19 clusters into High (top third), Medium (middle third) and Low (bottom third) bands.' },
    ],
    deliverables: [
      'Brief knowledge about all available Commerce Careers, both financial and non-financial.',
      'An answer to which Commerce career option you should opt for based on innate inclinations.',
      'A scientifically designed psychometric analysis matching activity choices with professional careers.',
      'Graphical results: radar chart, domain analysis, interest-level spectrum and cluster tables.',
    ],
    descriptors: [
      { badge: 'HIGH', color: 'green', text: 'Deep understanding and interest — recommended primary career focus.' },
      { badge: 'MEDIUM', color: 'amber', text: 'Moderate interest and awareness — viable with dedicated effort and motivation.' },
      { badge: 'LOW', color: 'rose', text: 'Low interest and awareness — avoid as a major; consider only as supporting skill.' },
    ],
    chartMode: 'radar-and-bars',
  },
  engineering: {
    testId: 'engineering',
    reportTitle: 'Engineering Branch Selector',
    reportSubtitle: 'B.E. / B.Tech Branch Aptitude & Discipline Fit Report',
    accentHex: [0.05, 0.65, 0.91], // #0EA5E9 sky
    methodologySteps: [
      { title: '56 Work-Situation Items', desc: 'Statements across 14 engineering branch groups rated on a 5-point Likert scale (max 20 pts/group).' },
      { title: '6-Tier Potential Scale', desc: 'Scores map to Very High, High, Above Average, Average, Below Average and Very Low tiers.' },
      { title: 'Sector Macro-Analysis', desc: 'The 14 groups roll up into 4 macro sectors: Digital/Electrical/Aero, Mechanical/Civil, Chemical/Material and Bio/Agro/Earth.' },
    ],
    deliverables: [
      'A ranked list of all 14 engineering branch groups by personal affinity.',
      'Specific B.E./B.Tech discipline recommendations for every branch group.',
      'A macro-sector analysis showing where your technical interests concentrate.',
      'An action plan aligning entrance exams and first-semester skill building.',
    ],
    descriptors: [
      { badge: 'VERY HIGH', color: 'green', text: '80%+ affinity — a primary branch choice with strong natural pull.' },
      { badge: 'HIGH / ABOVE AVG', color: 'blue', text: '50–79% affinity — a solid secondary choice worth shortlisting.' },
      { badge: 'BELOW AVG', color: 'rose', text: 'Under 35% affinity — pursue only with strong external motivation.' },
    ],
    chartMode: 'radar-and-bars',
  },
  humanities: {
    testId: 'humanities',
    reportTitle: 'Humanities Career Selector',
    reportSubtitle: 'Psychometric Career Assessment & Counseling Report',
    accentHex: [0.39, 0.4, 0.95], // #6366F1 indigo
    methodologySteps: [
      { title: '76 Situational Items', desc: '4 statements per cluster across 19 Humanities career clusters on a 5-point Likert scale (max 20 pts/cluster).' },
      { title: 'Domain Classification', desc: 'Splits clusters into 10 Public Service & Management versus 9 Creative, Media & Applied Arts clusters.' },
      { title: 'Relative Norm Tiering', desc: 'Classifies all 19 clusters into High (top third), Medium (middle third) and Low (bottom third) bands.' },
    ],
    deliverables: [
      'Brief knowledge about all available Humanities careers, in both public-service and creative domains.',
      'A ranked view of all 19 clusters with the careers and workplaces each one leads to.',
      'A macro-domain analysis showing whether your strengths lean public-service or creative.',
      'An action plan mapping degrees, portfolios and entrance exams to your top clusters.',
    ],
    descriptors: [
      { badge: 'HIGH', color: 'green', text: 'Deep interest and awareness — recommended primary career focus.' },
      { badge: 'MEDIUM', color: 'amber', text: 'Moderate interest — viable with sustained motivation and study.' },
      { badge: 'LOW', color: 'rose', text: 'Low interest and awareness — avoid as a primary career direction.' },
    ],
    chartMode: 'radar-and-bars',
  },
  'ideal-career': {
    testId: 'ideal-career',
    reportTitle: 'Ideal Career Assessment',
    reportSubtitle: '360° Aptitude, Interest, Personality & Motivation Report',
    accentHex: [0.06, 0.73, 0.51], // #10B981 green
    methodologySteps: [
      { title: '4-Pillar Model', desc: '182 items across cognitive aptitude, RIASEC interests, Big Five personality and career motivators.' },
      { title: 'Aptitude Scoring', desc: '5 cognitive areas (critical, numerical, verbal, acuteness, spatial) scored out of 10 on answer accuracy.' },
      { title: 'Theme Ranking', desc: 'RIASEC themes and motivators are tallied and ranked to locate the ideal career intersection.' },
    ],
    deliverables: [
      'Aptitude profile across all 5 cognitive areas with a /10 score for each.',
      'Your RIASEC interest code and the top 3 matching career fields.',
      'Big Five personality radar showing your trait balances.',
      'Your dominant career motivator and how it should shape role selection.',
    ],
    descriptors: [
      { badge: 'HIGH', color: 'green', text: 'Strong signal — treat this pillar as a primary decision input.' },
      { badge: 'MODERATE', color: 'amber', text: 'Mixed signal — support with additional exploration or testing.' },
      { badge: 'DEVELOPING', color: 'rose', text: 'Emerging signal — build skills deliberately before relying on it.' },
    ],
    chartMode: 'radar-and-bars',
  },
  'learning-styles': {
    testId: 'learning-styles',
    reportTitle: 'Learning Style Assessment',
    reportSubtitle: 'Sensory, Environmental & Mindset Preference Profile',
    accentHex: [0.96, 0.62, 0.04], // #F59E0B amber
    methodologySteps: [
      { title: '64 Preference Items', desc: 'Statements across 16 learning preferences rated on a 5-point agreement scale (max 20 pts/preference).' },
      { title: '3 Preference Families', desc: 'Preferences group into Sensory (4), Environmental (6) and Mindset (6) families.' },
      { title: 'Study Strategy Mapping', desc: 'Top preferences translate into concrete study-environment and technique recommendations.' },
    ],
    deliverables: [
      'A ranked profile of all 16 learning preferences with percentage scores.',
      'Your dominant sensory modality and how to exploit it while studying.',
      'Environmental conditions (light, sound, intake, time) that maximise retention.',
      'Mindset insights covering motivation, structure and collaboration needs.',
    ],
    descriptors: [
      { badge: 'VERY HIGH / HIGH', color: 'green', text: '12+ pts — a defining preference; design your study routine around it.' },
      { badge: 'MODERATE', color: 'amber', text: '8–11 pts — a usable preference; apply when convenient.' },
      { badge: 'LOW', color: 'rose', text: 'Under 8 pts — this preference contributes little to your learning.' },
    ],
    chartMode: 'radar-and-bars',
  },
  'multi-dimensional': {
    testId: 'multi-dimensional',
    reportTitle: 'Multi-Dimensional Psychometric Test',
    reportSubtitle: 'Five-Dimensional Adaptive Profile Report',
    accentHex: [0.39, 0.4, 0.95], // #6366F1 indigo
    methodologySteps: [
      { title: 'Grade-Adaptive Banks', desc: '60 items per grade level (Class 8-10, 11-12, UG, PG) across five dimensions.' },
      { title: 'Per-Section Scales', desc: 'Each of the 5 sections uses its own tailored 5-point response scale.' },
      { title: 'Cross-Dimension Synthesis', desc: 'Category scores are ranked and section averages form a five-axis profile radar.' },
    ],
    deliverables: [
      'Ranked category scores across Natural Abilities, Interests, Personality, Motivators and Learning Styles.',
      'A five-section radar showing your balance across the whole profile.',
      'Career mappings for every dominant category.',
      'Practical next steps uniting your top ability, interest and motivator.',
    ],
    descriptors: [
      { badge: 'DOMINANT', color: 'green', text: '70%+ — a defining strength; build plans around it.' },
      { badge: 'MODERATE', color: 'amber', text: '45–69% — a workable strength worth developing.' },
      { badge: 'EMERGING', color: 'rose', text: 'Under 45% — early-stage; nurture through exposure.' },
    ],
    chartMode: 'radar-and-bars',
  },
  'multiple-intelligence': {
    testId: 'multiple-intelligence',
    reportTitle: 'Multiple Intelligence Assessment',
    reportSubtitle: "Gardner's 9 Intelligences & Emotional Intelligence Report",
    accentHex: [0.06, 0.73, 0.51], // #10B981 green
    methodologySteps: [
      { title: '54 Statements, 7-Point Scale', desc: 'Six statements per intelligence rated 1-7 (max 42 pts per intelligence).' },
      { title: '9 Intelligences', desc: 'Linguistic, Logical, Spatial, Kinesthetic, Musical, Interpersonal, Intrapersonal, Naturalist and Existential.' },
      { title: 'Emotional Intelligence', desc: 'EI is computed as the blend of Interpersonal and Intrapersonal intelligence percentages.' },
    ],
    deliverables: [
      'A ranked profile of all 9 intelligences with percentage scores.',
      'Career mappings for each of your dominant intelligences.',
      'Your Emotional Intelligence (EI) percentage.',
      'Targeted development advice for your strongest intelligences.',
    ],
    descriptors: [
      { badge: 'VERY HIGH / HIGH', color: 'green', text: '65%+ — a core intelligence strength; lead with it.' },
      { badge: 'MODERATE', color: 'amber', text: '50–64% — functional; strengthen with practice.' },
      { badge: 'LOW', color: 'rose', text: 'Under 50% — supporting intelligence at present.' },
    ],
    chartMode: 'radar-and-bars',
  },
  personality: {
    testId: 'personality',
    reportTitle: 'Personality Type Assessment',
    reportSubtitle: 'Four-Dichotomy Type & Career Fit Report',
    accentHex: [0.15, 0.39, 0.92], // #2563EB blue
    methodologySteps: [
      { title: '36 Forced-Choice Pairs', desc: 'Each item presents two equally attractive statements; you choose the more natural one.' },
      { title: 'Four Dichotomies', desc: 'Choices accumulate across E/I (energy), S/N (perception), T/F (decisions) and J/P (lifestyle).' },
      { title: 'Type Resolution', desc: 'The dominant letter in each pair combines into one of 16 four-letter personality types.' },
    ],
    deliverables: [
      'Your four-letter personality type with its descriptive nickname.',
      'Percentage split for each of the four dichotomies.',
      'Type-based strengths, challenges and growth recommendations.',
      'Career pathways and typical roles aligned to your type.',
    ],
    descriptors: [
      { badge: 'CLEAR', color: 'green', text: '75%+ split — a strong, reliable preference.' },
      { badge: 'MODERATE', color: 'amber', text: '55–74% split — a preference with some flexibility.' },
      { badge: 'SLIGHT', color: 'rose', text: '50–54% split — near-balanced; both poles may fit.' },
    ],
    chartMode: 'divergent-bars',
  },
  'stream-selector': {
    testId: 'stream-selector',
    reportTitle: 'Stream Selector Test',
    reportSubtitle: 'Class 10 Aptitude + Interest Stream Recommendation',
    accentHex: [0.05, 0.65, 0.91], // #0EA5E9 sky
    methodologySteps: [
      { title: '76 Diagnostic Items', desc: 'Yes/No/Not-sure interest items and applied aptitude questions across 4 stream domains.' },
      { title: 'Dual Measurement', desc: 'Interest (behavioural) and aptitude (applied) are scored separately per stream.' },
      { title: 'Composite Ranking', desc: 'Each stream gets a composite of 50% aptitude + 50% interest, ranked 1-4.' },
    ],
    deliverables: [
      'A ranked comparison of Science (PCM), Science (PCB), Commerce and Humanities.',
      'Separate aptitude and interest percentages for every stream.',
      'Top undergraduate courses and durations for the recommended stream.',
      'Subject-selection and entrance-exam alignment guidance.',
    ],
    descriptors: [
      { badge: 'RANK #1', color: 'green', text: 'Highest composite — the recommended primary stream.' },
      { badge: 'RANK #2', color: 'blue', text: 'Strong secondary — useful for elective subject choices.' },
      { badge: 'LOWER RANKS', color: 'rose', text: 'Weaker alignment — keep only as backup options.' },
    ],
    chartMode: 'radar-and-bars',
  },
};

export function getReportConfig(testId: TestId): ReportTemplateConfig | undefined {
  return REPORT_CONFIGS[testId];
}
