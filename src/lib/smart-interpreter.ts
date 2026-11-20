/**
 * Universal Zero-Cost Smart Interpreter
 * Generates counselor-grade narratives for all 9 psychometric tests.
 *
 * Uses pre-engineered psychological frameworks — no external LLM API needed.
 * Costs $0, operates instantly (0ms latency), never hallucinates.
 *
 * CONFIDENTIAL — For Counsellors and Super Admins only.
 */

// The core interpreter function (as provided by the user — unchanged)
export function generateUniversalSmartInterpretation(testType: string, studentName: string, data: Record<string, any>): string {
    let executiveSynthesis = "";
    let careerSynergies = "";
    let actionPlan = "";

    switch (testType.toUpperCase()) {

        case 'COMMERCE':
            executiveSynthesis = `Based on the computational data, ${studentName} operates primarily within the <strong>${data.dominantDomain}</strong>. Your cognitive baseline is anchored by a profound capability in <strong>${data.topCluster1}</strong> and <strong>${data.topCluster2}</strong>, meaning you will naturally outpace your peers in commercial tasks that require this specific blend of skills.`;
            careerSynergies = `A career pathway focusing on <strong>${data.topCluster1}</strong> is an exceptional fit. Because your profile bridges into ${data.topCluster2}, you are uniquely positioned for modern hybrid roles (such as combining financial analytics with corporate strategy) that traditional single-track commerce graduates struggle with.`;
            actionPlan = `
                <li><strong>Academic Alignment:</strong> Research undergraduate specializations (like B.Com Hons, BBA, or BA Economics) that heavily feature ${data.topCluster1}.</li>
                <li><strong>Skill Validation:</strong> Look into foundational professional certifications relevant to your domain (e.g., CA/CS Foundation, CFA basics, or digital marketing certifications).</li>
            `;
            break;

        case 'ENGINEERING':
            executiveSynthesis = `The psychometric evaluation reveals that ${studentName}'s peak technical consonance lies within the <strong>${data.topSector}</strong> sector. Your high affinity for <strong>${data.topGroup1}</strong> indicates a natural aptitude for the complex problem-solving required in this specific engineering discipline.`;
            careerSynergies = `By combining your primary strength in <strong>${data.topGroup1}</strong> with your secondary capability in <strong>${data.topGroup2}</strong>, you are perfectly aligned for interdisciplinary engineering fields (such as Mechatronics, Bio-Informatics, or AI-driven systems) which are currently leading global market demand.`;
            actionPlan = `
                <li><strong>Entrance Strategy:</strong> Align your JEE Main/Advanced and state CET preparation specifically toward colleges known for strong labs in ${data.topGroup1}.</li>
                <li><strong>Practical Exposure:</strong> Undertake a small hands-on project or coding bootcamp related to ${data.topGroup1} to validate your interest before college counseling begins.</li>
            `;
            break;

        case 'HUMANITIES':
            executiveSynthesis = `Your profile highlights a dominant alignment with the <strong>${data.dominantDomain}</strong>. ${studentName}, your peak interest in <strong>${data.topCluster1}</strong> and <strong>${data.topCluster2}</strong> suggests a strong innate capacity for critical thinking, communication, and human-centric problem solving.`;
            careerSynergies = `Humanities careers reward highly versatile thinkers. Your specific intersection of <strong>${data.topCluster1}</strong> and <strong>${data.topCluster2}</strong> makes you an ideal candidate for impactful roles in policy, media, law, or design, where understanding human behavior and systemic structures is critical.`;
            actionPlan = `
                <li><strong>Degree Selection:</strong> Map out BA, BFA, or Integrated Law programs that offer dual-majors or minors in your top two clusters.</li>
                <li><strong>Portfolio Building:</strong> Humanities fields rely heavily on visible work. Start building a portfolio of writing, design, or community service projects immediately.</li>
            `;
            break;

        case 'IDEAL_CAREER':
            executiveSynthesis = `This 360-degree evaluation confirms that ${studentName} is driven by a psychological need for <strong>${data.topMotivator}</strong>. You process information as a <strong>${data.topPersonality}</strong> and rely on your strongest cognitive baseline: <strong>${data.topAptitude} Aptitude</strong>.`;
            careerSynergies = `Your ideal career is not just a job title—it is an environment. You will find the highest long-term satisfaction in <strong>${data.topRiasec}</strong> environments that allow you to use your ${data.topAptitude} skills while satisfying your core need for ${data.topMotivator}.`;
            actionPlan = `
                <li><strong>Environment Matching:</strong> Filter future job and internship opportunities based strictly on whether they support your ${data.topPersonality} personality traits.</li>
                <li><strong>Blind Spot Mitigation:</strong> Actively develop strategies to handle tasks that require your lowest-scoring aptitude, ensuring it does not become a bottleneck.</li>
            `;
            break;

        case 'LEARNING_STYLE':
            executiveSynthesis = `The data indicates that ${studentName} absorbs complex information most efficiently through <strong>${data.topPreference1}</strong> and <strong>${data.topPreference2}</strong> modalities, heavily anchored in the <strong>${data.dominantMacro}</strong> domain.`;
            careerSynergies = `Understanding your learning style is the ultimate academic cheat code. Because you peak in <strong>${data.topPreference1}</strong>, standard classroom environments may occasionally cause fatigue unless you actively translate the material into your preferred format during self-study.`;
            actionPlan = `
                <li><strong>Environment Control:</strong> Restructure your home study space today to perfectly match your Environmental preferences (Light, Sound, Temperature, Mobility).</li>
                <li><strong>Sensory Translation:</strong> Stop using study methods that don't match your profile. If you are highly visual, use mind-maps; if auditory, record and listen to notes.</li>
            `;
            break;

        case 'MULTIPLE_INTELLIGENCE':
            executiveSynthesis = `Moving beyond traditional IQ, this profile reveals ${studentName}'s true cognitive architecture is dominated by <strong>${data.topIntel1}</strong> and <strong>${data.topIntel2}</strong>. Your Emotional Intelligence (EI) currently registers at <strong>${data.eiScore}%</strong>.`;
            careerSynergies = `The most successful professionals operate at the intersection of their top intelligences. By bridging <strong>${data.topIntel1}</strong> with <strong>${data.topIntel2}</strong>, you are uniquely equipped for specialized roles that standard logical/linguistic thinkers cannot easily execute.`;
            actionPlan = `
                <li><strong>Skill Synergy:</strong> Seek out extracurricular activities that actively require you to use both ${data.topIntel1} and ${data.topIntel2} simultaneously.</li>
                <li><strong>EI Development:</strong> Implement targeted emotional intelligence habits—such as active listening and self-reflection—to elevate your ${data.eiScore}% EI score, a critical predictor of leadership success.</li>
            `;
            break;

        case 'PERSONALITY':
            executiveSynthesis = `As an <strong>${data.mbtiCode} (${data.mbtiNick})</strong>, ${studentName} naturally approaches the world by prioritizing <strong>${data.decisionTrait}</strong> over other factors. You draw your energy from <strong>${data.energyTrait}</strong> and prefer a lifestyle built on <strong>${data.lifestyleTrait}</strong>.`;
            careerSynergies = `Your personality dictates not just *what* you should do, but *where* you should do it. You will thrive in company cultures that reward ${data.decisionTrait.toLowerCase()} decision-making and allow you to operate with a ${data.lifestyleTrait.toLowerCase()} approach.`;
            actionPlan = `
                <li><strong>Culture Fit:</strong> When researching careers or colleges, prioritize the culture and daily environment over the prestige of the title.</li>
                <li><strong>Blind Spot Awareness:</strong> Your natural strengths can become liabilities under stress. Consciously practice your opposing traits (e.g., if you are highly logical, practice empathetic listening) to become a well-rounded leader.</li>
            `;
            break;

        case 'STREAM_SELECTOR':
            executiveSynthesis = `This diagnostic establishes that ${studentName} possesses a dominant capability and passion for <strong>${data.rank1Stream}</strong>, followed closely by <strong>${data.rank2Stream}</strong>, providing a definitive hierarchy for Class 11-12 selection.`;
            careerSynergies = `By aligning your academic path with <strong>${data.rank1Stream}</strong>, you ensure that your daily coursework matches both your cognitive aptitude and your behavioral curiosity, preventing the burnout commonly seen in 11th and 12th grades.`;
            actionPlan = `
                <li><strong>Lock Primary Track:</strong> Select ${data.rank1Stream} as your core registration track for Class 11.</li>
                <li><strong>Subject Optimization:</strong> Utilize your strong secondary affinity for ${data.rank2Stream} to guide your choice of optional 5th and 6th subjects, creating a powerful interdisciplinary profile.</li>
            `;
            break;

        case 'MULTI_DIMENSIONAL':
            executiveSynthesis = `This 5-dimensional synthesis confirms ${studentName}'s profile is anchored by a natural ability in <strong>${data.topAbility}</strong>, a core interest in <strong>${data.topInterest}</strong>, and an internal drive for <strong>${data.topMotivator}</strong>.`;
            careerSynergies = `True professional sustainability occurs when ability, interest, and personality align. Careers that leverage your <strong>${data.topAbility}</strong> while satisfying your <strong>${data.topMotivator}</strong>—such as those found in the ${data.topInterest} sector—will yield the highest long-term retention and success.`;
            actionPlan = `
                <li><strong>Target Selection:</strong> Shortlist 2-3 specific careers that perfectly intersect your top Ability and top Interest.</li>
                <li><strong>Learning Optimization:</strong> Adjust your immediate study habits to leverage your dominant <strong>${data.topLearningStyle}</strong> learning style.</li>
            `;
            break;

        default:
            return `<div style="padding:1rem; color:red;">Error: Invalid Test Type provided to Smart Interpreter.</div>`;
    }

    return `
        <div class="rsec" style="background:#F8FAFC; border:1px solid #BFDBFE; border-radius:12px; padding:2rem; margin-top:2rem;">
            <h2 style="color:#0F2A43; font-size:1.35rem; margin-bottom:1rem; border-left:4px solid #0E7C66; padding-left:.8rem; line-height:1.2;">
                Counselor's Deep-Dive Interpretation
            </h2>
            <p style="font-size:1.02rem; line-height:1.65; color:#334155; margin-bottom:1.2rem;">
                <strong>Executive Synthesis:</strong> ${executiveSynthesis}
            </p>
            <p style="font-size:1.02rem; line-height:1.65; color:#334155; margin-bottom:1.2rem;">
                <strong>Career Synergies:</strong> ${careerSynergies}
            </p>
            <h3 style="color:#0F2A43; font-size:1.15rem; margin-top:1.5rem; margin-bottom:.8rem;">Your Customized Execution Plan</h3>
            <ul style="font-size:.98rem; line-height:1.6; color:#334155; list-style-type:disc; padding-left:1.5rem;">
                ${actionPlan}
                <li><strong>Counselor Review:</strong> Discuss these specific findings with your academic counselor to map out exact entrance exams and university targets.</li>
            </ul>
        </div>
    `;
}

