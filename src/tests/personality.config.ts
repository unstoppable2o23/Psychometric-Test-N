// Personality Type Assessment — unified test config.
// Forced-choice A/B questions from scripts/out/personality.json; the 16-type
// metadata (nick, profile, strengths, challenges, recs, careers triples) comes
// verbatim from scripts/out/personality-typedata.json.
//
// The abTraits pair per question is derived from the JSON's av/bv trait codes:
// option A -> traits[0], option B -> traits[1].

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';

type Q = { s: string; t: string; a?: string; av?: string; b?: string; bv?: string; c?: string; cv?: string; d?: string; dv?: string };
const d = loadJson<{ QUESTIONS: Q[] }>('personality');
const typeData = loadJson<Record<string, {
  nick: string; profile: string; strengths: string[]; challenges: string[]; recs: string[]; careers: string[][];
}>>('personality-typedata');

const questions: QuestionItem[] = d.QUESTIONS.map((q, i) => {
  const pairs: Array<{ text: string; val: string }> = [];
  for (const k of ['a', 'b', 'c', 'd'] as const) {
    if (q[k] !== undefined && q[k + 'v'] !== undefined) pairs.push({ text: q[k] as string, val: q[k + 'v'] as string });
  }
  return {
    id: String(i),
    section: q.s || 'Personality Dichotomies',
    text: q.t,
    type: 'forced-choice-ab',
    options: pairs.map((p) => p.text),
    abTraits: [pairs[0]?.val ?? 'E', pairs[1]?.val ?? 'I'] as [string, string],
  };
});

export const personalityConfig: TestConfig = {
  id: 'personality',
  title: 'Personality Type',
  highlightedTitle: 'Assessment',
  subtitle: 'A forced-choice assessment mapping your preferences across the four MBTI-tradition dichotomies into one of 16 types.',
  estimatedMinutes: '~10 Minutes',
  badgeChips: ['36 Questions', 'A/B Forced Choice', '16 MBTI Types', 'Colorful A4 PDF Report'],
  instructions: 'For each pair, choose the statement that feels more natural — not the one that sounds better. There are no right or wrong answers.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    typeData,
  },
};
