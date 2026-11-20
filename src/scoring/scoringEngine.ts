// Centralized scoring engine — preserves all 9 original scoring methodologies
// without simplification. Server-side only (configs read JSON via fs).
//
// Guards added vs. the original draft: metadata lookups (careerMap, typeData,
// intelligence records) fall back gracefully instead of crashing when a
// config entry is missing, so one malformed config cannot take down the
// report route.

import {
  AssessmentResult,
  QuestionItem,
  ScoredDimension,
  StudentInfo,
  TestConfig,
} from '@/types/assessment';

export type AnswerMap = Record<string, string | number | string[]>;

function getQuestionsForStudent(config: TestConfig, student: StudentInfo): QuestionItem[] {
  if (Array.isArray(config.questions)) return config.questions;
  const grade = student.grade || 'Class 11 - 12';
  return config.questions[grade] || [];
}

function buildHeaderMeta(prefix: string, total: number) {
  const now = new Date();
  return {
    dateFormatted: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    reportId: `${prefix}-${now.getFullYear()}-${String(total).padStart(3, '0')}`,
  };
}

export function evaluateTest(
  config: TestConfig,
  student: StudentInfo,
  answers: AnswerMap
): AssessmentResult {
  const questions = getQuestionsForStudent(config, student);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length;

  switch (config.id) {
    case 'commerce':
      return scoreCommerce(config, student, questions, answers, answeredCount);
    case 'engineering':
      return scoreEngineering(config, student, questions, answers, answeredCount);
    case 'humanities':
      return scoreHumanities(config, student, questions, answers, answeredCount);
    case 'ideal-career':
      return scoreIdealCareer(config, student, questions, answers, answeredCount);
    case 'learning-styles':
      return scoreLearningStyles(config, student, questions, answers, answeredCount);
    case 'multi-dimensional':
      return scoreMultiDimensional(config, student, questions, answers, answeredCount);
    case 'multiple-intelligence':
      return scoreMultipleIntelligence(config, student, questions, answers, answeredCount);
    case 'personality':
      return scorePersonality(config, student, questions, answers, answeredCount);
    case 'stream-selector':
      return scoreStreamSelector(config, student, questions, answers, answeredCount);
    default:
      throw new Error(`Unsupported testId: ${config.id}`);
  }
}

/* 1. COMMERCE CAREER SELECTOR (76 Qs, 19 Clusters, 1/3rd Normative Tiering, Financial vs Non-Financial) */
function scoreCommerce(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const clusters = config.metadata.clusters as Record<string, string[]>;
  const finSet = new Set(config.metadata.financialClusters as string[]);
  const sc: Record<string, number> = {};
  Object.keys(clusters).forEach((c) => (sc[c] = 0));

  questions.forEach((q) => {
    const val = Number(answers[q.id]);
    if (val >= 1 && val <= 5 && q.category) sc[q.category] += val;
  });

  const sorted = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  const third = Math.floor(sorted.length / 3);
  let fin = 0, nonFin = 0;

  const ranked: ScoredDimension[] = sorted.map(([c, s], i) => {
    if (finSet.has(c)) fin += s; else nonFin += s;
    const tier = i < third ? 'High' : i < third * 2 ? 'Medium' : 'Low';
    return {
      label: c,
      subLabel: `Rank #${i + 1} · ${finSet.has(c) ? 'Financial' : 'Non-Financial'}`,
      rawScore: s,
      maxScore: 20,
      percentage: Math.round((s / 20) * 100),
      tier,
      tierColor: tier === 'High' ? 'green' : tier === 'Medium' ? 'amber' : 'rose',
      details: (clusters[c] || []).join(', '),
    };
  });

  const tot = fin + nonFin || 1;
  const fp = Math.round((100 * fin) / tot);
  const np = 100 - fp;
  const dom = fin >= nonFin ? 'Financial Domain' : 'Non-Financial Domain';
  const top3 = ranked.slice(0, 3);

  return {
    testId: 'commerce',
    testTitle: config.title,
    ...buildHeaderMeta('CCS', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: dom.split(' ')[0], label: 'Preferred Domain', sub: `${Math.max(fp, np)}% Share`, color: 'blue' },
      { big: `${top3[0]?.percentage ?? 0}%`, label: 'Peak Cluster', sub: top3[0]?.label ?? '—', color: 'green' },
      { big: `${Math.round(((fin + nonFin) / 380) * 100)}%`, label: 'Overall Index', sub: `${fin + nonFin}/380 Pts`, color: 'indigo' },
      { big: `${third}/19`, label: 'High-Tier Matches', sub: 'Primary Focus', color: 'amber' },
    ],
    macroSplit: [
      { label: 'Financial Domain', percentage: fp, sub: `${fin} pts (8 Clusters)`, color: 'blue' },
      { label: 'Non-Financial Domain', percentage: np, sub: `${nonFin} pts (11 Clusters)`, color: 'green' },
    ],
    radarData: ranked.slice(0, 8).map((r) => ({ label: r.label, value: r.percentage })),
    rankedDimensions: ranked,
    detailRows: ranked.map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.percentage}% (${r.rawScore}/20)`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Evaluates ${student.name}'s responses across 76 Commerce work-activity statements, mapping innate preferences across 19 specialized Career Clusters in both Financial and Non-Financial domains.`,
    executiveTakeaway: `Strongest alignment with ${top3.map((x) => x.label).join(', ') || '—'}, anchored in the ${dom}.`,
    actionSteps: [
      { title: 'Shortlist Top Clusters', desc: `Prioritize ${top3[0]?.label ?? '—'} (${top3[0]?.percentage ?? 0}%) and ${top3[1]?.label ?? '—'} (${top3[1]?.percentage ?? 0}%).` },
      { title: 'Counselor Review', desc: `Map CUET, IPMAT, CLAT, or CA/CS Foundation tracks for the ${dom}.` },
      { title: 'Skill & Certification Plan', desc: 'Pair undergraduate degrees with practical internships in High-tier clusters.' },
    ],
    finalVerdict: `${student.name}'s highest career sustainability lies at the intersection of ${top3[0]?.label ?? '—'} and ${top3[1]?.label ?? '—'}.`,
  };
}

