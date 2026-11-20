// Stream Selector Test — unified test config.
// Questions from scripts/out/stream-selector.json TEST_SECTIONS (interest /
// interest_reverse / aptitude items across the 4 stream domains); stream
// metadata (title, subtitle, courses with durations) from STREAM_DATABASE.
//
// Answer contract: the engine expects 0-based option indexes for stream
// questions (Yes=0, No=1, Not sure=2 for 3-option items).

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';

type Sq = { text: string; options: string[]; domain?: string; type?: string; sectionName?: string; passage?: string };
const d = loadJson<{
  TEST_SECTIONS: Array<{ name?: string; sectionName?: string; questions: Sq[] }>;
  STREAM_DATABASE: Record<string, { title: string; subtitle: string; courses: Array<{ name: string; duration: string }> }>;
}>('stream-selector');

const questions: QuestionItem[] = [];
let gi = 0;
d.TEST_SECTIONS.forEach((sec) => {
  sec.questions.forEach((q) => {
    questions.push({
      id: String(gi),
      section: q.sectionName || sec.name || sec.sectionName || 'Stream Diagnostics',
      text: q.text,
      type: 'mcq',
      options: q.options,
      passage: q.passage,
      streamDomain: (q.domain as QuestionItem['streamDomain']) || undefined,
      streamMetric: (q.type as QuestionItem['streamMetric']) || undefined,
    });
    gi++;
  });
});

export const streamSelectorConfig: TestConfig = {
  id: 'stream-selector',
  title: 'Stream Selector',
  highlightedTitle: 'Test',
  subtitle: 'Rank Science (PCM), Science (PCB), Commerce and Humanities using paired aptitude and interest diagnostics.',
  estimatedMinutes: '~25 Minutes',
  badgeChips: ['76 Questions', '4 Streams', 'Aptitude vs Interest', 'Colorful A4 PDF Report'],
  instructions: 'Answer the interest items as you genuinely behave, and the applied items as best you can. Both halves together determine your recommended stream.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    streams: d.STREAM_DATABASE,
  },
};
