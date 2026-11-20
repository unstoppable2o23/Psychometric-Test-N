// Engineering Branch Selector — unified test config.
// Questions from scripts/out/engineering-branch.json; branch→discipline and
// sector groupings extracted verbatim from the original HTML source
// (see src/tests/metadata.ts).

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';
import { ENGINEERING_BRANCHES, ENGINEERING_SECTORS } from './metadata';

const LIKERT5 = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

type Q = { t: string; c: string };
const d = loadJson<{ QUESTIONS: Q[] }>('engineering-branch');

const questions: QuestionItem[] = d.QUESTIONS.map((q, i) => ({
  id: String(i),
  section: 'Engineering Branch Groups',
  text: q.t,
  type: 'likert-5',
  options: LIKERT5,
  category: q.c,
}));

export const engineeringConfig: TestConfig = {
  id: 'engineering',
  title: 'Engineering Branch',
  highlightedTitle: 'Selector',
  subtitle: 'Identify the B.E./B.Tech engineering branch group that best matches your technical interests and aptitudes.',
  estimatedMinutes: '~15 Minutes',
  badgeChips: ['56 Questions', '14 Branch Groups', '34 B.E./B.Tech Disciplines', 'Colorful A4 PDF Report'],
  instructions: 'Rate how strongly each work-situation statement reflects you on the 5-point scale. Answer honestly — your genuine interests point to your best-fit branch.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    branches: ENGINEERING_BRANCHES,
    sectors: ENGINEERING_SECTORS,
  },
};
