import { logger } from '../utils/logger';
import { AIService } from './AIService';

/**
 * Verified definitions for common Indian student government scheme terms.
 * Formatted in clean markdown with the 3 sections expected by the frontend.
 */
const VERIFIED_GLOSSARY: Record<string, string> = {
  'domicile certificate': `### **Domicile Certificate**

**What it is**: A legal document issued by state authorities proving that a student is a permanent resident of a specific Indian state or union territory.

**Why it is needed**: State-funded scholarship schemes and fee waivers are funded by state taxpayers and are strictly reserved for permanent residents of that state.

**How to get it**: Apply online through your state's e-District / citizen portal (e.g., SSP/Seva Sindhu in Karnataka, MahaOnline in Maharashtra) or visit a local Tahsildar / Revenue office or Common Service Centre (CSC). You will need identity proof, address proof, and evidence of continuous residence (usually 7–10 years).`,

  'non-creamy layer (ncl)': `### **Non-Creamy Layer (NCL) Certificate**

**What it is**: A document verifying that an Other Backward Class (OBC) candidate's family income falls below the official ceiling (currently ₹8 Lakh per annum), entitling them to reservation benefits.

**Why it is needed**: Ensures that OBC scholarship quotas, fee concessions, and hostel allocations reach economically disadvantaged students rather than affluent OBC families.

**How to get it**: Apply through your local Revenue Department (Revenue Inspector/Tahsildar) or state e-District portal with your Caste Certificate, family income certificate, and 3-year income tax returns (ITR) or salary slips.`,

  'non creamy layer': `### **Non-Creamy Layer (NCL) Certificate**

**What it is**: A document verifying that an Other Backward Class (OBC) candidate's family income falls below the official ceiling (currently ₹8 Lakh per annum), entitling them to reservation benefits.

**Why it is needed**: Ensures that OBC scholarship quotas, fee concessions, and hostel allocations reach economically disadvantaged students rather than affluent OBC families.

**How to get it**: Apply through your local Revenue Department (Revenue Inspector/Tahsildar) or state e-District portal with your Caste Certificate, family income certificate, and 3-year income tax returns (ITR) or salary slips.`,

  'family income certificate': `### **Family Income Certificate**

**What it is**: An official revenue certificate detailing the gross annual income earned by all earning members of a student's family from all sources.

**Why it is needed**: Most government welfare schemes are means-tested; this document proves whether the student meets income eligibility thresholds (e.g. ₹2.5 Lakh or ₹6 Lakh).

**How to get it**: Apply online via the state revenue / e-District portal or at your local Tahsildar / Taluk office. Submit salary slips, Form 16, employer certificates, or an affidavit along with ration card and Aadhaar.`,

  'income certificate': `### **Family Income Certificate**

**What it is**: An official revenue certificate detailing the gross annual income earned by all earning members of a student's family from all sources.

**Why it is needed**: Most government welfare schemes are means-tested; this document proves whether the student meets income eligibility thresholds (e.g. ₹2.5 Lakh or ₹6 Lakh).

**How to get it**: Apply online via the state revenue / e-District portal or at your local Tahsildar / Taluk office. Submit salary slips, Form 16, employer certificates, or an affidavit along with ration card and Aadhaar.`,

  'economically weaker section (ews)': `### **Economically Weaker Section (EWS)**

**What it is**: A reservation and scholarship category for General category students whose family gross annual income is below ₹8 Lakh and who do not belong to SC, ST, or OBC.

**Why it is needed**: Provides 10% educational seat reservation and targeted financial scholarships to needy candidates who are not covered under historical caste-based reservation.

**How to get it**: Obtain an Income and Asset Certificate from the Revenue Officer / Tahsildar of your area. Land holding and residential flat size limits also apply as per government norms.`,

  'ews': `### **Economically Weaker Section (EWS)**

**What it is**: A reservation and scholarship category for General category students whose family gross annual income is below ₹8 Lakh and who do not belong to SC, ST, or OBC.

**Why it is needed**: Provides 10% educational seat reservation and targeted financial scholarships to needy candidates who are not covered under historical caste-based reservation.

**How to get it**: Obtain an Income and Asset Certificate from the Revenue Officer / Tahsildar of your area. Land holding and residential flat size limits also apply as per government norms.`,

  'moratorium period': `### **Moratorium Period**

**What it is**: A repayment holiday or grace period during which an education loan borrower is not required to make principal loan repayments, typically extending through the course duration plus 6 to 12 months after graduation.

**Why it is needed**: Gives students sufficient time to complete their degree, search for employment, and establish initial earnings before loan repayment obligations commence.

**How to get it**: Check the Central Sector Interest Subsidy (CSIS) scheme or Padho Pardesh guidelines through Canara Bank / your lending bank portal to ensure interest subsidies are credited during your moratorium.`,

  'capitation fee': `### **Capitation Fee**

**What it is**: Any illegal donation, premium, or undisclosed fee charged by educational institutions over and above the government-approved tuition and regulatory fees.

**Why it is needed**: Understanding this term protects students against extortion. Indian law and AICTE / UGC regulations strictly prohibit capitation fees, and scholarship schemes will never reimburse or recognize them.

**How to get it**: If an institution demands a capitation fee for admission or scholarship processing, report it immediately to the state Fee Regulatory Committee, the anti-ragging/grievance portal, or UGC's e-Samadhan platform.`,

  'merit-cum-means': `### **Merit-cum-Means**

**What it is**: A scholarship selection criteria that balances academic performance (merit, e.g. minimum 50% or 60% marks) with economic need (means, e.g. parental income below ₹2.5 Lakh).

**Why it is needed**: Ensures public scholarship funds reward hardworking students while directing financial assistance to those who genuinely cannot afford educational fees.

**How to get it**: Apply during open enrollment on the National Scholarship Portal (scholarships.gov.in) or state portals with previous year marksheets, proof of college admission, and a valid income certificate.`,

  'bonafide certificate': `### **Bonafide Certificate**

**What it is**: An institutional certificate issued by your school, college, or university verifying that you are currently an actively enrolled student in a specific course and year.

**Why it is needed**: Proves to government scholarship sanctioning authorities that you have taken genuine admission and are attending classes.

**How to get it**: Request it from your college registrar, academic dean, or student administration office. It must have the college seal and principal's signature.`
};

