// shared/types.ts

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: StudentProfile;
  notificationPreference?: NotificationPreference;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  reminder30Days: boolean;
  reminder7Days: boolean;
  reminder1Day: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  phone: string | null;
  state: string | null;
  district: string | null;
  educationLevel: string | null; // e.g., "10th", "12th", "UG", "PG", "Diploma", "PhD"
  institution: string | null;
  course: string | null;
  yearOfStudy: number | null;
  academicPercentage: number | null;
  familyIncome: number | null;
  category: string | null; // e.g., "General", "OBC", "SC", "ST", "EWS"
  gender: string | null; // e.g., "Male", "Female", "Transgender", "Prefer not to say"
  dob: string | null; // ISO date string
  disabilityStatus: boolean;
  disabilityPercentage: number | null;
  minorityStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SchemeCategory = 
  | "Scholarship" 
  | "Financial Assistance" 
  | "Loan" 
  | "Skill Development" 
  | "Internship" 
  | "Welfare";

export type DeadlineType = "FIXED" | "RECURRING" | "ROLLING" | "UNKNOWN";
export type VerificationStatus = "VERIFIED" | "STALE" | "UNVERIFIED";

export interface Scheme {
  id: string;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  department: string;
  centralOrState: "CENTRAL" | "STATE";
  state: string | null;
  officialSourceUrl: string;
  officialApplicationUrl: string | null;
  sourceName: string;
  startDate: string | null;
  deadline: string | null;
  deadlineType: DeadlineType;
  recurringCycle: string | null;
  lastVerifiedDate: string;
  verificationStatus: VerificationStatus;
  sourceMetadata: string | null;
  createdAt: string;
  updatedAt: string;
  benefits?: SchemeBenefit[];
  documents?: SchemeDocument[];
  eligibility?: SchemeEligibility;
  tags?: Tag[];
}

export interface SchemeBenefit {
  id: string;
  schemeId: string;
  type: "MONETARY" | "SUBSIDY" | "STIPEND" | "TUITION_WAVIER" | "OTHER";
  amount: number | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeDocument {
  id: string;
  schemeId: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeEligibility {
  id: string;
  schemeId: string;
  rulesJson: string; // JSON Condition Tree e.g. { "operator": "AND", "conditions": [...] }
  readableRequirements: string; // Markdown summary
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  schemeId: string;
  createdAt: string;
  scheme?: Scheme;
}

export type ApplicationStatus = "NOT_APPLIED" | "PLANNING_TO_APPLY" | "APPLIED" | "COMPLETED";

export interface Application {
  id: string;
  userId: string;
  schemeId: string;
  status: ApplicationStatus;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scheme?: Scheme;
}

export interface Reminder {
  id: string;
  userId: string;
  schemeId: string;
  daysBefore: number; // 30 | 7 | 1
  triggerDate: string;
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
  scheme?: Scheme;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface GeneratedReport {
  id: string;
  userId: string;
  reportData: string; // JSON string
  createdAt: string;
}

// Rule Engine Structures
export type RuleOperator = "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "IN" | "NIN";
export type LogicalOperator = "AND" | "OR";

export interface RuleCondition {
  field: string; // matches profile keys e.g. "age", "familyIncome", "state", "educationLevel", "academicPercentage", "category", "gender", "disabilityStatus", "minorityStatus"
  operator: RuleOperator;
  value: any;
}

export interface RuleGroup {
  operator: LogicalOperator;
  conditions: RuleCondition[];
  groups?: RuleGroup[];
}

// Eligibility Output
export type EligibilityStatus = "ELIGIBLE" | "LIKELY_ELIGIBLE" | "NEEDS_VERIFICATION" | "NOT_ELIGIBLE";

export interface RuleEvaluationResult {
  field: string;
  passed: boolean;
  message: string;
}

export interface EligibilityEvaluationResult {
  schemeId: string;
  matchScore: number; // Relevance score: percentage of matched conditions (0-100)
  eligibilityStatus: EligibilityStatus;
  rulesEvaluated: RuleEvaluationResult[];
}

export interface RecommendationResult {
  scheme: Scheme;
  matchScore: number;
  eligibilityStatus: EligibilityStatus;
  rulesEvaluated: RuleEvaluationResult[];
  aiExplanation: string;
}

// API Responses
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}
