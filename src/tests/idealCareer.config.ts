// Ideal Career Assessment — unified test config.
// Questions from scripts/out/ideal-career.json (182 items with per-option
// RIASEC / Big Five / motivator scoring maps and aptitude answer keys).
// The scoring shape in the JSON matches the engine's QuestionItem.scoringMap
// contract almost 1:1. RIASEC career metadata comes from the original HTML
// source (see src/tests/metadata.ts).
//
// NOTE on question order: sections are iterated in numeric order (1..7) —
// the exact same order the platform loader uses — so array positions align
// 1:1 with the platform's stored questionOrder values.

import { QuestionItem, TestConfig } from '@/types/assessment';
import { loadJson } from './json';
import { IDEAL_CAREER_MAP } from './metadata';

type BankQ = {
  id: string;
  text: string;
  options: string[];
  sectionName?: string;
  passage?: string;
  code?: string;
  correct?: string;
  aptitude?: 'critical' | 'numerical' | 'verbal' | 'acuteness' | 'spatial';
  scoring?: {
    riasec?: Record<string, Record<string, number>>;
    bigFive?: Record<string, Record<string, number>>;
    motivator?: string;
    values?: Record<string, number>;
  };
};

const d = loadJson<{ questionBank: Record<string, BankQ[]> }>('ideal-career');

const questions: QuestionItem[] = [];
Object.keys(d.questionBank)
  .sort((a, b) => Number(a) - Number(b))
  .forEach((secId) => {
    d.questionBank[secId].forEach((q) => {
      questions.push({
        id: q.id,
        section: q.sectionName || `Section ${secId}`,
        text: q.text,
        type: 'mcq',
        options: q.options,
        passage: q.passage,
        codeDisplay: q.code,
        correctOption: q.correct,
        aptitudeDomain: q.aptitude,
        scoringMap: q.scoring
          ? {
              riasec: q.scoring.riasec,
              bigFive: q.scoring.bigFive,
              motivator: q.scoring.motivator,
              values: q.scoring.values,
            }
          : undefined,
      });
    });
  });

export const idealCareerConfig: TestConfig = {
  id: 'ideal-career',
  title: 'Ideal Career',
  highlightedTitle: 'Assessment',
  subtitle: 'A 360° evaluation of your cognitive aptitudes, RIASEC interests, Big Five personality and career motivators.',
  estimatedMinutes: '~45 Minutes',
  badgeChips: ['182 Questions', '5 Aptitude Areas', 'RIASEC + Big Five', 'Colorful A4 PDF Report'],
  instructions: 'Answer each item honestly — aptitude questions have correct answers, preference questions do not. Your genuine responses produce the most accurate profile.',
  autoAdvanceOnSelect: true,
  questions,
  metadata: {
    careerMap: IDEAL_CAREER_MAP,
  },
};
