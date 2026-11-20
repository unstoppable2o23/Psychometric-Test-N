// Commerce Career Selector — assessment data.
// All 76 questions, 19 career clusters, 8 financial domains, and the 5-point
// Likert scale are preserved verbatim from the original assessment.
// NOTE: this content is identical to scripts/out/commerce-branch.json which the
// platform loader serves; kept here as a self-contained source for the scorer
// and PDF generator so cluster/role lookups are O(1) and drift-free.

import { CommerceQuestion } from './types';

export const LIKERT_OPTIONS = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
] as const;

export const FINANCIAL_CLUSTERS = new Set<string>([
  'Accounts/Taxation',
  'Analytics',
  'Financial Auditing and Investigation',
  'Credit Management',
  'Financial Banking and Investment',
  'Financial Management',
  'Monitoring and Evaluation Specialist',
  'Trading',
]);

export const CLUSTERS: Record<string, string[]> = {
  'Accounts/Taxation': ['Accountant', 'Cost Accountant', 'Chartered Accountant', 'Tax Advisor/Tax Inspector'],
  'Analytics': ['Statistician', 'Business Analyst / Market Analyst'],
  'Communication and Media': [
    'Radio and TV Anchoring, News Reading, Theater',
    'Stage and Voice Over Artist, Public Relations',
    'Photography, Advertisement, Online Media, Video and Audio Editor, Camera and Light Professional',
    'Sound Technician etc.',
  ],
  'Computer Related Designing': ['Web Designer, Graphic Designer, Animator, Game Designer, Illustrator, Multimedia Designer'],
  'Financial Auditing and Investigation': ['Security Analyst', 'Financial Analyst', 'Investment Analyst', 'Fraud Management', 'Auditor, Actuary'],
  'Credit Management': ['Risk Management'],
  'Financial Banking and Investment': ['Actuary', 'Corporate/Personal Banker', 'Treasury Management', 'Insurance Specialist', 'Investment Banker'],
  'Financial Management': ['Real Estate / Property Management', 'Finance Management', 'Sale/Purchase Management', 'Wealth Management', 'Asset Management', 'Micro Finance Management', 'Financial Planner'],
  'Monitoring and Evaluation Specialist': ['Economist, Economic Advisor', 'Financial Planner', 'Budget Analyst', 'Financial Analyst'],
  'Hospitality and Tourism': ['Travel Agent, Tourism Manager, Logistics Manager', 'Transportation Support, Airhostess, Cabin Crew', 'Customer Service Manager, Travel Desk Officer', 'Event Manager'],
  'Hotel': ['Hotel Manager, Facility Maintenance, Chef, Food and Beverage Specialist, Cleaning and Housekeeping In Charges, Restaurant and Bar In Charge'],
  'Industrial Designing': ['Fashion Designer, Textile Designer, Knitwear Designer, Accessory Designer, Jewellery Designer, Interior Designer'],
  'Journalism': ['Journalist – Print or Electronic, Reporter, Editor', 'Copy Writer, Screen Play Writer, Content Writer'],
  'Languages': ['Linguist, Translator, Interpreter, News Reader', 'Bilingual Educator, Copy Writer and Editor, Grant and Proposal Writer, Professor, Teacher and Trainer, Public Relations, Publication, Research'],
  'Law': ['Corporate / Company Lawyer', 'Tax Lawyer', 'Banking Solicitor', 'Company Secretary'],
  'Management': ['Banking and Insurance Management', 'Finance Management', 'HR Management', 'Marketing and Sales Management', 'Operations Management', 'Rural Management', 'Export Management'],
  'Social Sciences': ['Teacher and Professor, Social Workers', 'Relationship Counselor, Career Counselor', 'Philosopher, Critic and Political Analyst', 'Activist, Reformer, Researcher'],
  'Teaching and Education': ['Nursery or Pre-Primary Teacher, Primary, Middle School, Secondary and Senior Secondary Teacher', 'Lecturer and Professor, Institute Trainer, Tutor', 'Coaching Centre Trainer, Academic Head or Principal'],
  'Trading': ['Stock Broker', 'Foreign Exchange Trader', 'Derivative Trader', 'Commodity Trader'],
};