/* 2. ENGINEERING BRANCH SELECTOR (56 Qs, 14 Groups, 6-Tier Potential Scale) */
function scoreEngineering(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const branches = config.metadata.branches as Record<string, string[]>;
  const sectors = config.metadata.sectors as Record<string, string[]>;
  const sc: Record<string, number> = {};
  Object.keys(branches).forEach((g) => (sc[g] = 0));

  questions.forEach((q) => {
    const val = Number(answers[q.id]);
    if (val >= 1 && val <= 5 && q.category) sc[q.category] += val;
  });

  const lvOf = (s: number) => {
    const p = s / 20;
    if (p >= 0.8) return { t: 'Very High', c: 'green' as const };
    if (p >= 0.65) return { t: 'High', c: 'blue' as const };
    if (p >= 0.5) return { t: 'Above Average', c: 'sky' as const };
    if (p >= 0.35) return { t: 'Average', c: 'slate' as const };
    if (p >= 0.2) return { t: 'Below Average', c: 'amber' as const };
    return { t: 'Very Low', c: 'rose' as const };
  };

  const sorted = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  const ranked: ScoredDimension[] = sorted.map(([g, s], i) => {
    const lv = lvOf(s);
    return {
      label: g,
      subLabel: `Rank #${i + 1} of 14`,
      rawScore: s,
      maxScore: 20,
      percentage: Math.round((s / 20) * 100),
      tier: lv.t,
      tierColor: lv.c,
      details: (branches[g] || []).join(', '),
    };
  });

  const sectorColors = ['blue', 'green', 'amber', 'indigo'] as const;
  const macroSplit = Object.entries(sectors)
    .map(([name, gs], idx) => {
      const raw = gs.reduce((a, g) => a + (sc[g] || 0), 0);
      return { label: name, percentage: Math.round((raw / (gs.length * 20)) * 100), sub: `${raw}/${gs.length * 20} pts`, color: sectorColors[idx % 4] };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const totalRaw = Object.values(sc).reduce((a, b) => a + b, 0);
  const top3 = ranked.slice(0, 3);

  return {
    testId: 'engineering',
    testTitle: config.title,
    ...buildHeaderMeta('EBS', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: `${top3[0]?.percentage ?? 0}%`, label: '#1 Branch Affinity', sub: top3[0]?.label ?? '—', color: 'blue' },
      { big: `${macroSplit[0]?.percentage ?? 0}%`, label: 'Lead Sector', sub: (macroSplit[0]?.label ?? '—').split(',')[0], color: 'green' },
      { big: `${Math.round((totalRaw / 280) * 100)}%`, label: 'Aptitude Index', sub: `${totalRaw}/280 Pts`, color: 'indigo' },
      { big: `${ranked.filter((r) => r.percentage >= 50).length}/14`, label: 'Recommended', sub: 'Above Avg to Very High', color: 'amber' },
    ],
    macroSplit,
    radarData: ranked.slice(0, 8).map((r) => ({ label: r.label, value: r.percentage })),
    rankedDimensions: ranked,
    detailRows: ranked.map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.rawScore}/20 (${r.percentage}%)`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Evaluates ${student.name}'s responses across 56 engineering work-situation statements across 14 branch groups and 34 B.E./B.Tech disciplines.`,
    executiveTakeaway: `Peak technical consonance with ${top3.map((t) => t.label).join(', ') || '—'}.`,
    actionSteps: [
      { title: 'Lock Top Branch Choices', desc: `Prioritize ${top3[0]?.details ?? 'top branches'} (${top3[0]?.percentage ?? 0}%) during choice filling.` },
      { title: 'Entrance & College Mapping', desc: 'Align JEE Main/Advanced, BITSAT, and state CET targets with top departmental labs.' },
      { title: 'Applied Skill Building', desc: `Build hands-on projects in ${top3[0]?.label ?? 'your top branch'} before Semester 1.` },
    ],
    finalVerdict: `${student.name}'s highest engineering potential lies in ${top3[0]?.label ?? '—'} and ${top3[1]?.label ?? '—'}.`,
  };
}

