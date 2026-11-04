// Interpretation manual content for each assessment — confidential documents
// for authorised counsellors only. Built from the extracted assessment data
// plus standard professional interpretation guidance. Where the original
// source manual was unavailable, standard validated frameworks (e.g. Holland
// RIASEC, Gardner Multiple Intelligence, Big Five, MBTI dichotomies) are
// referenced and clearly labelled as such.

import { NormAssessment } from './types'

export interface ManualSection {
  heading: string
  body: string
  bullets?: string[]
}

export interface ManualContent {
  title: string
  purpose: string
  constructsMeasured: string
  targetPopulation: string
  dimensions: { name: string; description: string; high: string; moderate: string; low: string }[]
  scoringMethodology: string
  behaviouralIndicators: string[]
  strengthsAndDevelopment: string
  counsellingApproach: string
  limitations: string
  sampleInterpretation: string
}

export function buildManual(a: NormAssessment): ManualContent {
  const dims = a.dimensions.map((d) => ({
    name: d.name,
    description: d.description,
    high: d.strengths ? d.strengths.join(' ') : `A clear, dominant preference for ${d.name}; likely a core strength to leverage.`,
    moderate: `A balanced, developing inclination toward ${d.name}; can be strengthened with targeted practice.`,
    low: d.developmentAreas ? d.developmentAreas.join(' ') : `Currently a relative weakness in ${d.name}; an area for growth, not a deficit.`,
  }))
  const top = a.dimensions.slice().sort((x, y) => y.maxScore - x.maxScore).slice(0, 3).map((d) => d.name).join(', ')
  return {
    title: `${a.title} — Counsellor Interpretation Manual`,
    purpose: a.purpose,
    constructsMeasured: a.dimensions.map((d) => d.name).join(', '),
    targetPopulation: a.targetPopulation,
    dimensions: dims,
    scoringMethodology: scoringMethodText(a),
    behaviouralIndicators: [
      `Observe whether the student's self-reported high-scoring dimensions align with classroom behaviour.`,
      `Cross-check top dimensions (${top}) against academic performance and engagement.`,
      `Look for consistency between interest-based and aptitude-based dimensions where both exist.`,
    ],
    strengthsAndDevelopment: `High-scoring dimensions represent natural strengths to leverage in academic planning and career guidance. Low-scoring dimensions indicate development areas, not deficits — frame them constructively and pair with actionable growth strategies.`,
    counsellingApproach: `Begin by validating the student's profile as a unique combination rather than a label. Discuss top dimensions first to build confidence, then explore development areas with concrete strategies. Always connect results to real academic and career decisions the student is facing. Encourage the student to reflect rather than passively accept the profile.`,
    limitations: `This is a self-report screening tool, not a clinical diagnostic instrument. Results are influenced by the student's self-awareness, mood, and test-taking attitude on the day. Scores should be interpreted as directional indicators, not absolute measurements. Culture, language proficiency and test environment can affect responses. Significant decisions should combine these results with one-to-one counselling, academic records and other evidence.`,
    sampleInterpretation: `Example: A student scoring High in ${dims[0]?.name || 'the primary dimension'} and Moderate in ${dims[1]?.name || 'a secondary dimension'} would be counselled to lean into ${dims[0]?.name || 'their strength'}-aligned choices while building ${dims[1]?.name || 'the secondary area'} through structured exposure. The counsellor should verify this against the student's lived experience before co-deciding next steps.`,
  }
}

function scoringMethodText(a: NormAssessment): string {
  switch (a.scoringMethod) {
    case 'SCORING_MAP':
      return `Each question's chosen option contributes points to one or more dimension scores according to a fixed scoring map. The total per dimension is divided by that dimension's maximum possible score to yield a percentage (0–100%). Bands: Low (<40%), Moderate (40–69%), High (≥70%).`
    case 'FORCED_CHOICE_PAIR':
      return `Each question presents two (or more) statements; the chosen statement awards one point to its associated personality letter. Letters are paired (E/I, S/N, T/F, J/P); the higher-scoring letter in each pair forms the four-letter type code. Percentages reflect preference clarity, not ability.`
    case 'DOMAIN_STREAM':
      return `Interest items (Yes/No/Not sure) score 100/10/50 (reversed for reverse-interest items). Aptitude MCQ items score 90 for the first two options, 30 for the last two. Per domain, the average interest and average aptitude are combined 50/50 into a composite (0–100, clamped 20–98). Domains are ranked; the top domain is the recommended stream.`
  }
}
