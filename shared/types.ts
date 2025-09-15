// Shared types used by both frontend and backend

// SOAP Note structure
export interface SOAPNote {
  subjective: string;  // Patient's complaints and symptoms
  objective: string;   // Clinical findings and observations
  assessment: string;  // Diagnosis and clinical impression
  plan: string;        // Treatment plan and next steps
}

// Problem extracted from the transcript
export interface Problem {
  description: string;
  rationale: string;   // 1-2 lines explaining why this was identified
}

// ICD-10 code suggestion
export interface ICD10Code {
  code: string;
  description: string;
  confidence: 'low' | 'medium' | 'high';
}

// CPT code suggestion
export interface CPTCode {
  code: string;
  description: string;
  justification: string;  // One-line justification
  confidence: 'low' | 'medium' | 'high';
}

// E/M Level suggestion
export interface EMLevel {
  mbsItem?: string;  // Medicare item number
  level?: string;  // e.g., "99213", "99214" (for backwards compatibility)
  description: string;
  duration?: string;  // e.g., "10-15 mins"
  justification: string;
  confidence: 'low' | 'medium' | 'high';
}

// Complete analysis result
export interface AnalysisResult {
  id?: string;
  timestamp?: string;
  transcript?: string;
  soapNote: SOAPNote;
  problems: Problem[];
  icd10Codes: ICD10Code[];
  cptCodes: CPTCode[];
  emLevel: EMLevel | null;
  billingHint: string;
  complianceBanner: string;
  hasEmergencyKeywords: boolean;
  emergencyFlags: string[];
  emergencySeverity?: 'low' | 'medium' | 'high' | 'critical';
  emergencyRecommendation?: string;
  traceLog: TraceLogEntry[];
  rawLLMResponse?: string;  // For debugging
  speakerInfo?: {
    speakers: {
      doctor: string;
      patient: string;
      others: string[];
    };
    confidence: string;
  };
  annotatedTranscript?: string;
}

// Trace log for transparency
export interface TraceLogEntry {
  timestamp: string;
  step: string;
  details: string;
  prompt?: string;  // Redacted prompt sent to LLM
  response?: string;
  technique?: string; // Prompting technique used (CoT, Few-Shot, etc.)
}

// Request payload for analysis
export interface AnalyzeRequest {
  transcript: string;
  acknowledgeEmergency?: boolean;  // Required if emergency keywords detected
}

// Session history record
export interface SessionRecord {
  id: string;
  timestamp: string;
  transcript: string;
  result: AnalysisResult;
}