/** In-memory cache for all term explanations (TTL: process lifetime) */
const cache = new Map<string, string>();

export class GlossaryService {
  /**
   * Resolves a plain-language explanation for a term using cache, verified glossary, or fast Gemini fallback.
   */
  public static async getExplanation(term: string, context?: string): Promise<{ explanation: string; source: 'CACHE' | 'VERIFIED' | 'GEMINI'; durationMs: number }> {
    const t0 = Date.now();
    const normalized = term.trim().toLowerCase();

    // 1. Check in-memory cache
    if (cache.has(normalized)) {
      const explanation = cache.get(normalized)!;
      const durationMs = Date.now() - t0;
      logger.info(`[Glossary] Term "${term}" resolved from CACHE in ${durationMs}ms`);
      return { explanation, source: 'CACHE', durationMs };
    }

    // 2. Check verified glossary
    if (VERIFIED_GLOSSARY[normalized]) {
      const explanation = VERIFIED_GLOSSARY[normalized];
      cache.set(normalized, explanation);
      const durationMs = Date.now() - t0;
      logger.info(`[Glossary] Term "${term}" resolved from VERIFIED glossary in ${durationMs}ms`);
      return { explanation, source: 'VERIFIED', durationMs };
    }

    // 3. Fallback to Gemini with performance logging
    logger.info(`[Glossary] Term "${term}" not in local glossary. Calling Gemini...`);
    const explanation = await AIService.explainTerm(term, context);
    cache.set(normalized, explanation);
    const durationMs = Date.now() - t0;
    logger.info(`[Glossary] Term "${term}" resolved from GEMINI in ${durationMs}ms`);
    return { explanation, source: 'GEMINI', durationMs };
  }
}
