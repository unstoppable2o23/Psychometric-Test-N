// Commerce Career Selector — shared types.
// Self-contained scoring + report types for the commerce-branch assessment.

export type DomainType = 'Financial' | 'Non-Financial';
export type InterestLevel = 'High' | 'Medium' | 'Low';

export interface StudentInfo {
  name: string;
  email: string;
  phone: string;
}

export interface BrandingConfig {
  clientName?: string;
  logoUrl?: string;
}

export interface CommerceQuestion {
  id: number;
  text: string;
  cluster: string;
}

export interface ClusterResult {
  cluster: string;
  domain: DomainType;
  rawScore: number;      // Max 20 (4 questions x 5)
  percentage: number;    // 0 - 100
  level: InterestLevel;
  rank: number;          // 1 - 19
  roles: string[];
}

export interface CommerceReportResult {
  student: StudentInfo;
  dateFormatted: string;
  reportId: string;
  totalQuestions: number;
  answeredCount: number;
  totalRawScore: number;
  overallIndexPct: number;
  financialRaw: number;
  nonFinancialRaw: number;
  financialPct: number;
  nonFinancialPct: number;
  preferredDomain: 'Financial Domain' | 'Non-Financial Domain';
  highCount: number;
  mediumCount: number;
  lowCount: number;
  sortedClusters: ClusterResult[];
  allClustersInOrder: ClusterResult[];
  top8: ClusterResult[];
  top5: ClusterResult[];
  top3: ClusterResult[];
  financialClusters: ClusterResult[];
  nonFinancialClusters: ClusterResult[];
}
