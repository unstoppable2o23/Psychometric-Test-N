// Unified assessment types — shared models for all 9 tests.
// Part of the unified scoring + PDF system (see src/scoring/scoringEngine.ts,
// src/pdf-generator/generateReportPdf.ts, src/tests/*.config.ts).

export type TestId =
  | 'commerce'
  | 'engineering'
  | 'humanities'
  | 'ideal-career'
  | 'learning-styles'
  | 'multi-dimensional'
  | 'multiple-intelligence'
  | 'personality'
  | 'stream-selector';

export type QuestionType = 'likert-5' | 'likert-7' | 'forced-choice-ab' | 'mcq' | 'multi-select';

export type GradeLevel = 'Class 8 - 10' | 'Class 11 - 12' | 'Undergraduate' | 'Postgraduate';

export type BadgeColor = 'green' | 'blue' | 'sky' | 'amber' | 'rose' | 'slate';

export interface StudentInfo {
  name: string;
  email: string;
  phone: string;
  grade?: GradeLevel;
}

export interface BrandingConfig {
  clientName?: string;
  logoUrl?: string;
}

export interface QuestionItem {
  id: string;
  section: string;
  text: string;
  type: QuestionType;
  options: string[];
  /** Optional metadata used by test-specific scoring rules */
  category?: string;
  reverse?: boolean;
  passage?: string;
  codeDisplay?: string;
  correctOption?: string;
  aptitudeDomain?: 'critical' | 'numerical' | 'verbal' | 'acuteness' | 'spatial';
  streamDomain?: 'sci_math' | 'commerce' | 'sci_bio' | 'humanities';
  streamMetric?: 'interest' | 'interest_reverse' | 'aptitude';
  abTraits?: [string, string]; // e.g., ['E', 'I']
  scoringMap?: {
    riasec?: Record<string, Record<string, number>>;
    bigFive?: Record<string, Record<string, number>>;
    motivator?: string;
    values?: Record<string, number>;
  };
}

export interface TestConfig {
  id: TestId;
  title: string;
  highlightedTitle: string;
  subtitle: string;
  estimatedMinutes: string;
  badgeChips: string[];
  instructions: string;
  requiresGrade?: boolean;
  autoAdvanceOnSelect?: boolean;
  /** Either static questions or grade-keyed question banks (for Multi-Dimensional) */
  questions: QuestionItem[] | Record<GradeLevel, QuestionItem[]>;
  metadata: Record<string, unknown>;
}

/** Standardized output produced by the Centralized Scoring Engine */
export interface ScoredDimension {
  label: string;
  subLabel?: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  tier: string;
  tierColor: BadgeColor;
  details?: string;
}

export interface DivergentPair {
  leftLabel: string;
  rightLabel: string;
  leftPct: number;
  rightPct: number;
}

export interface AssessmentResult {
  testId: TestId;
  testTitle: string;
  reportId: string;
  student: StudentInfo;
  dateFormatted: string;
  totalQuestions: number;
  answeredCount: number;
  heroBadge?: { code: string; subtitle: string }; // Used for MBTI (e.g., INTJ - The Architect)
  kpis: Array<{ big: string; label: string; sub: string; color: 'blue' | 'green' | 'indigo' | 'amber' }>;
  macroSplit?: Array<{ label: string; percentage: number; sub: string; color: 'blue' | 'green' | 'amber' | 'indigo' }>;
  divergentPairs?: DivergentPair[]; // Used for MBTI 4-axis split
  radarData?: Array<{ label: string; value: number }>;
  rankedDimensions: ScoredDimension[];
  detailRows: Array<{
    name: string;
    sub: string;
    scoreText: string;
    percentage: number;
    badge: string;
    badgeColor: BadgeColor;
    description: string;
  }>;
  executiveSummary: string;
  executiveTakeaway: string;
  actionSteps: Array<{ title: string; desc: string }>;
  finalVerdict: string;
}

export interface ReportTemplateConfig {
  testId: TestId;
  reportTitle: string;
  reportSubtitle: string;
  accentHex: [number, number, number]; // RGB 0-1 for pdf-lib
  methodologySteps: Array<{ title: string; desc: string }>;
  deliverables: string[];
  descriptors: Array<{ badge: string; color: BadgeColor; text: string }>;
  chartMode: 'radar-and-bars' | 'divergent-bars' | 'grouped-bars';
}
