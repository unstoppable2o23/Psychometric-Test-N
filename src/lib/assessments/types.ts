// Normalized assessment types — the unified format every assessment is
// converted into, regardless of its original HTML structure.

export type QuestionType =
  | 'YES_NO'        // 2 options: Yes / No
  | 'YES_NO_MAYBE'  // 3 options: Yes / No / Not sure
  | 'LIKERT5'       // 5-point Likert
  | 'LIKERT7'       // 7-point Likert
  | 'MCQ'           // 4-option multiple choice
  | 'FORCED_CHOICE' // choose between two labelled statements

export interface NormQuestion {
  orderIndex: number
  sectionId?: string
  sectionName?: string
  text: string
  questionType: QuestionType
  options: string[]
  dimension?: string          // primary dimension / category code
  // scoring map: optionLabel -> { dimensionCode: points }
  scoring: Record<string, Record<string, number>>
  isReverse: boolean
  // stream-selector specific
  streamDomain?: string       // sci_math | commerce | sci_bio | humanities
  streamType?: string         // interest | interest_reverse | aptitude
}

export interface DimensionDef {
  code: string
  name: string
  description: string
  maxScore: number
  // interpretation bands (ascending by minPct)
  bands: { label: string; minPct: number; description: string }[]
  strengths?: string[]
  developmentAreas?: string[]
}

export interface StreamOption {
  code: string
  title: string
  subtitle: string
  description: string
}

export type ScoringMethod =
  | 'SCORING_MAP'         // generic: use per-question scoring map
  | 'DOMAIN_STREAM'       // stream-selector special: aptitude/interest composites
  | 'FORCED_CHOICE_PAIR'  // personality: pairs produce dimension letters

export interface NormAssessment {
  slug: string
  title: string
  shortTitle: string
  description: string
  purpose: string
  targetPopulation: string
  instructions: string
  estimatedMinutes: number
  category: string
  scoringMethod: ScoringMethod
  questions: NormQuestion[]
  dimensions: DimensionDef[]
  // optional: stream/career recommendation database
  recommendations?: StreamOption[]
  // extra metadata for multi-dimensional test (per-class question banks)
  multiClass?: boolean
}

// What the scoring engine returns for one attempt
export interface ScoreResult {
  dimensions: {
    code: string
    name: string
    score: number
    maxScore: number
    pct: number
    level: string
    description?: string
  }[]
  totalScore?: number
  recommendation?: string
  topDimensions?: string[]
  // for stream-selector style: per-domain aptitude/interest/composite
  domainBreakdown?: {
    code: string
    title: string
    aptitude: number
    interest: number
    composite: number
  }[]
}
