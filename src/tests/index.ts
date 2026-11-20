// Unified Test Registry — loads a test config by testId.
//
// getTestConfig(testId)          -> the canonical config (grade-keyed banks
//                                   for multi-dimensional; used by the PDF
//                                   API route where the client supplies the
//                                   grade).
// getPlatformTestConfig(testId)  -> the config as the PLATFORM's stored data
//                                   sees it: the platform DB serves the first
//                                   grade bank ('Class 8 - 10') for
//                                   multi-dimensional, so stored answers must
//                                   be scored against that bank.

import { TestConfig, TestId } from '@/types/assessment';
import { commerceConfig } from './commerce.config';
import { engineeringConfig } from './engineering.config';
import { humanitiesConfig } from './humanities.config';
import { idealCareerConfig } from './idealCareer.config';
import { learningStylesConfig } from './learningStyles.config';
import { multiDimensionalConfig } from './multiDimensional.config';
import { multipleIntelConfig } from './multipleIntel.config';
import { personalityConfig } from './personality.config';
import { streamSelectorConfig } from './streamSelector.config';

export const TEST_REGISTRY: Record<TestId, TestConfig> = {
  commerce: commerceConfig,
  engineering: engineeringConfig,
  humanities: humanitiesConfig,
  'ideal-career': idealCareerConfig,
  'learning-styles': learningStylesConfig,
  'multi-dimensional': multiDimensionalConfig,
  'multiple-intelligence': multipleIntelConfig,
  personality: personalityConfig,
  'stream-selector': streamSelectorConfig,
};

export function getTestConfig(testId: TestId): TestConfig | undefined {
  return TEST_REGISTRY[testId];
}

export function getPlatformTestConfig(testId: TestId): TestConfig | undefined {
  const cfg = TEST_REGISTRY[testId];
  if (!cfg) return undefined;
  if (testId === 'multi-dimensional' && !Array.isArray(cfg.questions)) {
    return {
      ...cfg,
      // The platform DB serves the first grade bank ('Class 8 - 10').
      questions: cfg.questions['Class 8 - 10'] || [],
      requiresGrade: false,
    };
  }
  return cfg;
}

// Map the platform assessment slugs to unified testIds.
export const SLUG_TO_TEST_ID: Record<string, TestId> = {
  'commerce-branch': 'commerce',
  'engineering-branch': 'engineering',
  'humanities-branch': 'humanities',
  'ideal-career': 'ideal-career',
  'learning-style': 'learning-styles',
  'multi-dimensional': 'multi-dimensional',
  'multiple-intelligence': 'multiple-intelligence',
  'personality': 'personality',
  'stream-selector': 'stream-selector',
};

export function slugToTestId(slug: string): TestId | undefined {
  return SLUG_TO_TEST_ID[slug];
}
