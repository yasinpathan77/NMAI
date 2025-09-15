import { z } from 'zod';

// Schema for SOAP Note
export const SOAPNoteSchema = z.object({
  subjective: z.string().min(1, "Subjective cannot be empty"),
  objective: z.string().min(1, "Objective cannot be empty"),
  assessment: z.string().min(1, "Assessment cannot be empty"),
  plan: z.string().min(1, "Plan cannot be empty")
});

// Schema for Problem
export const ProblemSchema = z.object({
  description: z.string(),
  rationale: z.string()
});

// Schema for ICD-10 Code
export const ICD10CodeSchema = z.object({
  code: z.string().regex(/^[A-Z]\d{2}(\.\d{1,4})?$/, "Invalid ICD-10 code format"),
  description: z.string(),
  confidence: z.enum(['low', 'medium', 'high'])
});

// Schema for CPT Code
export const CPTCodeSchema = z.object({
  code: z.string().regex(/^\d{5}$/, "CPT code must be 5 digits"),
  description: z.string(),
  justification: z.string(),
  confidence: z.enum(['low', 'medium', 'high'])
});

// Schema for E/M Level
export const EMLevelSchema = z.object({
  level: z.string(),
  description: z.string(),
  justification: z.string(),
  confidence: z.enum(['low', 'medium', 'high'])
});

// Schema for complete LLM response
export const LLMResponseSchema = z.object({
  soapNote: SOAPNoteSchema,
  problems: z.array(ProblemSchema),
  icd10Codes: z.array(ICD10CodeSchema).max(3, "Maximum 3 ICD-10 codes"),
  cptCodes: z.array(CPTCodeSchema).max(3, "Maximum 3 CPT codes"),
  emLevel: EMLevelSchema.nullable(),
  billingHint: z.string(),
  complianceBanner: z.string()
});

// Schema for analyze request
export const AnalyzeRequestSchema = z.object({
  transcript: z.string().min(10, "Transcript too short").max(5000, "Transcript too long"),
  acknowledgeEmergency: z.boolean().optional()
});

// Type exports
export type SOAPNote = z.infer<typeof SOAPNoteSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
export type ICD10Code = z.infer<typeof ICD10CodeSchema>;
export type CPTCode = z.infer<typeof CPTCodeSchema>;
export type EMLevel = z.infer<typeof EMLevelSchema>;
export type LLMResponse = z.infer<typeof LLMResponseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;