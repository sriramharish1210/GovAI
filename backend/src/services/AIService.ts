import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { 
  StudentProfile, 
  Scheme, 
  EligibilityEvaluationResult 
} from '../../../shared/types';
import { logger } from '../utils/logger';

// Initialize Gemini
const genAI = config.aiMode === 'gemini' && config.geminiApiKey 
  ? new GoogleGenerativeAI(config.geminiApiKey) 
  : null;

/**
 * AI Service class wrapping Gemini API and Mock fallbacks
 */
export class AIService {
  
  /**
   * Generates a student-friendly explanation of deterministic eligibility results
   */
  public static async recommendationExplanation(
    profile: StudentProfile,
    scheme: Scheme,
    evaluation: EligibilityEvaluationResult
  ): Promise<string> {
    if (config.aiMode === 'mock' || !genAI) {
      return this.getMockRecommendationExplanation(scheme, evaluation);
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
        You are an expert student counselor for Government Schemes in India.
        Based on the student's profile and a scheme's deterministic eligibility evaluation, write a friendly 3-4 sentence explanation.
        
        Student Profile:
        ${JSON.stringify({
          state: profile.state,
          educationLevel: profile.educationLevel,
          course: profile.course,
          academicPercentage: profile.academicPercentage,
          familyIncome: profile.familyIncome,
          category: profile.category,
          gender: profile.gender,
          disabilityStatus: profile.disabilityStatus,
          minorityStatus: profile.minorityStatus
        }, null, 2)}

        Scheme Details:
        - Name: ${scheme.name}
        - Department: ${scheme.department}
        - Verification Status: ${scheme.verificationStatus}
        
        Deterministic Rules Evaluation:
        - Status: ${evaluation.eligibilityStatus}
        - Match Score (Relevance): ${evaluation.matchScore}/100
        - Details: ${JSON.stringify(evaluation.rulesEvaluated, null, 2)}
        
        Guidelines:
        - Explain in simple, supportive terms why they qualify (or why not).
        - If ELIGIBLE, highlight 2 key documents they should prepare.
        - If LIKELY_ELIGIBLE or NEEDS_VERIFICATION, clearly point out what information or certificate needs double-checking.
        - If NOT_ELIGIBLE, explain exactly which criteria failed (e.g., income ceiling or category mismatch) so they don't waste time, but keep a encouraging tone.
        - If the scheme is STALE or UNVERIFIED, add a brief note warning them to check the official site.
        - Be direct. Avoid jargon. Do not write a greeting or signature.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Gemini recommendation explanation failed', error);
      return this.getMockRecommendationExplanation(scheme, evaluation);
    }
  }

  /**
   * Generates a bulleted, easy-to-read summary of a government scheme
   */
  public static async summarizeScheme(scheme: Scheme): Promise<string> {
    if (config.aiMode === 'mock' || !genAI) {
      return this.getMockSchemeSummary(scheme);
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
        Summarize the following government scheme for a student in clean, readable Markdown.
        
        Scheme Name: ${scheme.name}
        Description: ${scheme.detailedDescription}
        Benefits: ${scheme.benefits ? JSON.stringify(scheme.benefits) : 'Not specified'}
        Documents Required: ${scheme.documents ? JSON.stringify(scheme.documents) : 'Not specified'}
        
        Provide the following sections in your output:
        - **What it is**: 1-2 sentence simple explanation of the scheme's purpose.
        - **Key Benefit**: Bulleted list of what the student receives.
        - **Critical Requirements**: Who is eligible (income caps, academic thresholds).
        - **Required Files**: List of critical documents.
        - **How to apply**: Step-by-step application instructions.
        
        Rules:
        - Be extremely concise.
        - Do not invent any facts. If something is missing from the input, write "Refer to official website."
        - Keep it formatted with markdown bullet points.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Gemini scheme summarization failed', error);
      return this.getMockSchemeSummary(scheme);
    }
  }