const RAW_QUESTIONS: Array<{ t: string; c: string }> = [
  { t: 'I enjoy maintaining ledger books and balancing accounts.', c: 'Accounts/Taxation' },
  { t: 'I am interested in learning about direct and indirect tax laws.', c: 'Accounts/Taxation' },
  { t: 'Auditing financial statements sounds like an interesting job.', c: 'Accounts/Taxation' },
  { t: 'I would like to help individuals and companies file their taxes.', c: 'Accounts/Taxation' },
  { t: 'I like working with statistical data to find trends.', c: 'Analytics' },
  { t: 'Using data to solve business problems excites me.', c: 'Analytics' },
  { t: 'I enjoy creating charts and graphs to represent data.', c: 'Analytics' },
  { t: 'Market research and consumer data analysis appeal to me.', c: 'Analytics' },
  { t: 'I am interested in working in radio or TV broadcasting.', c: 'Communication and Media' },
  { t: 'Public relations and managing corporate image interest me.', c: 'Communication and Media' },
  { t: 'I would enjoy operating cameras or editing video content.', c: 'Communication and Media' },
  { t: 'Advertisement and media production fascinate me.', c: 'Communication and Media' },
  { t: 'I enjoy designing websites and user interfaces.', c: 'Computer Related Designing' },
  { t: 'Graphic design and illustration are skills I want to develop.', c: 'Computer Related Designing' },
  { t: 'I am interested in animation and game design.', c: 'Computer Related Designing' },
  { t: 'Creating multimedia content feels like a great career path.', c: 'Computer Related Designing' },
  { t: 'Investigating financial frauds sounds exciting to me.', c: 'Financial Auditing and Investigation' },
  { t: 'I would like to analyze investment opportunities for clients.', c: 'Financial Auditing and Investigation' },
  { t: "Evaluating company securities is a career I'd enjoy.", c: 'Financial Auditing and Investigation' },
  { t: 'I am interested in actuarial science and risk calculation.', c: 'Financial Auditing and Investigation' },
  { t: 'Assessing creditworthiness of individuals sounds interesting.', c: 'Credit Management' },
  { t: 'I would like to manage risk in financial institutions.', c: 'Credit Management' },
  { t: 'Loan approval and credit analysis appeal to me.', c: 'Credit Management' },
  { t: 'I enjoy evaluating the financial stability of borrowers.', c: 'Credit Management' },
  { t: 'Working in a bank as a personal banker appeals to me.', c: 'Financial Banking and Investment' },
  { t: 'I am interested in treasury and foreign exchange management.', c: 'Financial Banking and Investment' },
  { t: 'Insurance and risk protection products interest me.', c: 'Financial Banking and Investment' },
  { t: 'I would enjoy a career in investment banking.', c: 'Financial Banking and Investment' },
  { t: 'I want to manage real estate properties and assets.', c: 'Financial Management' },
  { t: 'Wealth management for high-net-worth individuals sounds rewarding.', c: 'Financial Management' },
  { t: 'I am interested in managing micro-finance institutions.', c: 'Financial Management' },
  { t: 'Financial planning for families and businesses interests me.', c: 'Financial Management' },
  { t: 'I would like to work as an economic advisor.', c: 'Monitoring and Evaluation Specialist' },
  { t: 'Preparing budget analyses for organizations sounds interesting.', c: 'Monitoring and Evaluation Specialist' },
  { t: 'Monitoring project evaluations and outcomes appeals to me.', c: 'Monitoring and Evaluation Specialist' },
  { t: 'I enjoy analyzing economic indicators and policies.', c: 'Monitoring and Evaluation Specialist' },
  { t: 'I want to work in the travel and tourism industry.', c: 'Hospitality and Tourism' },
  { t: 'Managing logistics and transportation sounds like a good career.', c: 'Hospitality and Tourism' },
  { t: 'I would enjoy working as an event manager or travel agent.', c: 'Hospitality and Tourism' },
  { t: 'Working as cabin crew or customer service manager appeals to me.', c: 'Hospitality and Tourism' },
  { t: 'I am interested in hotel management and operations.', c: 'Hotel' },
  { t: 'Food and beverage service management excites me.', c: 'Hotel' },
  { t: 'I would like to work in housekeeping or facility maintenance.', c: 'Hotel' },
  { t: "Managing a restaurant or bar sounds like a career I'd enjoy.", c: 'Hotel' },
  { t: 'I have a keen interest in fashion and textile design.', c: 'Industrial Designing' },
  { t: 'Designing jewelry or accessories appeals to me.', c: 'Industrial Designing' },
  { t: 'I would enjoy working as an interior designer.', c: 'Industrial Designing' },
  { t: 'Creating industrial product designs is fascinating.', c: 'Industrial Designing' },
  { t: 'I want to work as a reporter for a newspaper or news channel.', c: 'Journalism' },
  { t: 'Editing and copywriting are skills I want to pursue.', c: 'Journalism' },
  { t: 'Writing screenplays or content for websites sounds exciting.', c: 'Journalism' },
  { t: 'Investigative journalism and news analysis interest me.', c: 'Journalism' },
  { t: 'I would love to work as a translator or interpreter.', c: 'Languages' },
  { t: 'Bilingual education and teaching languages appeal to me.', c: 'Languages' },
  { t: 'I am interested in writing grant proposals and publications.', c: 'Languages' },
  { t: 'Linguistics and language research fascinate me.', c: 'Languages' },
  { t: 'I am interested in corporate law and legal compliance.', c: 'Law' },
  { t: 'Working as a tax lawyer or banking solicitor appeals to me.', c: 'Law' },
  { t: 'Company secretarial and legal advisory roles interest me.', c: 'Law' },
  { t: 'I would like to represent companies in legal matters.', c: 'Law' },
  { t: 'I want to work in HR management and recruitment.', c: 'Management' },
  { t: 'Marketing and sales management excite me.', c: 'Management' },
  { t: 'Operations and supply chain management sound interesting.', c: 'Management' },
  { t: 'I would like to manage rural or export businesses.', c: 'Management' },
  { t: 'I want to work as a social worker or relationship counselor.', c: 'Social Sciences' },
  { t: 'Activism and social reform are causes I care about.', c: 'Social Sciences' },
  { t: 'Political analysis and criticism interest me.', c: 'Social Sciences' },
  { t: 'Conducting social research sounds like a fulfilling career.', c: 'Social Sciences' },
  { t: 'I would love to teach in a primary or secondary school.', c: 'Teaching and Education' },
  { t: 'Becoming a college professor or lecturer is my goal.', c: 'Teaching and Education' },
  { t: 'Working as a trainer in a coaching center appeals to me.', c: 'Teaching and Education' },
  { t: 'I am interested in academic administration and leadership.', c: 'Teaching and Education' },
  { t: 'I want to work as a stockbroker in the financial markets.', c: 'Trading' },
  { t: 'Foreign exchange and derivative trading excite me.', c: 'Trading' },
  { t: "Commodity trading is a career I'd like to explore.", c: 'Trading' },
  { t: 'I enjoy watching market fluctuations and making quick decisions.', c: 'Trading' },
];

