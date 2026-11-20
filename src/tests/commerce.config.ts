// Commerce Career Selector — unified test config.
// Questions come from the canonical scripts/out/commerce-branch.json (the same
// source the platform loader serves); cluster roles + financial split come
// from the platform's commerce data module (single source of truth).

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';
import { CLUSTERS, FINANCIAL_CLUSTERS } from '@/lib/tests/commerce/data';

const LIKERT5 = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

type Q = { t: string; c: string };
const d = loadJson<{ QUESTIONS: Q[] }>('commerce-branch');

const questions: QuestionItem[] = d.QUESTIONS.map((q, i) => ({
  id: String(i),
  section: 'Commerce Career Clusters',
  text: q.t,
  type: 'likert-5',
  options: LIKERT5,
  category: q.c,
}));

export const commerceConfig: TestConfig = {
  id: 'commerce',
  title: 'Commerce Career',
  highlightedTitle: 'Selector',
  subtitle: 'Discover which Commerce career cluster — financial or non-financial — matches your interests best.',
  estimatedMinutes: '~20 Minutes',
  badgeChips: ['76 Questions', '19 Career Clusters', 'Financial vs Non-Financial', 'Colorful A4 PDF Report'],
  instructions: 'Rate how strongly you agree with each statement from Strongly Disagree to Strongly Agree. Selecting an option automatically saves and advances.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    clusters: CLUSTERS,
    financialClusters: [...FINANCIAL_CLUSTERS],
  },
};
