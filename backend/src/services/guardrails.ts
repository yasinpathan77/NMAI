// Guardrails service for compliance and safety checks
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Medical claim terms that need softening
const DEFINITIVE_CLAIMS = {
  'will cure': 'may help improve',
  'will heal': 'may help heal',
  'will fix': 'may help address',
  'will eliminate': 'may help reduce',
  'will prevent': 'may help prevent',
  'guarantees': 'may provide',
  'definitely': 'likely',
  'certainly': 'probably',
  'always works': 'often helps',
  'never fails': 'typically effective'
};

export class GuardrailsService {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  private static models: { [key: string]: any } = {};
  private static modelFallbackOrder = [
    'gemini-2.0-flash-exp',  // Primary: Gemini 2.0 Flash (experimental)
    'gemini-1.5-flash',      // Fallback 1: Gemini 1.5 Flash
    'gemini-1.5-pro',        // Fallback 2: Gemini 1.5 Pro
  ];

  static {
    // Initialize all models
    this.modelFallbackOrder.forEach(modelName => {
      try {
        this.models[modelName] = this.genAI.getGenerativeModel({ model: modelName });
      } catch (error) {
        console.warn(`Failed to initialize guardrails model ${modelName}:`, error);
      }
    });
  }

  /**
   * Execute with fallback to other models if quota exceeded
   */
  private static async executeWithFallback(prompt: string): Promise<any> {
    let lastError: any;

    for (const modelName of this.modelFallbackOrder) {
      if (!this.models[modelName]) {
        continue;
      }

      try {
        const model = this.models[modelName];
        const result = await model.generateContent(prompt);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`Guardrails model ${modelName} failed:`, error.message);

        // Check if it's a quota error
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          console.log(`Quota exceeded for ${modelName} in guardrails, trying next...`);
          continue;
        }

        // For other errors, continue to next model
        continue;
      }
    }

    // If all models failed, throw the last error
    throw lastError || new Error('All guardrail models failed');
  }

  /**
   * Check transcript for emergency situations using AI
   * @param transcript - The consultation transcript
   * @returns Object with hasEmergency flag and detected conditions
   */
  static async checkEmergencyKeywords(transcript: string): Promise<{
    hasEmergency: boolean;
    detectedKeywords: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }> {
    try {
      const prompt = `You are a medical triage assistant. Analyze this transcript for emergency indicators.

Transcript: "${transcript}"

Check for these HIGH-PRIORITY emergency conditions:
1. Cardiovascular: chest pain, chest pressure, heart attack symptoms, shortness of breath
2. Neurological: stroke symptoms, seizures, loss of consciousness, severe headache with neurological symptoms
3. Mental health: suicidal thoughts, self-harm intentions, homicidal ideation
4. Respiratory: difficulty breathing, choking, severe asthma attack
5. Allergic: anaphylaxis, severe allergic reaction, swelling of throat/face
6. Trauma: severe bleeding, major injuries, head trauma with confusion
7. Poisoning/Overdose: drug overdose, poisoning symptoms

IMPORTANT: Look for both explicit mentions AND implied symptoms. For example:
- "pressure in my chest" = chest pain emergency
- "can't catch my breath" = breathing emergency
- "want to end it all" = suicidal emergency

Return ONLY this JSON format:
{
  "hasEmergency": true/false,
  "detectedConditions": ["list", "of", "conditions"],
  "severity": "low" or "medium" or "high" or "critical",
  "recommendation": "one sentence recommendation"
}

If ANY emergency indicator is present, set hasEmergency to true.`;

      const result = await this.executeWithFallback(prompt);
      const response = result.response.text();

      // Parse the JSON response
      const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
      const analysis = JSON.parse(cleanedResponse);

      return {
        hasEmergency: analysis.hasEmergency || false,
        detectedKeywords: analysis.detectedConditions || [],
        severity: analysis.severity || 'low',
        recommendation: analysis.recommendation || 'Standard clinical review recommended'
      };
    } catch (error) {
      // Fallback to conservative approach if AI fails
      console.error('AI emergency detection failed:', error);

      // Basic fallback check for obvious keywords
      const urgentTerms = ['chest pain', 'suicide', 'can\'t breathe', 'stroke', 'heart attack'];
      const found = urgentTerms.filter(term =>
        transcript.toLowerCase().includes(term)
      );

      return {
        hasEmergency: found.length > 0,
        detectedKeywords: found,
        severity: found.length > 0 ? 'high' : 'low',
        recommendation: found.length > 0
          ? 'Urgent medical attention may be required'
          : 'Standard clinical review recommended'
      };
    }
  }

  /**
   * Soften definitive medical claims
   * @param text - Text containing potential medical claims
   * @returns Object with softened text and changes made
   */
  static softenMedicalClaims(text: string): { text: string; changesMade: string[] } {
    let softenedText = text;
    const changesMade: string[] = [];

    // Replace definitive claims with cautious language
    Object.entries(DEFINITIVE_CLAIMS).forEach(([definitive, cautious]) => {
      const regex = new RegExp(definitive, 'gi');
      if (regex.test(softenedText)) {
        changesMade.push(`Changed "${definitive}" to "${cautious}"`);
        softenedText = softenedText.replace(regex, cautious);
      }
    });

    return { text: softenedText, changesMade };
  }

  /**
   * Generate compliance banner
   * @param hasEmergency - Whether emergency situations were detected
   * @returns Compliance banner text
   */
  static generateComplianceBanner(hasEmergency: boolean): string {
    // Always return the required compliance text
    const baseCompliance = "Draft only; clinician review required; not a medical device; may be inaccurate.";

    if (!hasEmergency) {
      return baseCompliance;
    }

    // For emergencies, prepend urgent warning to the compliance text
    return `⚠️ URGENT: Emergency indicators detected. ${baseCompliance} This is NOT a triage tool - follow emergency protocols.`;
  }

  /**
   * Apply all guardrails to the analysis result
   * @param result - The raw analysis result
   * @param transcript - The original transcript
   * @returns Modified result with guardrails applied and detailed log
   */
  static async applyGuardrails(result: any, transcript: string): Promise<any> {
    // Track all guardrail actions
    let guardrailActions: string[] = [];

    // Check for emergency situations using AI
    const emergencyCheck = await this.checkEmergencyKeywords(transcript);
    if (emergencyCheck.hasEmergency) {
      guardrailActions.push(`Emergency detected: ${emergencyCheck.severity} severity`);
      guardrailActions.push(`Conditions found: ${emergencyCheck.detectedKeywords.join(', ')}`);
    } else {
      guardrailActions.push('No emergency indicators detected');
    }

    // Soften medical claims in all text fields
    let totalChangesMade: string[] = [];

    if (result.soapNote) {
      const subjective = this.softenMedicalClaims(result.soapNote.subjective);
      result.soapNote.subjective = subjective.text;
      totalChangesMade = totalChangesMade.concat(subjective.changesMade.map(c => `Subjective: ${c}`));

      const objective = this.softenMedicalClaims(result.soapNote.objective);
      result.soapNote.objective = objective.text;
      totalChangesMade = totalChangesMade.concat(objective.changesMade.map(c => `Objective: ${c}`));

      const assessment = this.softenMedicalClaims(result.soapNote.assessment);
      result.soapNote.assessment = assessment.text;
      totalChangesMade = totalChangesMade.concat(assessment.changesMade.map(c => `Assessment: ${c}`));

      const plan = this.softenMedicalClaims(result.soapNote.plan);
      result.soapNote.plan = plan.text;
      totalChangesMade = totalChangesMade.concat(plan.changesMade.map(c => `Plan: ${c}`));
    }

    if (result.billingHint) {
      const billing = this.softenMedicalClaims(result.billingHint);
      result.billingHint = billing.text;
      totalChangesMade = totalChangesMade.concat(billing.changesMade.map(c => `Billing: ${c}`));
    }

    // Add guardrail action summary
    if (totalChangesMade.length > 0) {
      guardrailActions.push(`Softened ${totalChangesMade.length} medical claims:`);
      guardrailActions = guardrailActions.concat(totalChangesMade);
    } else {
      guardrailActions.push('No medical claims needed softening');
    }

    // Add compliance banner
    guardrailActions.push('Added compliance banner and disclaimers');

    // Add emergency information with severity
    result.hasEmergencyKeywords = emergencyCheck.hasEmergency;
    result.emergencyFlags = emergencyCheck.detectedKeywords;
    result.emergencySeverity = emergencyCheck.severity;
    result.emergencyRecommendation = emergencyCheck.recommendation;

    // Generate compliance banner
    result.complianceBanner = this.generateComplianceBanner(emergencyCheck.hasEmergency);

    // Add detailed guardrail actions to result
    result.guardrailActions = guardrailActions;

    return result;
  }
}