/* 3. HUMANITIES CAREER SELECTOR (76 Qs, 19 Clusters, Public vs Creative) */
function scoreHumanities(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const clusters = config.metadata.clusters as Record<string, { careers: string[]; work: string }>;
  const pubSet = new Set(config.metadata.publicClusters as string[]);
  const sc: Record<string, number> = {};
  Object.keys(clusters).forEach((c) => (sc[c] = 0));

  questions.forEach((q) => {
    const val = Number(answers[q.id]);
    if (val >= 1 && val <= 5 && q.category) sc[q.category] += val;
  });

  const sorted = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  const third = Math.floor(sorted.length / 3);
  let pub = 0, cre = 0;

  const ranked: ScoredDimension[] = sorted.map(([c, s], i) => {
    if (pubSet.has(c)) pub += s; else cre += s;
    const tier = i < third ? 'High' : i < third * 2 ? 'Medium' : 'Low';
    const meta = clusters[c] || { careers: [], work: '' };
    return {
      label: c,
      subLabel: `Rank #${i + 1} · ${pubSet.has(c) ? 'Public Service' : 'Creative & Media'}`,
      rawScore: s,
      maxScore: 20,
      percentage: Math.round((s / 20) * 100),
      tier,
      tierColor: tier === 'High' ? 'green' : tier === 'Medium' ? 'amber' : 'rose',
      details: `Careers: ${meta.careers.join(', ')} | Work: ${meta.work}`,
    };
  });

  const tot = pub + cre || 1;
  const pubPct = Math.round((100 * pub) / tot);
  const crePct = 100 - pubPct;
  const dom = pub >= cre ? 'Public Service & Management' : 'Creative, Media & Applied Arts';
  const top3 = ranked.slice(0, 3);

  return {
    testId: 'humanities',
    testTitle: config.title,
    ...buildHeaderMeta('HCS', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: dom.split(' ')[0], label: 'Preferred Domain', sub: `${Math.max(pubPct, crePct)}% Share`, color: 'blue' },
      { big: `${top3[0]?.percentage ?? 0}%`, label: 'Peak Cluster', sub: (top3[0]?.label ?? '—').replace(' Related', ''), color: 'green' },
      { big: `${Math.round(((pub + cre) / 380) * 100)}%`, label: 'Overall Index', sub: `${pub + cre}/380 Pts`, color: 'indigo' },
      { big: `${third}/19`, label: 'High-Tier Matches', sub: 'Primary Focus', color: 'amber' },
    ],
    macroSplit: [
      { label: 'Public Service & Management', percentage: pubPct, sub: `${pub} pts (10 Clusters)`, color: 'blue' },
      { label: 'Creative, Media & Applied Arts', percentage: crePct, sub: `${cre} pts (9 Clusters)`, color: 'green' },
    ],
    radarData: ranked.slice(0, 8).map((r) => ({ label: r.label.replace(' Related', ''), value: r.percentage })),
    rankedDimensions: ranked,
    detailRows: ranked.map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.percentage}% (${r.rawScore}/20)`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Evaluates ${student.name}'s responses across 76 Humanities statements across 19 clusters spanning Public Service and Creative Media.`,
    executiveTakeaway: `Strongest alignment with ${top3.map((x) => x.label.replace(' Related', '')).join(', ') || '—'} in the ${dom} track.`,
    actionSteps: [
      { title: 'Shortlist Top Clusters', desc: `Prioritize High-tier clusters: ${top3.map((x) => x.label.replace(' Related', '')).join(', ') || '—'}.` },
      { title: 'Counselor Consultation', desc: 'Map BA, BFA, BMM, or Integrated Law (CLAT, NIFT, CUET) targets.' },
      { title: 'Degree & Portfolio', desc: 'Build writing samples, design portfolios, or civic internships.' },
    ],
    finalVerdict: `${student.name}'s optimal Humanities trajectory bridges ${top3[0]?.label ?? '—'} and ${top3[1]?.label ?? '—'}.`,
  };
}

