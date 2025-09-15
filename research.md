# Clinical Documentation Assistant - Research Overview

This AI-powered clinical documentation system leverages Google's Gemini 1.5 Flash/Pro models with advanced prompting techniques including Chain-of-Thought for speaker identification, Few-Shot Prompting for SOAP note generation, and Zero-Shot CoT for problem extraction to transform medical transcripts into structured clinical documentation. The application generates SOAP notes, ICD-10-AM diagnoses, and MBS (Medicare Benefits Schedule) item numbers specifically tailored for the Australian healthcare system.

The implementation incorporates Australian medical coding standards through programmatic rules embedded in the LLM prompts: ICD-10-AM (Australian Modification) coding with specific attention to Australian Coding Standards (ACS) for diagnosis classification, MBS item numbers for GP consultations including Level B (Item 23, 6-20 mins), Level C (Item 36, 20-40 mins), Level D (Item 44, 40+ mins), and Level E (Item 47, 60+ mins), along with mental health items (2700 series) and chronic disease management codes (721, 723, 732). Emergency detection guardrails monitor for critical keywords like "chest pain," "suicide," and "unconscious" to ensure patient safety, while the system maintains privacy-compliant data handling with session-based SQLite storage and automatic 24-hour data expiration.


https://www.ihacpa.gov.au/sites/default/files/2022-08/icd-10-am_chronicle_-_eleventh_edition.pdf

https://www.aapc.com/resources/what-are-e-m-codes
