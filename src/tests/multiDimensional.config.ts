// Multi-Dimensional Psychometric Test — unified test config.
// Grade-adaptive: scripts/out/multi-dimensional.json carries a 60-question
// bank per grade level. Each section uses its own tailored 5-point scale
// (the same MD_SECTION_OPTIONS mapping the platform loader applies).
//
// NOTE for platform-side scoring: the platform's DB serves the FIRST grade
// bank ('Class 8 - 10') as the canonical question set, so platform answer
// maps must be scored against that bank (see getPlatformTestConfig).

import { GradeLevel, QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';

const MD_SECTION_OPTIONS: Record<string, string[]> = {
  'Natural Abilities': ['Not at all', 'Barely', 'Somewhat', 'Fairly well', 'Extremely easily'],
  'Interests': ['I hate it', 'I dislike it', "I don't mind it", 'I like it', 'I absolutely love it'],
  'Personality': ['Not me at all', 'Rarely me', 'Sometimes me', 'Often me', 'Exactly me'],
  'Career Motivators': ['Not important', 'Slightly important', 'Moderately important', 'Very important', 'My top priority'],
  'Learning Styles': ['Never works', 'Rarely works', 'Sometimes works', 'Often works', 'Always works best'],
};

type Q = { sec: string; t: string; c: string };
const d = loadJson<{ questionBank: Record<string, Q[]> }>('multi-dimensional');

const GRADES: GradeLevel[] = ['Class 8 - 10', 'Class 11 - 12', 'Undergraduate', 'Postgraduate'];

const banks = {} as Record<GradeLevel, QuestionItem[]>;
for (const grade of GRADES) {
  const qs = d.questionBank[grade] || [];
  banks[grade] = qs.map((q, i) => ({
    id: String(i),
    section: q.sec,
    text: q.t,
    type: 'likert-5',
    options: MD_SECTION_OPTIONS[q.sec] || MD_SECTION_OPTIONS['Natural Abilities'],
    category: q.c,
  }));
}

export const multiDimensionalConfig: TestConfig = {
  id: 'multi-dimensional',
  title: 'Multi-Dimensional',
  highlightedTitle: 'Psychometric Test',
  subtitle: 'One comprehensive assessment across Natural Abilities, Interests, Personality, Career Motivators and Learning Styles.',
  estimatedMinutes: '~15 Minutes',
  badgeChips: ['60 Questions', '5 Dimensions', 'Grade-Adaptive', 'Colorful A4 PDF Report'],
  instructions: 'Each section uses its own 5-point response scale. Pick the option that best reflects you. The assessment flows through five short sections of 12 questions.',
  autoAdvanceOnSelect: true,
  questions: banks,
  metadata: {
    careerMap: {},
    interpretations: {},
  },
};