// --- Data extractor: maps each assessment's score results to the interpreter's expected data object ---

// Maps assessment slug -> test type for the interpreter
const SLUG_TO_TYPE: Record<string, string> = {
  'commerce-branch': 'COMMERCE',
  'engineering-branch': 'ENGINEERING',
  'humanities-branch': 'HUMANITIES',
  'ideal-career': 'IDEAL_CAREER',
  'learning-style': 'LEARNING_STYLE',
  'multiple-intelligence': 'MULTIPLE_INTELLIGENCE',
  'personality': 'PERSONALITY',
  'stream-selector': 'STREAM_SELECTOR',
  'multi-dimensional': 'MULTI_DIMENSIONAL',
}

export function getTestType(slug: string): string {
  return SLUG_TO_TYPE[slug] || ''
}

/**
 * Extracts the data object needed by the interpreter from the score results.
 * Each assessment has different dimensions and scoring methods, so the extraction
 * logic is assessment-specific.
 */
export function extractInterpretationData(slug: string, dimensions: any[], domainBreakdown?: any[], recommendation?: string): Record<string, any> {
  const sorted = [...dimensions].sort((a, b) => (b.pct || 0) - (a.pct || 0))
  const top1 = sorted[0] || {}
  const top2 = sorted[1] || {}
  const top3 = sorted[2] || {}

  switch (slug) {
    case 'commerce-branch':
      return {
        dominantDomain: top1.code?.includes('Accounts') || top1.code?.includes('Finance') || top1.code?.includes('Audit') || top1.code?.includes('Credit') || top1.code?.includes('Banking') || top1.code?.includes('Trading') || top1.code?.includes('Management') ? 'Financial Domain' : 'Non-Financial Domain',
        topCluster1: top1.name || top1.code || '',
        topCluster2: top2.name || top2.code || '',
      }

    case 'engineering-branch':
      return {
        topSector: top1.name || top1.code || '',
        topGroup1: top1.name || top1.code || '',
        topGroup2: top2.name || top2.code || '',
      }

    case 'humanities-branch':
      return {
        dominantDomain: top1.code?.includes('Teaching') || top1.code?.includes('Law') || top1.code?.includes('Journalism') ? 'Communication & Social Sciences' : 'Creative & Analytical Domain',
        topCluster1: top1.name || top1.code || '',
        topCluster2: top2.name || top2.code || '',
      }

    case 'ideal-career':
      // Dimensions are prefixed: bigFive.*, riasec.*, motivator.*
      const motivators = sorted.filter(d => d.code?.startsWith('motivator.'))
      const bigFive = sorted.filter(d => d.code?.startsWith('bigFive.'))
      const riasec = sorted.filter(d => d.code?.startsWith('riasec.'))
      const riasecNames: Record<string, string> = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' }
      return {
        topMotivator: motivators[0]?.name?.replace('Motivator: ', '') || motivators[0]?.code?.replace('motivator.', '') || '',
        topPersonality: bigFive[0]?.name || bigFive[0]?.code?.replace('bigFive.', '') || '',
        topAptitude: riasec[0]?.name || riasecNames[riasec[0]?.code?.replace('riasec.', '')] || '',
        topRiasec: riasecNames[riasec[0]?.code?.replace('riasec.', '')] || riasec[0]?.name || '',
      }

    case 'learning-style':
      // Group by macro domain (Sensory, Environmental, Mindset)
      const sensory = sorted.filter(d => ['Auditory', 'Kinesthetic', 'Tactile', 'Visual'].includes(d.name))
      const environmental = sorted.filter(d => ['Intake', 'Light', 'Temperature', 'Mobility', 'Sound', 'Physical Setting'].includes(d.name))
      const mindset = sorted.filter(d => ['Time of Day', 'Teacher Motivation', 'Collaborative', 'Structure', 'Focus', 'Self-Motivation'].includes(d.name))
      const macro = sensory.length > environmental.length && sensory.length > mindset.length ? 'Sensory' :
                    environmental.length > mindset.length ? 'Environmental' : 'Mindset'
      return {
        topPreference1: top1.name || top1.code || '',
        topPreference2: top2.name || top2.code || '',
        dominantMacro: macro,
      }

    case 'multiple-intelligence':
      const intelNames: Record<string, string> = {
        linguistic: 'Linguistic Intelligence', logical: 'Logical-Mathematical Intelligence',
        spatial: 'Spatial Intelligence', kinesthetic: 'Bodily-Kinesthetic Intelligence',
        musical: 'Musical Intelligence', interpersonal: 'Interpersonal Intelligence',
        intrapersonal: 'Intrapersonal Intelligence', naturalist: 'Naturalistic Intelligence',
        existential: 'Existential Intelligence',
      }
      // EI score: average of interpersonal + intrapersonal
      const interpersonal = sorted.find(d => d.code === 'interpersonal')
      const intrapersonal = sorted.find(d => d.code === 'intrapersonal')
      const eiScore = interpersonal && intrapersonal ? Math.round(((interpersonal.pct || 0) + (intrapersonal.pct || 0)) / 2) : 50
      return {
        topIntel1: intelNames[top1.code] || top1.name || '',
        topIntel2: intelNames[top2.code] || top2.name || '',
        eiScore,
      }

    case 'personality':
      // Extract MBTI type from recommendation (e.g., "Personality type: ENTP — The Visionary")
      const typeMatch = (recommendation || '').match(/\b([EI][NS][TF][JP])\b/)
      const mbtiCode = typeMatch ? typeMatch[1] : ''
      // Get nickname from the typeData or the recommendation
      const nickMatch = (recommendation || '').match(/—\s*(.+?)(?:\s*$)/)
      const mbtiNick = nickMatch ? nickMatch[1] : ''
      // Determine traits from the type code
      const traits: Record<string, { decision: string; energy: string; lifestyle: string }> = {
        INTJ: { decision: 'Thinking', energy: 'Introversion', lifestyle: 'Judging' },
        INTP: { decision: 'Thinking', energy: 'Introversion', lifestyle: 'Perceiving' },
        ENTJ: { decision: 'Thinking', energy: 'Extraversion', lifestyle: 'Judging' },
        ENTP: { decision: 'Thinking', energy: 'Extraversion', lifestyle: 'Perceiving' },
        INFJ: { decision: 'Feeling', energy: 'Introversion', lifestyle: 'Judging' },
        INFP: { decision: 'Feeling', energy: 'Introversion', lifestyle: 'Perceiving' },
        ENFJ: { decision: 'Feeling', energy: 'Extraversion', lifestyle: 'Judging' },
        ENFP: { decision: 'Feeling', energy: 'Extraversion', lifestyle: 'Perceiving' },
        ISTJ: { decision: 'Thinking', energy: 'Introversion', lifestyle: 'Judging' },
        ISFJ: { decision: 'Feeling', energy: 'Introversion', lifestyle: 'Judging' },
        ESTJ: { decision: 'Thinking', energy: 'Extraversion', lifestyle: 'Judging' },
        ESFJ: { decision: 'Feeling', energy: 'Extraversion', lifestyle: 'Judging' },
        ISTP: { decision: 'Thinking', energy: 'Introversion', lifestyle: 'Perceiving' },
        ISFP: { decision: 'Feeling', energy: 'Introversion', lifestyle: 'Perceiving' },
        ESTP: { decision: 'Thinking', energy: 'Extraversion', lifestyle: 'Perceiving' },
        ESFP: { decision: 'Feeling', energy: 'Extraversion', lifestyle: 'Perceiving' },
      }
      const t = traits[mbtiCode] || { decision: 'Balanced', energy: 'Balanced', lifestyle: 'Balanced' }
      return {
        mbtiCode,
        mbtiNick,
        decisionTrait: t.decision,
        energyTrait: t.energy,
        lifestyleTrait: t.lifestyle,
      }

    case 'stream-selector':
      // Use domain breakdown (ranked streams)
      const br = domainBreakdown || []
      return {
        rank1Stream: br[0]?.title || br[0]?.code || top1.name || '',
        rank2Stream: br[1]?.title || br[1]?.code || top2.name || '',
      }

    case 'multi-dimensional':
      // Dimensions have 'sec' field: Natural Abilities, Interests, Personality, Career Motivators, Learning Styles
      const sections: Record<string, any[]> = {}
      for (const d of dimensions) {
        const sec = (d as any).sectionName || 'Other'
        if (!sections[sec]) sections[sec] = []
        sections[sec].push(d)
      }
      const getTop = (sec: string) => {
        const arr = sections[sec] || []
        arr.sort((a, b) => (b.pct || 0) - (a.pct || 0))
        return arr[0]?.name || arr[0]?.code || ''
      }
      return {
        topAbility: getTop('Natural Abilities'),
        topInterest: getTop('Interests'),
        topMotivator: getTop('Career Motivators'),
        topLearningStyle: getTop('Learning Styles'),
      }

    default:
      return {}
  }
}

// --- Parsed interpretation for PDF rendering ---
export interface ParsedInterpretation {
  executiveSynthesis: string
  careerSynergies: string
  actionPlan: string[]
}

/**
 * Parses the interpreter HTML output into structured text sections
 * for rendering in the PDF report (page 10).
 */
export function parseInterpretation(html: string): ParsedInterpretation {
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim()
  
  // Extract Executive Synthesis (note: [\s\S] used instead of the 's' regex
  // flag so the pattern stays compatible with the ES2017 build target)
  const execMatch = html.match(/Executive Synthesis:<\/strong>\s*([\s\S]*?)<\/p>/)
  const executiveSynthesis = execMatch ? stripTags(execMatch[1]) : ''
  
  // Extract Career Synergies
  const careerMatch = html.match(/Career Synergies:<\/strong>\s*([\s\S]*?)<\/p>/)
  const careerSynergies = careerMatch ? stripTags(careerMatch[1]) : ''
  
  // Extract Action Plan items
  const liMatches = html.matchAll(/<li>([\s\S]*?)<\/li>/g)
  const actionPlan: string[] = []
  for (const m of liMatches) {
    actionPlan.push(stripTags(m[1]))
  }
  
  return { executiveSynthesis, careerSynergies, actionPlan }
}