/* 4. IDEAL CAREER TEST (182 Qs: Aptitude/10 + RIASEC + Big Five + Motivators) */
function scoreIdealCareer(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const careerMap = (config.metadata.careerMap || {}) as Record<string, { title: string; desc: string; jobs: string[] }>;
  const riasec: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const bigFive: Record<string, number> = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, stability: 0 };
  const motivators: Record<string, number> = { money: 0, freedom: 0, stability: 0, leisure: 0, service: 0, variety: 0, leadership: 0, respect: 0, challenge: 0, interest: 0 };
  const aptCorrect: Record<string, number> = { critical: 0, numerical: 0, verbal: 0, acuteness: 0, spatial: 0 };
  const aptTotal: Record<string, number> = { critical: 0, numerical: 0, verbal: 0, acuteness: 0, spatial: 0 };

  questions.forEach((q) => {
    const val = String(answers[q.id] ?? '');
    if (!val) return;
    if (q.correctOption && q.aptitudeDomain) {
      aptTotal[q.aptitudeDomain]++;
      if (val === q.correctOption) aptCorrect[q.aptitudeDomain]++;
    }
    if (q.scoringMap?.riasec) {
      for (const k in q.scoringMap.riasec) riasec[k] += q.scoringMap.riasec[k][val] ?? 0;
    }
    if (q.scoringMap?.bigFive) {
      for (const k in q.scoringMap.bigFive) bigFive[k] += q.scoringMap.bigFive[k][val] ?? 0;
    }
    if (q.scoringMap?.motivator && q.scoringMap.values) {
      motivators[q.scoringMap.motivator] += q.scoringMap.values[val] ?? 0;
    }
  });

  const aptScores = Object.keys(aptTotal).map((k) => {
    const score10 = aptTotal[k] ? Math.round((aptCorrect[k] / aptTotal[k]) * 10) : 7;
    return { key: k, score10, pct: score10 * 10 };
  });

  // Only RIASEC codes that have career metadata can be ranked/reported.
  const knownCodes = Object.keys(careerMap);
  const sortedRiasec = Object.entries(riasec)
    .filter(([code]) => knownCodes.includes(code))
    .sort((a, b) => b[1] - a[1]);
  const top3Fields = sortedRiasec.slice(0, 3).map(([code]) => ({ code, ...(careerMap[code] || { title: code, desc: '', jobs: [] }) }));
  const topMot = Object.entries(motivators).sort((a, b) => b[1] - a[1])[0]?.[0] || 'interest';

  const ranked: ScoredDimension[] = [
    ...aptScores.map((a) => ({
      label: `${a.key.toUpperCase()} Aptitude`,
      subLabel: 'Cognitive Baseline',
      rawScore: a.score10,
      maxScore: 10,
      percentage: a.pct,
      tier: a.score10 >= 8 ? 'High' : a.score10 >= 5 ? 'Moderate' : 'Developing',
      tierColor: (a.score10 >= 8 ? 'green' : a.score10 >= 5 ? 'amber' : 'rose') as 'green' | 'amber' | 'rose',
      details: `Score: ${a.score10} / 10`,
    })),
    ...sortedRiasec.map(([code, val]) => ({
      label: `${careerMap[code]?.title ?? code} (${code})`,
      subLabel: 'RIASEC Interest Theme',
      rawScore: val,
      maxScore: 30,
      percentage: Math.min(100, Math.round((val / 25) * 100)),
      tier: val >= 15 ? 'High' : val >= 8 ? 'Moderate' : 'Low',
      tierColor: (val >= 15 ? 'green' : val >= 8 ? 'amber' : 'rose') as 'green' | 'amber' | 'rose',
      details: (careerMap[code]?.jobs ?? []).join(', '),
    })),
  ];

  return {
    testId: 'ideal-career',
    testTitle: config.title,
    ...buildHeaderMeta('ICT', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: (top3Fields[0]?.title ?? '—').split(' ')[0], label: 'Primary Field', sub: `Code: ${top3Fields.map((f) => f.code).join('') || '—'}`, color: 'blue' },
      { big: `${aptScores.reduce((a, b) => a + b.score10, 0)}/50`, label: 'Aptitude Total', sub: '5 Cognitive Areas', color: 'green' },
      { big: topMot.toUpperCase(), label: 'Top Motivator', sub: 'Core Driver', color: 'indigo' },
      { big: `${answeredCount}/${questions.length}`, label: 'Items Completed', sub: '4-Pillar Model', color: 'amber' },
    ],
    radarData: Object.entries(bigFive).map(([k, v]) => ({ label: k.toUpperCase(), value: Math.min(100, v * 12) })),
    rankedDimensions: ranked,
    detailRows: top3Fields.map((f, idx) => ({
      name: `#${idx + 1} ${f.title} (${f.code})`,
      sub: f.desc,
      scoreText: `RIASEC Score: ${riasec[f.code]}`,
      percentage: Math.min(100, Math.round((riasec[f.code] / 25) * 100)),
      badge: idx === 0 ? 'Top Match' : 'Strong Fit',
      badgeColor: idx === 0 ? 'green' : 'blue',
      description: f.jobs.join(', '),
    })),
    executiveSummary: `360-degree evaluation of ${student.name}'s cognitive aptitudes, RIASEC interests, Big Five personality traits, and internal career motivators.`,
    executiveTakeaway: `Ideal career intersection: ${top3Fields[0]?.title ?? '—'} + ${top3Fields[1]?.title ?? '—'}, driven by ${topMot}.`,
    actionSteps: [
      { title: 'Skill Verification', desc: `Research undergraduate tracks for ${(top3Fields[0]?.jobs ?? []).slice(0, 2).join(' & ') || 'your top field'}.` },
      { title: 'Pilot Testing', desc: `Complete a project or shadowing day in ${top3Fields[0]?.title ?? 'your top field'}.` },
      { title: 'Aptitude Building', desc: 'Target targeted practice in your lowest-scoring cognitive aptitude.' },
    ],
    finalVerdict: `${student.name} is structurally aligned with ${top3Fields[0]?.title ?? 'high-potential'} environments that reward ${topMot}.`,
  };
}

