// Humanities Career Selector — unified test config.
// Questions from scripts/out/humanities-branch.json; cluster career/work
// metadata and the Public-Service cluster list extracted verbatim from the
// original HTML source (see src/tests/metadata.ts).

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';
import { HUMANITIES_CLUSTERS, HUMANITIES_PUBLIC_CLUSTERS } from './metadata';

const LIKERT5 = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

type Q = { t: string; c: string };
const d = loadJson<{ QUESTIONS: Q[] }>('humanities-branch');

const questions: QuestionItem[] = d.QUESTIONS.map((q, i) => ({
  id: String(i),
  section: 'Humanities Career Clusters',
  text: q.t,
  type: 'likert-5',
  options: LIKERT5,
  category: q.c,
}));

export const humanitiesConfig: TestConfig = {
  id: 'humanities',
  title: 'Humanities Career',
  highlightedTitle: 'Selector',
  subtitle: 'Discover whether your strengths lean toward Public Service & Management or Creative, Media & Applied Arts.',
  estimatedMinutes: '~20 Minutes',
  badgeChips: ['76 Questions', '19 Career Clusters', 'Public vs Creative', 'Colorful A4 PDF Report'],
  instructions: 'Rate how strongly each statement reflects your interests on the 5-point scale. Your genuine inclinations point to your best-fit Humanities track.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    clusters: HUMANITIES_CLUSTERS,
    publicClusters: HUMANITIES_PUBLIC_CLUSTERS,
  },
};
