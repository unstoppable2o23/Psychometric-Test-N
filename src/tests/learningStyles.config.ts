// Learning Style Assessment — unified test config.
// Questions + 16 preference categories from scripts/out/learning-style.json
// (CATS entries carry their Sensory/Environmental/Mindset family); preference
// descriptions from scripts/out/learning-style-report.json.
// NOTE: the extracted question bank contains no reverse-scored items, so all
// `reverse` flags are false — identical to how the platform loader scores.

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';

const LIKERT5 = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

type Q = { t: string; c: string };
const d = loadJson<{ QUESTIONS: Q[]; CATS: Array<{ n: string; type: string }> }>('learning-style');
const r = loadJson<{ DESCS: Record<string, string> }>('learning-style-report');

const questions: QuestionItem[] = d.QUESTIONS.map((q, i) => ({
  id: String(i),
  section: 'Learning Preferences',
  text: q.t,
  type: 'likert-5',
  options: LIKERT5,
  category: q.c,
  reverse: false,
}));

export const learningStylesConfig: TestConfig = {
  id: 'learning-styles',
  title: 'Discover Your',
  highlightedTitle: 'Learning Style',
  subtitle: 'Identify how you absorb, process and retain information best across 16 Sensory, Environmental and Mindset preferences.',
  estimatedMinutes: '~12 Minutes',
  badgeChips: ['64 Questions', '16 Preferences', '3 Preference Families', 'Colorful A4 PDF Report'],
  instructions: 'Read each statement and honestly rate how much it describes you. There are no right or wrong answers — choose the response that feels most true.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    categories: d.CATS as Array<{ n: string; type: 'Sensory' | 'Environmental' | 'Mindset' }>,
    descriptions: r.DESCS,
  },
};