/* 5. LEARNING STYLES (64 Qs w/ reverse scoring 6-v, 16 Preferences) */
function scoreLearningStyles(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const cats = (config.metadata.categories || []) as Array<{ n: string; type: 'Sensory' | 'Environmental' | 'Mindset' }>;
  const descs = (config.metadata.descriptions || {}) as Record<string, string>;
  const raw: Record<string, number> = {};
  cats.forEach((c) => (raw[c.n] = 0));

  questions.forEach((q) => {
    const val = Number(answers[q.id]);
    if (val >= 1 && val <= 5 && q.category) {
      raw[q.category] += q.reverse ? 6 - val : val;
    }
  });

  const sorted = Object.entries(raw).sort((a, b) => b[1] - a[1]);
  let sens = 0, env = 0, mind = 0;

  const ranked: ScoredDimension[] = sorted.map(([c, s], i) => {
    const type = cats.find((x) => x.n === c)?.type || 'Sensory';
    if (type === 'Sensory') sens += s; else if (type === 'Environmental') env += s; else mind += s;
    const tier = s >= 16 ? 'Very High' : s >= 12 ? 'High' : s >= 8 ? 'Moderate' : 'Low';
    return {
      label: c,
      subLabel: `${type} · Rank #${i + 1}`,
      rawScore: s,
      maxScore: 20,
      percentage: Math.round((s / 20) * 100),
      tier,
      tierColor: s >= 12 ? 'green' : s >= 8 ? 'amber' : 'rose',
      details: descs[c] || '',
    };
  });

  const tot = sens + env + mind || 1;
  const top3 = ranked.slice(0, 3);

  return {
    testId: 'learning-styles',
    testTitle: config.title,
    ...buildHeaderMeta('LSA', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: top3[0]?.label ?? '—', label: '#1 Modality', sub: `${top3[0]?.percentage ?? 0}% Match`, color: 'blue' },
      { big: `${Math.round((sens / tot) * 100)}%`, label: 'Sensory', sub: '4 Modalities', color: 'green' },
      { big: `${Math.round((env / tot) * 100)}%`, label: 'Environment', sub: '6 Modalities', color: 'indigo' },
      { big: `${Math.round((mind / tot) * 100)}%`, label: 'Mindset', sub: '6 Modalities', color: 'amber' },
    ],
    macroSplit: [
      { label: 'Sensory Preferences', percentage: Math.round((sens / tot) * 100), sub: `${sens} pts`, color: 'blue' },
      { label: 'Environmental Preferences', percentage: Math.round((env / tot) * 100), sub: `${env} pts`, color: 'green' },
      { label: 'Mindset Preferences', percentage: Math.round((mind / tot) * 100), sub: `${mind} pts`, color: 'amber' },
    ],
    radarData: ranked.slice(0, 8).map((r) => ({ label: r.label, value: r.percentage })),
    rankedDimensions: ranked,
    detailRows: ranked.map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.percentage}% (${r.rawScore}/20)`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Maps ${student.name}'s 64 responses across 16 Sensory, Environmental, and Mindset learning preferences.`,
    executiveTakeaway: `Peak retention occurs when studying through ${top3.map((x) => x.label).join(', ') || '—'}.`,
    actionSteps: [
      { title: 'Control Study Environment', desc: 'Align lighting, sound, seating, and timing with your top Environmental scores.' },
      { title: 'Leverage Sensory Hooks', desc: `Translate chapters into ${top3[0]?.label ?? 'your top'} formats (mind maps, audio, or hands-on labs).` },
      { title: 'Communicate Needs', desc: 'Share Structure and Collaboration preferences with teachers.' },
    ],
    finalVerdict: `${student.name} achieves peak retention by combining ${top3[0]?.label ?? '—'} and ${top3[1]?.label ?? '—'} study routines.`,
  };
}

