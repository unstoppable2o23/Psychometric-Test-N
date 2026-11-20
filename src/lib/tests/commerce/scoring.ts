// Commerce Career Selector — shared scoring engine.
// Single source of truth for commerce-branch scoring: powers both the platform
// ScoreResult (via scoreAttempt dispatch) and the pdf-lib report generator.

import { CLUSTERS, FINANCIAL_CLUSTERS, LIKERT_OPTIONS, QUESTIONS } from './data';
import { ClusterResult, CommerceReportResult, InterestLevel, StudentInfo } from './types';

// Adapter: convert the platform's stored answer map (question orderIndex ->
// selected option LABEL string, e.g. "Strongly Agree") into the 1-indexed
// Likert numeric array the commerce scorer consumes (null = unanswered).
// orderIndex is 0-based and aligns 1:1 with QUESTIONS array positions.
export function answersMapToLikertArray(
  answerMap: Record<number, string>,
  total: number = QUESTIONS.length
): Array<number | null> {
  const arr: Array<number | null> = new Array(total).fill(null);
  for (const [k, label] of Object.entries(answerMap)) {
    const idx = Number(k);
    if (Number.isNaN(idx) || idx < 0 || idx >= total) continue;
    const v = LIKERT_OPTIONS.indexOf(label as typeof LIKERT_OPTIONS[number]) + 1;
    arr[idx] = v > 0 ? v : null;
  }
  return arr;
}

export function calculateCommerceResults(
  student: StudentInfo,
  answers: Array<number | null>
): CommerceReportResult {
  const rawMap: Record<string, number> = {};
  Object.keys(CLUSTERS).forEach((c) => {
    rawMap[c] = 0;
  });

  let answeredCount = 0;
  QUESTIONS.forEach((q, idx) => {
    const val = answers[idx];
    if (val !== null && val !== undefined && val >= 1 && val <= 5) {
      rawMap[q.cluster] += val;
      answeredCount++;
    }
  });

  const sortedEntries = Object.entries(rawMap).sort((a, b) => b[1] - a[1]);
  const third = Math.floor(sortedEntries.length / 3); // 6 High, 6 Medium, 7 Low

  const rankMap: Record<string, number> = {};
  const levelMap: Record<string, InterestLevel> = {};

  sortedEntries.forEach(([cluster], idx) => {
    rankMap[cluster] = idx + 1;
    levelMap[cluster] = idx < third ? 'High' : idx < third * 2 ? 'Medium' : 'Low';
  });

  let financialRaw = 0;
  let nonFinancialRaw = 0;
  sortedEntries.forEach(([cluster, score]) => {
    if (FINANCIAL_CLUSTERS.has(cluster)) financialRaw += score;
    else nonFinancialRaw += score;
  });

  const totalRawScore = financialRaw + nonFinancialRaw;
  const denom = totalRawScore || 1;
  const financialPct = Math.round((100 * financialRaw) / denom);
  const nonFinancialPct = 100 - financialPct;
  const preferredDomain =
    financialRaw >= nonFinancialRaw ? 'Financial Domain' : 'Non-Financial Domain';

  const toClusterResult = (cluster: string): ClusterResult => ({
    cluster,
    domain: FINANCIAL_CLUSTERS.has(cluster) ? 'Financial' : 'Non-Financial',
    rawScore: rawMap[cluster],
    percentage: Math.round((rawMap[cluster] / 20) * 100),
    level: levelMap[cluster],
    rank: rankMap[cluster],
    roles: CLUSTERS[cluster],
  });

  const sortedClusters = sortedEntries.map(([c]) => toClusterResult(c));
  const allClustersInOrder = Object.keys(CLUSTERS).map(toClusterResult);

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    student,
    dateFormatted,
    reportId: `CCS-${now.getFullYear()}-${String(QUESTIONS.length).padStart(3, '0')}`,
    totalQuestions: QUESTIONS.length,
    answeredCount,
    totalRawScore,
    overallIndexPct: Math.round((totalRawScore / (19 * 20)) * 100),
    financialRaw,
    nonFinancialRaw,
    financialPct,
    nonFinancialPct,
    preferredDomain,
    highCount: sortedClusters.filter((c) => c.level === 'High').length,
    mediumCount: sortedClusters.filter((c) => c.level === 'Medium').length,
    lowCount: sortedClusters.filter((c) => c.level === 'Low').length,
    sortedClusters,
    allClustersInOrder,
    top8: sortedClusters.slice(0, 8),
    top5: sortedClusters.slice(0, 5),
    top3: sortedClusters.slice(0, 3),
    financialClusters: sortedClusters.filter((c) => c.domain === 'Financial'),
    nonFinancialClusters: sortedClusters.filter((c) => c.domain === 'Non-Financial'),
  };
}

// Map a CommerceReportResult into the platform's generic ScoreResult shape so
// it can be persisted in ScoreResult.dimensions (JSON) and rendered by the
// generic ReportView bar chart. Each cluster becomes one "dimension".
// The recommendation encodes the preferred domain + top-3 clusters so the
// dashboard / completion screen shows commerce-specific narrative.
export function commerceResultToScoreResult(r: CommerceReportResult): {
  dimensions: { code: string; name: string; score: number; maxScore: number; pct: number; level: string; description?: string }[];
  totalScore: number;
  recommendation: string;
  topDimensions: string[];
} {
  const dimensions = r.sortedClusters.map((c) => ({
    code: c.cluster,
    name: c.cluster,
    score: c.rawScore,
    maxScore: 20,
    pct: c.percentage,
    level: c.level,
    description: `${c.domain} domain · Rank #${c.rank} · Roles: ${c.roles.join(', ')}`,
  }));
  const recommendation = `Preferred domain: ${r.preferredDomain} (${Math.max(r.financialPct, r.nonFinancialPct)}% share). Top career clusters: ${r.top3.map((c) => `${c.cluster} (${c.percentage}%)`).join(', ')}.`;
  return {
    dimensions,
    totalScore: r.totalRawScore,
    recommendation,
    topDimensions: r.top3.map((c) => c.cluster),
  };
}