export const QUESTIONS: CommerceQuestion[] = RAW_QUESTIONS.map((q, idx) => ({
  id: idx + 1,
  text: q.t,
  cluster: q.c,
}));

export const LEVEL_DESCRIPTORS = [
  {
    level: 'High' as const,
    label: 'High Level',
    description:
      'This level indicates High interest in the given Commerce Career Options with awareness and knowledge about the subject and career as well as enthusiasm to face the work life situations accepting its pros and cons. The student has deep understanding as well as interest to opt for given career options, and knows what kind of professional personality is required — so he or she has the zeal to develop as a professional accordingly. It is recommended to select career options from this level while maintaining motivation and dedicated study.',
  },
  {
    level: 'Medium' as const,
    label: 'Medium Level',
    description:
      'This level indicates Medium interest in the given Commerce Career Options — the student is moderately able and interested to enjoy the pros and cons of work life situations, with moderate understanding and average general awareness about the career. It is advisable that students selecting from this level develop optimum zeal, motivation and a dedicated study pattern to grow as a professional in the field.',
  },
  {
    level: 'Low' as const,
    label: 'Low Level',
    description:
      'This level indicates Low interest as well as lack of understanding, awareness and knowledge about the given Commerce Career Options. There is profound reluctance in utilizing skills for small-scale tasks in the given career option. It will be an uphill task to build knowledge in a career option one is not interested in.',
  },
];
