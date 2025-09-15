import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMResponseSchema } from '../schemas/validation.js';
import { GuardrailsService } from './guardrails.js';

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private models: { [key: string]: any } = {};
  private currentModelName: string;
  private modelFallbackOrder = [
    'gemini-2.0-flash-exp',  // Primary: Gemini 2.0 Flash (experimental)
    'gemini-1.5-flash',      // Fallback 1: Gemini 1.5 Flash
    'gemini-1.5-pro',        // Fallback 2: Gemini 1.5 Pro
  ];

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Initialize all models
    this.modelFallbackOrder.forEach(modelName => {
      try {
        this.models[modelName] = this.genAI.getGenerativeModel({ model: modelName });
      } catch (error) {
        console.warn(`Failed to initialize model ${modelName}:`, error);
      }
    });

    // Start with the first available model
    this.currentModelName = this.modelFallbackOrder[0];
  }

  /**
   * Get current model with fallback support
   */
  private getModel() {
    return this.models[this.currentModelName];
  }

  /**
   * Execute with fallback to other models if quota exceeded
   */
  private async executeWithFallback(prompt: string): Promise<any> {
    let lastError: any;

    for (let i = this.modelFallbackOrder.indexOf(this.currentModelName); i < this.modelFallbackOrder.length; i++) {
      const modelName = this.modelFallbackOrder[i];

      if (!this.models[modelName]) {
        continue;
      }

      try {
        // Attempting model fallback
        const model = this.models[modelName];
        const result = await model.generateContent(prompt);

        // If successful, update current model for next request
        this.currentModelName = modelName;

        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`Model ${modelName} failed:`, error.message);

        // Check if it's a quota error
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          // Quota exceeded, trying next model
          continue;
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    // If all models failed, throw the last error
    throw lastError || new Error('All models failed');
  }

  /**
   * Step 1: Identify speakers in the transcript using Chain-of-Thought
   */
  async identifySpeakers(transcript: string): Promise<{ result: any, prompt: string, response: string }> {
    const prompt = `You are a medical transcription expert. Analyze this medical consultation transcript and identify the speakers.

TRANSCRIPT:
${transcript}

Let's work through this step-by-step:

1. First, I'll scan for explicit speaker labels (e.g., "Doctor:", "Patient:", "Nurse:")
2. Then, I'll analyze speech patterns to identify roles:
   - Medical terminology and diagnostic language suggests healthcare provider
   - Personal symptoms and concerns suggest patient
   - Administrative or supportive language suggests nurse/staff

Based on my analysis, return ONLY a valid JSON object (no markdown, no code blocks, no explanatory text):
{
  "speakers": {
    "doctor": "Name or 'Doctor' if not specified",
    "patient": "Name or 'Patient' if not specified",
    "others": ["List of other speakers if any"]
  },
  "confidence": "high/medium/low",
  "annotatedTranscript": "The transcript with clear [Doctor] and [Patient] labels"
}

IMPORTANT: Return ONLY the JSON object. Do not wrap in markdown code blocks. Do not add any text before or after the JSON.`;

    try {
      const result = await this.executeWithFallback(prompt);
      const text = result.response.text();

      // Extract JSON from the response - handle cases where model adds extra text
      let jsonStr = text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const cleanedText = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      return {
        result: JSON.parse(cleanedText),
        prompt: prompt,
        response: text
      };
    } catch (error: any) {
      console.error('Speaker identification failed:', error);
      // Return a default structure if parsing fails
      return {
        result: {
          speakers: { doctor: 'Doctor', patient: 'Patient', others: [] },
          confidence: 'low',
          annotatedTranscript: transcript
        },
        prompt: prompt,
        response: error.message
      };
    }
  }

  /**
   * Step 2: Generate SOAP note using Few-Shot Prompting
   */
  async generateSOAPNote(transcript: string): Promise<{ result: any, prompt: string, response: string }> {
    const prompt = `Convert this medical transcript into a SOAP note. Use these examples as guidance:

EXAMPLE 1:
Input: "Patient complains of headache for 3 days. No fever. BP 120/80."
Output:
{
  "subjective": "Patient reports headache for 3 days duration",
  "objective": "Vital signs: BP 120/80. No fever present",
  "assessment": "Primary headache, likely tension-type",
  "plan": "Symptomatic treatment with analgesics, follow-up if symptoms persist"
}

EXAMPLE 2:
Input: "Patient has cough and fever. Temperature 101F. Lungs clear."
Output:
{
  "subjective": "Patient presents with cough and fever",
  "objective": "Temperature: 101°F. Lung auscultation: clear bilateral",
  "assessment": "Upper respiratory infection",
  "plan": "Supportive care, antipyretics, return if symptoms worsen"
}

NOW CONVERT THIS TRANSCRIPT:
${transcript}

Return ONLY a valid JSON object with subjective, objective, assessment, and plan fields.

IMPORTANT: Return ONLY the JSON object. Do not wrap in markdown code blocks. Do not add any text before or after the JSON.`;

    try {
      const result = await this.executeWithFallback(prompt);
      const text = result.response.text();

      // Extract JSON from the response - handle cases where model adds extra text
      let jsonStr = text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const cleanedText = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      return {
        result: JSON.parse(cleanedText),
        prompt: prompt,
        response: text
      };
    } catch (error: any) {
      console.error('SOAP generation failed:', error);
      throw new Error('Failed to generate SOAP note');
    }
  }

  /**
   * Step 3: Extract problems using Zero-Shot Chain-of-Thought
   */
  async extractProblems(soapNote: any): Promise<{ result: any[], prompt: string, response: string }> {
    const prompt = `You are a clinical documentation specialist. Extract all medical problems from this SOAP note.

SOAP NOTE:
${JSON.stringify(soapNote, null, 2)}

IMPORTANT INSTRUCTIONS:
1. Extract ONLY the actual medical problems/diagnoses
2. Be specific and use proper medical terminology
3. Include both primary diagnoses and secondary conditions
4. Include symptoms that represent distinct clinical problems
5. DO NOT include normal findings or non-problems

Analyze each section systematically:

From SUBJECTIVE: Identify chief complaints and reported symptoms
From OBJECTIVE: Identify abnormal findings and positive test results
From ASSESSMENT: Extract diagnosed conditions
From PLAN: Identify any problems being treated

For each problem found, provide:
- A concise, medically accurate description
- The clinical evidence supporting it
- Which section(s) of the SOAP note it came from

Return ONLY a valid JSON array (no markdown, no code blocks, no explanatory text):
[
  {
    "description": "[Specific medical problem/diagnosis]",
    "rationale": "[Clinical evidence from SOAP note]",
    "source": "[Section: Subjective/Objective/Assessment/Plan]"
  }
]

EXAMPLE OUTPUT (for a patient with multiple conditions):
[
  {
    "description": "Community-acquired pneumonia",
    "rationale": "Cough with yellowish sputum, fever, crackles in lower right lung",
    "source": "Subjective, Objective, Assessment"
  },
  {
    "description": "Hypertension, uncontrolled",
    "rationale": "BP reading 150/95, patient reports not taking medications regularly",
    "source": "Objective, Subjective"
  },
  {
    "description": "Type 2 diabetes mellitus",
    "rationale": "HbA1c 8.5%, patient on metformin",
    "source": "Objective, Plan"
  }
]

IMPORTANT: Extract ALL problems found, not just the primary one. Most encounters have 2-4 problems.

Return ONLY the JSON array. Do not wrap in markdown code blocks. Do not add any text before or after the JSON.`;

    try {
      const result = await this.executeWithFallback(prompt);
      const text = result.response.text();

      // Extract JSON array from the response - handle cases where model adds extra text
      let jsonStr = text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const cleanedText = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      return {
        result: JSON.parse(cleanedText),
        prompt: prompt,
        response: text
      };
    } catch (error: any) {
      console.error('Problem extraction failed:', error);
      return {
        result: [],
        prompt: prompt,
        response: error.message
      };
    }
  }

  /**
   * Step 4: Generate ICD-10-AM codes for Australian healthcare
   */
  async generateICD10Codes(problems: any[]): Promise<{ result: any[], prompt: string, response: string }> {
    const prompt = `You are an expert medical coder. Assign accurate ICD-10-AM codes to these diagnoses.

MEDICAL PROBLEMS TO CODE:
${JSON.stringify(problems, null, 2)}

CODING INSTRUCTIONS:
1. Use the most specific ICD-10-AM code available
2. Follow proper code format (Letter + 2-7 digits, with decimal after 3rd character)
3. Consider these common Australian codes:
   - J18.9: Pneumonia, unspecified
   - J20.9: Acute bronchitis, unspecified
   - I10: Essential (primary) hypertension
   - E11.9: Type 2 diabetes mellitus without complications
   - R51: Headache
   - R05: Cough
   - R06.02: Shortness of breath
   - R50.9: Fever, unspecified
   - J06.9: Acute upper respiratory infection, unspecified
   - M79.3: Myalgia
   - R52: Pain, unspecified
   - K21.9: Gastro-oesophageal reflux disease without oesophagitis
   - F41.9: Anxiety disorder, unspecified
   - F32.9: Depressive episode, unspecified

4. For each problem:
   - Match to the most appropriate ICD-10-AM code
   - Provide the full code description
   - Rate your confidence based on specificity match

Return ONLY a valid JSON array (no markdown, no code blocks, no explanatory text):
[
  {
    "problem": "[exact problem text from input]",
    "code": "[ICD-10-AM code with proper format]",
    "description": "[Official ICD-10-AM description]",
    "confidence": "high" or "medium" or "low"
  }
]

EXAMPLE OUTPUT (for multiple problems):
[
  {
    "problem": "Community-acquired pneumonia",
    "code": "J18.9",
    "description": "Pneumonia, unspecified organism",
    "confidence": "high"
  },
  {
    "problem": "Hypertension, uncontrolled",
    "code": "I10",
    "description": "Essential (primary) hypertension",
    "confidence": "high"
  },
  {
    "problem": "Type 2 diabetes mellitus",
    "code": "E11.9",
    "description": "Type 2 diabetes mellitus without complications",
    "confidence": "high"
  }
]

IMPORTANT: Generate codes for ALL problems provided, not just one. Each problem should have its own ICD-10-AM code.

Return ONLY the JSON array. Do not wrap in markdown code blocks. Do not add any text before or after the JSON.`;

    try {
      const result = await this.executeWithFallback(prompt);
      const text = result.response.text();

      // Extract JSON array from the response - handle cases where model adds extra text
      let jsonStr = text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const cleanedText = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      return {
        result: JSON.parse(cleanedText),
        prompt: prompt,
        response: text
      };
    } catch (error: any) {
      console.error('ICD-10 generation failed:', error);
      return {
        result: [],
        prompt: prompt,
        response: error.message
      };
    }
  }

  /**
   * Step 5: Generate MBS billing codes for Australian healthcare
   */
  async generateBillingCodes(soapNote: any, problems: any[]): Promise<{ result: any, prompt: string, response: string }> {
    const prompt = `Based on this encounter, suggest appropriate MBS (Medicare Benefits Schedule) item numbers for Australian billing.

SOAP NOTE:
${JSON.stringify(soapNote, null, 2)}

PROBLEMS ADDRESSED:
${JSON.stringify(problems, null, 2)}

Using Australian MBS billing criteria:

Step 1 - Consultation Type:
- Is this a GP, specialist, or allied health consultation?
- New patient or existing patient?

Step 2 - Consultation Complexity/Duration:
- Brief (<6 mins): Item 3
- Standard (6-20 mins): Items 23 (Level B)
- Long (20-40 mins): Item 36 (Level C)
- Prolonged (40+ mins): Item 44 (Level D)
- Complex/lengthy (60+ mins): Item 47 (Level E)

Step 3 - Additional Services:
- Mental health items (2700 series)
- Chronic disease management (721, 723, 732)
- Health assessments (701-707)
- Procedural items if applicable

Step 4 - Bulk Billing Incentives:
- Consider items 10990/10991 for bulk billing incentives

Based on this analysis, respond with ONLY a valid JSON object (no markdown, no code blocks, no explanatory text):
{
  "consultationLevel": {
    "mbsItem": "MBS item number",
    "description": "Consultation type description",
    "duration": "Estimated consultation duration",
    "justification": "Based on complexity and time",
    "confidence": "high/medium/low"
  },
  "additionalMbsItems": [
    {
      "mbsItem": "MBS item number",
      "description": "Service description",
      "justification": "Why this item applies",
      "confidence": "high/medium/low"
    }
  ],
  "billingHint": "Additional Medicare billing considerations or restrictions"
}

IMPORTANT: Return ONLY the JSON object. Do not wrap in markdown code blocks. Do not add any text before or after the JSON.`;

    try {
      const result = await this.executeWithFallback(prompt);
      const text = result.response.text();

      let parsed: any;

      try {
        // First, clean the entire response text
        let cleanedText = text
          .replace(/```json\s*/gi, '')  // Remove ```json
          .replace(/```\s*/gi, '')       // Remove ```
          .trim();

        // Method 1: Try direct JSON parse
        try {
          parsed = JSON.parse(cleanedText);
        } catch (directError) {
          // Method 2: Extract JSON object from the response
          const jsonObjectMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            let jsonStr = jsonObjectMatch[0];

            // Fix common JSON issues
            jsonStr = jsonStr
              .replace(/,\s*}/g, '}')  // Remove trailing commas
              .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
              .replace(/\\n/g, ' ')    // Replace literal \n with spaces
              .replace(/\n/g, ' ')     // Replace newlines with spaces
              .trim();

            parsed = JSON.parse(jsonStr);
          } else {
            throw new Error('No JSON object found in response');
          }
        }
      } catch (parseError) {
        // Method 2: Try alternative parsing approaches
        try {
          // Remove all non-JSON content
          const cleanText = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .replace(/^[\s\S]*?(\{)/m, '$1')  // Keep from first {
            .replace(/(\})[\s\S]*$/m, '$1')   // Keep until last }
            .trim();

          parsed = JSON.parse(cleanText);
        } catch (secondError) {
          // Method 3: Create a default structure if parsing completely fails
          console.warn('Failed to parse MBS response, using default structure');
          parsed = {
            consultationLevel: {
              mbsItem: "23",
              description: "Standard GP consultation (Level B)",
              duration: "6-20 minutes",
              justification: "Based on encounter complexity",
              confidence: "low"
            },
            additionalMbsItems: [],
            billingHint: "Unable to fully parse AI response - default consultation level suggested"
          };
        }
      }

      // Validate and ensure required fields exist
      if (!parsed.consultationLevel) {
        parsed.consultationLevel = {
          mbsItem: "23",
          description: "Standard consultation",
          duration: "Unknown",
          justification: "Default assignment",
          confidence: "low"
        };
      }

      if (!parsed.additionalMbsItems) {
        parsed.additionalMbsItems = [];
      }

      if (!parsed.billingHint) {
        parsed.billingHint = "Standard billing applies";
      }

      // Transform the response to maintain compatibility with existing code
      return {
        result: {
          emLevel: parsed.consultationLevel,
          cptCodes: parsed.additionalMbsItems || [],
          billingHint: parsed.billingHint
        },
        prompt: prompt,
        response: text
      };
    } catch (error: any) {
      console.error('Billing code generation failed:', error);
      console.error('Response text was:', error.message);

      // Return a safe default structure
      return {
        result: {
          emLevel: {
            mbsItem: "23",
            description: "Standard GP consultation (Level B)",
            duration: "6-20 minutes",
            justification: "Default due to processing error",
            confidence: "low"
          },
          cptCodes: [],
          billingHint: 'MBS billing code generation encountered an error. Please review manually.'
        },
        prompt: prompt,
        response: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Main analysis orchestrator
   */
  async analyzeTranscript(transcript: string): Promise<any> {
    const traceLog: any[] = [];

    try {
      // Step 1: Identify speakers
      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'Speaker Identification',
        technique: 'Chain-of-Thought',
        details: 'Analyzing transcript for speaker roles...'
      });

      const speakerInfo = await this.identifySpeakers(transcript);

      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'Speaker Identification Complete',
        details: `Confidence: ${speakerInfo.result.confidence}`,
        prompt: speakerInfo.prompt,
        response: speakerInfo.response
      });

      // Step 2: Generate SOAP note
      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'SOAP Note Generation',
        technique: 'Few-Shot Prompting',
        details: 'Converting transcript to structured SOAP format...'
      });

      const soapNote = await this.generateSOAPNote(transcript);

      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'SOAP Note Complete',
        details: 'Successfully generated SOAP note',
        prompt: soapNote.prompt,
        response: soapNote.response
      });

      // Step 3: Extract problems
      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'Problem Extraction',
        technique: 'Zero-Shot Chain-of-Thought',
        details: 'Identifying medical problems from SOAP note...'
      });

      const problems = await this.extractProblems(soapNote.result);

      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'Problem Extraction Complete',
        details: `Found ${problems.result.length} problems`,
        prompt: problems.prompt,
        response: problems.response
      });

      // Step 4: Generate ICD-10-AM codes
      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'ICD-10-AM Code Generation',
        technique: 'Heuristic Prompting',
        details: 'Mapping problems to Australian ICD-10-AM codes...'
      });

      const icd10Codes = await this.generateICD10Codes(problems.result);

      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'ICD-10-AM Codes Complete',
        details: `Generated ${icd10Codes.result.length} codes`,
        prompt: icd10Codes.prompt,
        response: icd10Codes.response
      });

      // Step 5: Generate MBS billing codes
      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'MBS Item Generation',
        technique: 'Chain-of-Thought',
        details: 'Determining Medicare consultation level and MBS items...'
      });

      const billingInfo = await this.generateBillingCodes(soapNote.result, problems.result);

      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'MBS Items Complete',
        details: `Consultation Level: ${billingInfo.result.emLevel?.mbsItem || billingInfo.result.emLevel?.code || 'N/A'}`,
        prompt: billingInfo.prompt,
        response: billingInfo.response
      });

      // Compile full response
      const fullResponse = {
        soapNote: soapNote.result,
        problems: problems.result.map((p: any) => ({
          description: p.description,
          rationale: p.rationale
        })),
        icd10Codes: icd10Codes.result.map((code: any) => ({
          code: code.code,
          description: code.description,
          confidence: code.confidence
        })),
        cptCodes: billingInfo.result.cptCodes || [],
        emLevel: billingInfo.result.emLevel,
        billingHint: billingInfo.result.billingHint,
        complianceBanner: 'This is AI-generated documentation for review only. Verify all codes and documentation before use.',
        speakerInfo,
        annotatedTranscript: speakerInfo.result.annotatedTranscript
      };

      const guardedResponse = await GuardrailsService.applyGuardrails(fullResponse, transcript);

      // Add detailed guardrail actions to trace log
      const guardrailDetails = guardedResponse.guardrailActions
        ? guardedResponse.guardrailActions.join('\n')
        : 'Standard safety checks applied';

      traceLog.push({
        timestamp: new Date().toISOString(),
        step: 'Guardrails Applied',
        technique: 'Safety & Compliance Checks',
        details: guardrailDetails,
        response: `Emergency: ${guardedResponse.hasEmergencyKeywords ? 'Yes' : 'No'} | Severity: ${guardedResponse.emergencySeverity || 'N/A'}`
      });

      // Add trace log and return
      guardedResponse.traceLog = traceLog;
      guardedResponse.transcript = transcript;

      return guardedResponse;

    } catch (error: any) {
      console.error('LLM Service Error:', error);
      throw {
        error: 'Failed to analyze transcript',
        details: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        traceLog
      };
    }
  }

  /**
   * Test the LLM connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeWithFallback('Say "OK" if you can read this.');
      return result.response.text().includes('OK');
    } catch (error) {
      console.error('LLM connection test failed:', error);
      return false;
    }
  }
}