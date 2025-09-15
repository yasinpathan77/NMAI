import axios from 'axios';
import type { AnalysisResult, AnalyzeRequest } from '../../../shared/types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // Will be proxied to http://localhost:5001 via Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Analyze a medical transcript
 */
export async function analyzeTranscript(
  transcript: string,
  acknowledgeEmergency?: boolean
): Promise<AnalysisResult> {
  const payload: AnalyzeRequest = {
    transcript,
    acknowledgeEmergency,
  };

  const response = await api.post<AnalysisResult>('/analyze', payload);
  return response.data;
}

/**
 * Get the last analysis session
 */
export async function getLastSession(): Promise<{ result: AnalysisResult } | null> {
  try {
    const response = await api.get('/session/last');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: string): Promise<AnalysisResult | null> {
  try {
    const response = await api.get(`/session/${sessionId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Upload a transcript file
 */
export async function uploadTranscriptFile(file: File): Promise<{ transcript: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Get health status of the backend
 */
export async function getHealthStatus(): Promise<{
  status: string;
  services: {
    llm: string;
    database: string;
  };
}> {
  const response = await api.get('/health');
  return response.data;
}

export default api;