  /**
   * Converses with the student about their eligibility, required documents, or deadlines
   */
  public static async chatbot(
    profile: StudentProfile,
    chatHistory: { role: 'user' | 'assistant'; content: string }[],
    userQuestion: string,
    schemesContext: Scheme[]
  ): Promise<string> {
    if (config.aiMode === 'mock' || !genAI) {
      return this.getMockChatbotResponse(userQuestion, schemesContext);
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const historyFormatted = chatHistory.map(h => 
        `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
      ).join('\n');

      const prompt = `
        You are GovAI, an expert AI chatbot specializing in Indian student government schemes.
        You are helping a student. Below is their profile, along with schemes that they might be interested in.
        
        Student Profile:
        ${JSON.stringify(profile, null, 2)}
        
        Relevant Schemes Context:
        ${JSON.stringify(schemesContext.map(s => ({
          id: s.id,
          name: s.name,
          department: s.department,
          officialSourceUrl: s.officialSourceUrl,
          verificationStatus: s.verificationStatus,
          eligibility: s.eligibility
        })), null, 2)}
        
        Conversation History:
        ${historyFormatted}
        
        New Student Question:
        "${userQuestion}"
        
        Instructions:
        1. Ground your answers strictly on the student profile and the provided schemes context.
        2. If you refer to any scheme that is "STALE" or "UNVERIFIED" in the context, you MUST start your response with a clear warning: "[WARNING: This scheme data has not been verified recently. Please consult the official website to verify current eligibility criteria.]"
        3. If the user asks about eligibility, compare their profile details (e.g. income, marks) against the scheme requirements in the context and explain why they qualify or why they fail.
        4. If the information requested is not in the context or if you cannot verify it, clearly state: "I cannot confirm this information with the available official source. Please double-check the official portal at [officialSourceUrl]." Do not make up deadlines or benefits.
        5. Keep responses concise, friendly, and structured.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Gemini chatbot query failed', error);
      return this.getMockChatbotResponse(userQuestion, schemesContext);
    }
  }

  /**
   * Explains confusing legal or administrative terms simply
   */
  public static async explainTerm(term: string, context?: string): Promise<string> {
    if (config.aiMode === 'mock' || !genAI) {
      return this.getMockTermExplanation(term);
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
        Explain the government scheme administrative term "${term}" to a student.
        Context where it appeared: ${context || 'None'}.
        
        Provide your explanation in three short, clear paragraphs:
        1. **What it is**: Explain the term in 1-2 simple sentences that a 12th grader can easily understand.
        2. **Why it is needed**: Explain why government schemes require this document or condition.
        3. **How to get it**: Outline the general, practical procedure in India to obtain it (e.g. applying through local Tahsildar, CSC centers, or online state portals).
        
        Rules:
        - Do not use dense legal language.
        - If it is not a document (e.g. "Moratorium Period"), explain the concept simply.
        - Do not invent state-specific procedures; state the general process.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Gemini term explanation failed', error);
      return this.getMockTermExplanation(term);
    }
  }

  // ==========================================
  // MOCK FALLBACK IMPLEMENTATIONS
  // ==========================================

  private static getMockRecommendationExplanation(
    scheme: Scheme,
    evaluation: EligibilityEvaluationResult
  ): string {
    const isEligible = evaluation.eligibilityStatus === 'ELIGIBLE' || evaluation.eligibilityStatus === 'LIKELY_ELIGIBLE';
    const isStale = scheme.verificationStatus === 'STALE' || scheme.verificationStatus === 'UNVERIFIED';

    let explanation = '';
    if (isEligible) {
      explanation = `Based on your profile, you are eligible for the ${scheme.name}. Your annual family income and academic qualifications fit within the parameters. Make sure to prepare your resident domicile and previous marksheet.`;
    } else if (evaluation.eligibilityStatus === 'NEEDS_VERIFICATION') {
      explanation = `You might be eligible for ${scheme.name}, but some secondary attributes require manual verification. Please check the required documentation.`;
    } else {
      const failed = evaluation.rulesEvaluated.filter(e => !e.passed).map(e => e.field).join(', ');
      explanation = `You do not qualify for the ${scheme.name} because you do not meet the criteria for: ${failed || 'specific requirements'}. We suggest searching for alternate schemes matching your profile.`;
    }

    if (isStale) {
      explanation += ` (Please note: This scheme is currently marked as STALE. Verify details on the official source: ${scheme.officialSourceUrl}).`;
    }

    return explanation;
  }

  private static getMockSchemeSummary(scheme: Scheme): string {
    return `### **Summary of ${scheme.name}**

* **What it is**: A program by the ${scheme.department} to support students pursuing higher education.
* **Key Benefit**: Financial assistance or tuition fee concessions as per scheme rules.
* **Critical Requirements**: Domicile certificate, income limitations, and academic percentage thresholds.
* **Required Files**: Income certificate, marksheet, caste certificate (if applicable), and Aadhaar card.
* **How to apply**: Submit applications online through the official portal at ${scheme.officialSourceUrl}.`;
  }

  private static getMockChatbotResponse(question: string, context: Scheme[]): string {
    const q = question.toLowerCase();
    
    // Check if context has stale schemes
    const hasStale = context.some(s => s.verificationStatus === 'STALE' || s.verificationStatus === 'UNVERIFIED');
    const warning = hasStale ? `[WARNING: This scheme data has not been verified recently. Please consult the official website to verify current eligibility criteria.]\n\n` : '';

    if (q.includes('eligible') || q.includes('qualify')) {
      return `${warning}To check your eligibility, you can update your Student Profile. The engine will match your income, course, state, and category. For example, if you are looking at the Post-Matric Scholarship, it requires SC/ST/OBC category and family income below ₹2.5 Lakhs.`;
    }
    
    if (q.includes('document') || q.includes('file') || q.includes('need')) {
      return `${warning}Generally, most scholarship applications require:
1. Aadhaar Card (linked with bank account)
2. Family Income Certificate (issued by Tahsildar)
3. Caste/Category Certificate
4. Previous Academic Marksheets
5. Domicile/Residence proof.`;
    }

    if (q.includes('deadline') || q.includes('date') || q.includes('when')) {
      return `${warning}Application deadlines vary by scheme. For instance, central schemes on the National Scholarship Portal usually close between October and December. Check the details page of the scheme for exact deadlines.`;
    }

    // Default chat fallback
    return `${warning}I am GovAI, your assistant. I can help you search, understand, and compare student government schemes. You can ask me questions like:
- "What documents do I need for scholarships?"
- "Am I eligible for EBC concessions?"
- "What is a Domicile Certificate?"`;
  }

  private static getMockTermExplanation(term: string): string {
    const t = term.toLowerCase();

    if (t.includes('income') || t.includes('certificate')) {
      return `### **Family Income Certificate**

**What it is**: An official document issued by state authorities certifying the annual income of all members of the student's family.

**Why it is needed**: Government schemes are targeted towards low-income families to ensure financial aid goes to those in need. This document serves as the legal proof of income.

**How to get it**: You can apply online through your state's e-District portal or visit a local Tahsildar office / Common Service Centre (CSC). You will need to submit income proof (salary slip or ITR) and land records if applicable.`;
    }

    if (t.includes('domicile') || t.includes('resident')) {
      return `### **Domicile Certificate**

**What it is**: A legal document proving that a person is a permanent resident of a specific Indian state or union territory.

**Why it is needed**: State-specific schemes are funded by state taxpayers and are restricted to students who are permanent residents of that state.

**How to get it**: You can apply through the state's e-District portal (e.g. MahaOnline for Maharashtra, SSP for Karnataka) or a local Revenue Department office. You will need to provide proof of continuous residence in the state (usually 10-15 years), such as school leaving certificates or electricity bills.`;
    }

    // Generic term explanation
    return `### **${term}**

**What it is**: An administrative or legal term commonly used in government scheme eligibility guidelines.

**Why it is needed**: It acts as a screening parameter to verify that applicants meet specific administrative, social, or geographical requirements.

**How to get it**: Consult your college administration, local Revenue office (Tahsildar), or the official application guidelines on the scholarship portal.`;
  }
}
