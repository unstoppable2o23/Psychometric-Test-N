// Multiple Intelligence Assessment — unified test config.
// Questions + intelligence metadata from scripts/out/multiple-intelligence.json
// (INTEL entries carry name, short label, careers and advice).

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';

type IntelMeta = { name: string; short: string; careers?: string[]; advice?: string };
const d = loadJson<{ QUESTIONS: Array<{ t: string; c: string }>; INTEL: Record<string, IntelMeta>; SCALE: string[] }>('multiple-intelligence');

const options = d.SCALE && d.SCALE.length === 7
  ? d.SCALE
  : ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'];

const questions: QuestionItem[] = d.QUESTIONS.map((q, i) => ({
  id: String(i),
  section: 'Multiple Intelligences',
  text: q.t,
  type: 'likert-7',
  options,
  category: q.c,
}));

// Shape INTEL into exactly {name, short, careers, advice} the engine expects.
const intelligences: Record<string, { name: string; short: string; careers: string[]; advice: string }> = {};
Object.keys(d.INTEL).forEach((k) => {
  const v = d.INTEL[k];
  intelligences[k] = {
    name: v.name ?? k,
    short: v.short ?? k,
    careers: v.careers ?? [],
    advice: v.advice ?? '',
  };
});

export const multipleIntelConfig: TestConfig = {
  id: 'multiple-intelligence',
  title: 'Multiple Intelligence',
  highlightedTitle: 'Assessment',
  subtitle: "Evaluate your profile across Dr. Howard Gardner's 9 intelligences on a 7-point scale, plus Emotional Intelligence.",
  estimatedMinutes: '~12 Minutes',
  badgeChips: ['54 Questions', '9 Intelligences', '1-7 Scale', 'EI Computed', 'Colorful A4 PDF Report'],
  instructions: 'Rate each statement on the 7-point scale. Every intelligence is valuable — there are no better or worse results, so answer honestly.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    intelligences,
  },
};