/* 6. MULTI-DIMENSIONAL TEST (Grade-Adaptive 60 Qs, 5 Dimensions) */
function scoreMultiDimensional(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const careerMap = (config.metadata.careerMap || {}) as Record<string, string[]>;
  const interps = (config.metadata.interpretations || {}) as Record<string, { meaning: string; tips: string[] }>;
  const secOrder = ['Natural Abilities', 'Interests', 'Personality', 'Career Motivators', 'Learning Styles'];
  const bucket: Record<string, { total: number; count: number; sec: string }> = {};

  questions.forEach((q) => {
    if (!q.category) return;
    if (!bucket[q.category]) bucket[q.category] = { total: 0, count: 0, sec: q.section };
    const val = Number(answers[q.id]);
    if (val >= 1 && val <= 5) {
      bucket[q.category].total += val;
      bucket[q.category].count++;
    }
  });

  const ranked: ScoredDimension[] = Object.entries(bucket)
    .map(([cat, b]) => {
      const pct = b.count ? Math.round((b.total / (b.count * 5)) * 100) : 0;
      const tier = pct >= 70 ? 'Dominant' : pct >= 45 ? 'Moderate' : 'Emerging';
      return {
        label: cat,
        subLabel: b.sec,
        rawScore: b.total,
        maxScore: b.count * 5,
        percentage: pct,
        tier,
        tierColor: (pct >= 70 ? 'green' : pct >= 45 ? 'amber' : 'rose') as 'green' | 'amber' | 'rose',
        details: `${interps[cat]?.meaning || ''} ${careerMap[cat] ? 'Careers: ' + careerMap[cat].join(', ') : ''}`.trim(),
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const radarData = secOrder.map((sec) => {
    const items = ranked.filter((r) => r.subLabel === sec);
    const avg = items.length ? Math.round(items.reduce((a, b) => a + b.percentage, 0) / items.length) : 0;
    return { label: sec, value: avg };
  });

  const topAbility = ranked.find((r) => r.subLabel === 'Natural Abilities')?.label || '—';
  const topInterest = ranked.find((r) => r.subLabel === 'Interests')?.label || '—';
  const topMotivator = ranked.find((r) => r.subLabel === 'Career Motivators')?.label || '—';

  return {
    testId: 'multi-dimensional',
    testTitle: config.title,
    ...buildHeaderMeta('MDA', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: topAbility.split('/')[0], label: 'Top Ability', sub: 'Natural Strength', color: 'blue' },
      { big: topInterest, label: 'Top Interest', sub: 'Career Pull', color: 'green' },
      { big: topMotivator.split('&')[0], label: 'Core Motivator', sub: 'Primary Driver', color: 'indigo' },
      { big: student.grade || 'Student', label: 'Stage', sub: 'Grade-Adaptive', color: 'amber' },
    ],
    radarData,
    rankedDimensions: ranked,
    detailRows: ranked.slice(0, 12).map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.percentage}%`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Grade-adaptive 5-dimensional psychometric profile for ${student.name} (${student.grade || 'all grades'}) across Natural Abilities, Interests, Personality, Motivators, and Learning Styles.`,
    executiveTakeaway: `Signature synergy: ${topAbility} + ${topInterest}, motivated by ${topMotivator}.`,
    actionSteps: [
      { title: 'Shortlist & Research', desc: `Explore careers bridging ${topAbility} and ${topInterest}.` },
      { title: 'Optimize Study Habits', desc: 'Apply your dominant Learning Style to daily coursework.' },
      { title: 'Practical Exposure', desc: 'Complete one project or shadowing day in your top interest area.' },
    ],
    finalVerdict: `${student.name} thrives in careers uniting ${topAbility} with ${topInterest}.`,
  };
}

/* 7. MULTIPLE INTELLIGENCE (54 Qs, 1-7 Scale, 9 Intelligences + EI) */
function scoreMultipleIntelligence(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const intel = (config.metadata.intelligences || {}) as Record<string, { name: string; short: string; careers: string[]; advice: string }>;
  const sc: Record<string, number> = {};
  Object.keys(intel).forEach((k) => (sc[k] = 0));

  questions.forEach((q) => {
    const val = Number(answers[q.id]);
    if (val >= 1 && val <= 7 && q.category) sc[q.category] += val;
  });

  const ranked: ScoredDimension[] = Object.entries(sc)
    .map(([k, s]) => {
      const pct = Math.round((s / 42) * 100);
      const tier = pct >= 80 ? 'Very High' : pct >= 65 ? 'High' : pct >= 50 ? 'Moderate' : 'Low';
      return {
        label: intel[k]?.name ?? k,
        subLabel: intel[k]?.short ?? k,
        rawScore: s,
        maxScore: 42,
        percentage: pct,
        tier,
        tierColor: (pct >= 65 ? 'green' : pct >= 50 ? 'amber' : 'rose') as 'green' | 'amber' | 'rose',
        details: `Careers: ${(intel[k]?.careers ?? []).slice(0, 4).join(', ')}`,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const eiPct = (k: string) => Math.round(((sc[k] || 0) / 42) * 100);
  const ei = Math.round((eiPct('interpersonal') + eiPct('intrapersonal')) / 2);
  const top3 = ranked.slice(0, 3);

  return {
    testId: 'multiple-intelligence',
    testTitle: config.title,
    ...buildHeaderMeta('MIA', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: top3[0]?.subLabel ?? '—', label: '#1 Intelligence', sub: `${top3[0]?.percentage ?? 0}%`, color: 'blue' },
      { big: `${ei}%`, label: 'Emotional Intel (EI)', sub: 'Inter + Intra Blend', color: 'green' },
      { big: `${ranked.length ? Math.round(ranked.reduce((a, b) => a + b.percentage, 0) / ranked.length) : 0}%`, label: 'Overall Index', sub: '9 Intelligences Avg', color: 'indigo' },
      { big: `${ranked.filter((r) => r.percentage >= 65).length}/9`, label: 'High Intelligences', sub: 'Core Strengths', color: 'amber' },
    ],
    radarData: ranked.map((r) => ({ label: r.subLabel || r.label, value: r.percentage })),
    rankedDimensions: ranked,
    detailRows: ranked.map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.percentage}% (${r.rawScore}/42)`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Evaluates ${student.name} across Dr. Howard Gardner's 9 Multiple Intelligences on a 7-point scale, plus Emotional Intelligence (EI).`,
    executiveTakeaway: `Dominant intelligences: ${top3.map((t) => t.subLabel).join(', ') || '—'} with ${ei}% Emotional Intelligence.`,
    actionSteps: [
      { title: 'Leverage Top Intelligences', desc: `Build projects around ${top3[0]?.label ?? 'your strengths'} and ${top3[1]?.label ?? 'adjacent strengths'}.` },
      { title: 'Boost Emotional Intelligence', desc: 'Practice active listening and structured self-reflection.' },
      { title: 'Align Career Pathways', desc: `Explore careers mapped to ${top3[0]?.subLabel ?? 'your top intelligence'}.` },
    ],
    finalVerdict: `${student.name}'s cognitive architecture peaks in ${top3[0]?.label ?? '—'} and ${top3[1]?.label ?? '—'}.`,
  };
}

/* 8. PERSONALITY / KEY TO SUCCESS (36 A/B Forced-Choice Qs, 16 MBTI Types) */
function scorePersonality(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const typeData = (config.metadata.typeData || {}) as Record<
    string,
    { nick: string; profile: string; strengths: string[]; challenges: string[]; recs: string[]; careers: string[][] }
  >;
  const S: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  questions.forEach((q) => {
    const ans = Number(answers[q.id]);
    if ((ans === 1 || ans === 2) && q.abTraits) {
      S[ans === 1 ? q.abTraits[0] : q.abTraits[1]]++;
    }
  });

  const code = (S.E >= S.I ? 'E' : 'I') + (S.S >= S.N ? 'S' : 'N') + (S.T >= S.F ? 'T' : 'F') + (S.J >= S.P ? 'J' : 'P');
  const d = typeData[code] || {
    nick: 'Unique Blend',
    profile: `${student.name} shows a balanced personality across the four dichotomies.`,
    strengths: ['Adaptable', 'Balanced'],
    challenges: ['Clarity of preference'],
    recs: ['Explore both poles of each dichotomy to sharpen self-knowledge.'],
    careers: [],
  };
  const pct = (a: number, b: number) => Math.round((100 * a) / (a + b || 1));

  const divergentPairs = [
    { leftLabel: 'Extraversion (E)', rightLabel: 'Introversion (I)', leftPct: pct(S.E, S.I), rightPct: pct(S.I, S.E) },
    { leftLabel: 'Sensing (S)', rightLabel: 'Intuition (N)', leftPct: pct(S.S, S.N), rightPct: pct(S.N, S.S) },
    { leftLabel: 'Thinking (T)', rightLabel: 'Feeling (F)', leftPct: pct(S.T, S.F), rightPct: pct(S.F, S.T) },
    { leftLabel: 'Judging (J)', rightLabel: 'Perceiving (P)', leftPct: pct(S.J, S.P), rightPct: pct(S.P, S.J) },
  ];

  return {
    testId: 'personality',
    testTitle: config.title,
    ...buildHeaderMeta('KTS', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    heroBadge: { code, subtitle: d.nick },
    kpis: [
      { big: code[0], label: 'Energy', sub: code[0] === 'E' ? 'Extraversion' : 'Introversion', color: 'blue' },
      { big: code[1], label: 'Perception', sub: code[1] === 'S' ? 'Sensing' : 'Intuition', color: 'green' },
      { big: code[2], label: 'Decisions', sub: code[2] === 'T' ? 'Thinking' : 'Feeling', color: 'indigo' },
      { big: code[3], label: 'Lifestyle', sub: code[3] === 'J' ? 'Judging' : 'Perceiving', color: 'amber' },
    ],
    divergentPairs,
    rankedDimensions: divergentPairs.map((p) => ({
      label: p.leftPct >= p.rightPct ? p.leftLabel : p.rightLabel,
      subLabel: `${p.leftLabel} vs ${p.rightLabel}`,
      rawScore: Math.max(p.leftPct, p.rightPct),
      maxScore: 100,
      percentage: Math.max(p.leftPct, p.rightPct),
      tier: 'Dominant',
      tierColor: 'blue' as const,
    })),
    detailRows: d.careers.map((c) => ({
      name: c[0],
      sub: c[1],
      scoreText: c[2],
      percentage: 95,
      badge: 'Top Fit',
      badgeColor: 'green' as const,
      description: `Highly aligned with ${code} (${d.nick}) strengths: ${d.strengths.slice(0, 2).join(', ')}.`,
    })),
    executiveSummary: d.profile,
    executiveTakeaway: `As an ${code} (${d.nick}), your strengths are ${d.strengths.slice(0, 3).join(', ')}.`,
    actionSteps: d.recs.slice(0, 3).map((r, i) => ({ title: `Growth Step ${i + 1}`, desc: r })),
    finalVerdict: `${student.name} (${code} - ${d.nick}) thrives in roles matching ${d.careers.map((c) => c[0]).join(', ')}.`,
  };
}

/* 9. STREAM SELECTOR TEST (76 Qs, 4 Streams, Aptitude vs Interest Composite) */
function scoreStreamSelector(
  config: TestConfig,
  student: StudentInfo,
  questions: QuestionItem[],
  answers: AnswerMap,
  answeredCount: number
): AssessmentResult {
  const streams = (config.metadata.streams || {}) as Record<string, { title: string; subtitle: string; courses: Array<{ name: string; duration: string }> }>;
  const sc: Record<string, { apt: number; aptC: number; int: number; intC: number }> = {
    sci_math: { apt: 0, aptC: 0, int: 0, intC: 0 },
    commerce: { apt: 0, aptC: 0, int: 0, intC: 0 },
    sci_bio: { apt: 0, aptC: 0, int: 0, intC: 0 },
    humanities: { apt: 0, aptC: 0, int: 0, intC: 0 },
  };

  questions.forEach((q) => {
    const ansIdx = Number(answers[q.id]);
    if (Number.isNaN(ansIdx) || !q.streamDomain || !q.streamMetric) return;
    let val = 50;
    if (q.options.length === 3) {
      val = ansIdx === 0 ? 100 : ansIdx === 2 ? 50 : 10;
      if (q.streamMetric === 'interest_reverse') val = 110 - val;
    } else {
      val = ansIdx === 0 || ansIdx === 1 ? 90 : 30;
    }
    if (!sc[q.streamDomain]) return;
    if (q.streamMetric.includes('interest')) {
      sc[q.streamDomain].int += val;
      sc[q.streamDomain].intC++;
    } else {
      sc[q.streamDomain].apt += val;
      sc[q.streamDomain].aptC++;
    }
  });

  const results = Object.keys(streams)
    .map((k) => {
      const apt = Math.min(98, Math.max(20, sc[k] && sc[k].aptC ? Math.round(sc[k].apt / sc[k].aptC) : 65));
      const int = Math.min(98, Math.max(20, sc[k] && sc[k].intC ? Math.round(sc[k].int / sc[k].intC) : 65));
      const composite = Math.round(apt * 0.5 + int * 0.5);
      return { id: k, title: streams[k]?.title ?? k, subtitle: streams[k]?.subtitle ?? '', courses: streams[k]?.courses ?? [], apt, int, composite };
    })
    .sort((a, b) => b.composite - a.composite);

  const ranked: ScoredDimension[] = results.map((r, i) => ({
    label: r.title,
    subLabel: `Aptitude ${r.apt}% · Interest ${r.int}%`,
    rawScore: r.composite,
    maxScore: 100,
    percentage: r.composite,
    tier: i === 0 ? 'Rank #1' : i === 1 ? 'Rank #2' : `Rank #${i + 1}`,
    tierColor: i === 0 ? 'green' : i === 1 ? 'blue' : i === 2 ? 'amber' : 'rose',
    details: `${r.subtitle} | Top Courses: ${r.courses.slice(0, 4).map((c) => c.name).join(', ')}`,
  }));

  const first = results[0] || { title: '—', composite: 0, apt: 0, int: 0, subtitle: '' };
  const second = results[1] || first;

  return {
    testId: 'stream-selector',
    testTitle: config.title,
    ...buildHeaderMeta('DSS', questions.length),
    student,
    totalQuestions: questions.length,
    answeredCount,
    kpis: [
      { big: first.title, label: '#1 Stream', sub: `${first.composite}% Match`, color: 'blue' },
      { big: second.title, label: '#2 Stream', sub: `${second.composite}% Match`, color: 'green' },
      { big: `${first.apt}%`, label: 'Top Aptitude', sub: first.title, color: 'indigo' },
      { big: `${first.int}%`, label: 'Top Interest', sub: first.title, color: 'amber' },
    ],
    macroSplit: results.map((r, i) => ({
      label: r.title,
      percentage: r.composite,
      sub: `Apt ${r.apt}% / Int ${r.int}%`,
      color: (['blue', 'green', 'amber', 'indigo'] as const)[i % 4],
    })),
    radarData: results.map((r) => ({ label: r.title, value: r.composite })),
    rankedDimensions: ranked,
    detailRows: ranked.map((r) => ({
      name: r.label,
      sub: r.subLabel || '',
      scoreText: `${r.percentage}% Composite`,
      percentage: r.percentage,
      badge: r.tier,
      badgeColor: r.tierColor,
      description: r.details || '',
    })),
    executiveSummary: `Evaluates ${student.name}'s Class 10 aptitude and behavioral interest across 76 diagnostic items to rank Science (PCM), Science (PCB), Commerce, and Humanities.`,
    executiveTakeaway: `Optimal Class 11–12 stream: ${first.title} (${first.composite}%), with ${second.title} as secondary strength.`,
    actionSteps: [
      { title: 'Lock Primary Track', desc: `Register for ${first.title} (${first.subtitle}) in Class 11.` },
      { title: 'Subject Optimization', desc: `Use ${second.title} to guide optional 5th/6th subject selection.` },
      { title: 'Entrance Alignment', desc: `Review graduate courses and entrance exams for ${first.title}.` },
    ],
    finalVerdict: `${student.name} is best positioned for long-term success in ${first.title}.`,
  };
}

// ============================================================================
// Answer adapter: converts the platform's stored answer map (question
// orderIndex -> selected option LABEL string, e.g. "Strongly Agree") into the
// unified AnswerMap format the scoring engine consumes, driven by each
// question's type:
//   likert-5 / likert-7 / forced-choice-ab  -> 1-indexed number
//   stream-selector questions               -> 0-based option index
//   mcq / ideal-career scoring questions    -> option text (verbatim)
// Values that are already numbers pass through untouched, so the unified
// format is accepted as-is too.
// ============================================================================
export function toUnifiedAnswerMap(
  config: TestConfig,
  student: StudentInfo,
  labelAnswers: Record<number, string>
): AnswerMap {
  const questions = getQuestionsForStudent(config, student);
  const out: AnswerMap = {};
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    // Platform answers are keyed by questionOrder (= position in the question
    // array). Prefer the numeric question id when it resolves to a stored
    // answer, otherwise fall back to the positional index — configs like
    // ideal-career use non-numeric ids ("q1", "q2", ...) which would
    // otherwise silently drop every answer.
    const numericId = Number(q.id);
    const raw =
      !Number.isNaN(numericId) && labelAnswers[numericId] !== undefined
        ? labelAnswers[numericId]
        : labelAnswers[i];
    if (raw === undefined || raw === null || raw === '') continue;
    if (typeof raw === 'number') { out[q.id] = raw; continue; }
    const idx = q.options.indexOf(raw);
    if (idx < 0) { out[q.id] = raw; continue; } // already a unified value / free text
    if (q.type === 'likert-5' || q.type === 'likert-7' || q.type === 'forced-choice-ab') {
      out[q.id] = idx + 1;
    } else if (config.id === 'stream-selector') {
      out[q.id] = idx;
    } else {
      out[q.id] = raw;
    }
  }
  return out;
}

// Map a unified AssessmentResult into the platform's generic ScoreResult shape
// (used when persisting scores for the dashboard chart).
export function assessmentResultToScoreResult(r: AssessmentResult): {
  dimensions: { code: string; name: string; score: number; maxScore: number; pct: number; level: string; description?: string }[];
  totalScore?: number;
  recommendation: string;
  topDimensions: string[];
} {
  const dimensions = r.rankedDimensions.map((d) => ({
    code: d.label,
    name: d.label,
    score: d.rawScore,
    maxScore: d.maxScore,
    pct: d.percentage,
    level: d.tier,
    description: `${d.subLabel || ''}${d.details ? ' · ' + d.details : ''}`.trim(),
  }));
  return {
    dimensions,
    totalScore: r.rankedDimensions[0]?.percentage,
    recommendation: r.executiveTakeaway,
    topDimensions: r.rankedDimensions.slice(0, 3).map((d) => d.label),
  };
}
