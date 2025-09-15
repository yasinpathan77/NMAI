import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { AnalyzeRequestSchema } from './schemas/validation.js';
import { LLMService } from './services/llm.js';
import DatabaseService from './services/database.js';
import { GuardrailsService } from './services/guardrails.js';

// Load environment variables
dotenv.config();

// Initialize services
const llmService = new LLMService(process.env.GEMINI_API_KEY || '');
const dbService = new DatabaseService();

// Create Fastify instance
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development'
    ? {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true
          }
        }
      }
    : true
});

// Register plugins
await fastify.register(cors, {
  origin: true, // Allow all origins in development
  credentials: true
});

await fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 // 5KB limit for transcript files
  }
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  const llmConnected = await llmService.testConnection();
  const dbStats = await dbService.getStats();

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      llm: llmConnected ? 'connected' : 'disconnected',
      database: 'connected'
    },
    stats: dbStats
  };
});

// Main analyze endpoint
fastify.post('/analyze', async (request, reply) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedRequest = AnalyzeRequestSchema.parse(request.body);
    const { transcript, acknowledgeEmergency } = validatedRequest;

    // Check for emergency situations using AI
    const emergencyCheck = await GuardrailsService.checkEmergencyKeywords(transcript);

    // If emergency keywords found and not acknowledged, require acknowledgment
    if (emergencyCheck.hasEmergency && !acknowledgeEmergency) {
      return reply.code(400).send({
        error: 'Emergency situation detected',
        message: `${emergencyCheck.recommendation}. Please acknowledge that this is not a triage tool.`,
        emergencyKeywords: emergencyCheck.detectedKeywords,
        severity: emergencyCheck.severity,
        requiresAcknowledgment: true
      });
    }

    // Log the analysis request
    await dbService.logAudit({
      action: 'ANALYSIS_REQUESTED',
      userIp: request.ip,
      userAgent: request.headers['user-agent'],
      details: `Transcript length: ${transcript.length}, Emergency: ${emergencyCheck.hasEmergency}, Severity: ${emergencyCheck.severity}`
    });

    // Analyze transcript with LLM
    fastify.log.info('Analyzing transcript...');
    const analysisResult = await llmService.analyzeTranscript(transcript);

    // Generate session ID
    const sessionId = uuidv4();

    // Add metadata to result
    const completeResult = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      transcript,
      ...analysisResult
    };

    // Save to database
    await dbService.saveSession({
      id: sessionId,
      transcript,
      result: completeResult,
      hasEmergency: emergencyCheck.hasEmergency
    });

    // Save metrics
    const processingTime = Date.now() - startTime;
    await dbService.saveMetrics({
      sessionId,
      processingTimeMs: processingTime,
      transcriptLength: transcript.length,
      numProblemsFound: analysisResult.problems?.length || 0,
      numIcd10Codes: analysisResult.icd10Codes?.length || 0,
      numCptCodes: analysisResult.cptCodes?.length || 0
    });

    fastify.log.info(`Analysis completed in ${processingTime}ms`);

    return completeResult;

  } catch (error: any) {
    fastify.log.error('Analysis error:', error);

    // Log error
    await dbService.logAudit({
      action: 'ANALYSIS_ERROR',
      userIp: request.ip,
      userAgent: request.headers['user-agent'],
      details: error.message
    });

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.errors
      });
    }

    // Handle other errors
    return reply.code(500).send({
      error: 'Analysis failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Get last session endpoint
fastify.get('/session/last', async (request, reply) => {
  try {
    const lastSession = await dbService.getLastSession();

    if (!lastSession) {
      return reply.code(404).send({
        error: 'No sessions found'
      });
    }

    return lastSession;

  } catch (error: any) {
    fastify.log.error('Error retrieving last session:', error);
    return reply.code(500).send({
      error: 'Failed to retrieve session',
      message: error.message
    });
  }
});

// Get specific session endpoint
fastify.get('/session/:id', async (request: any, reply) => {
  try {
    const { id } = request.params;
    const session = await dbService.getSession(id);

    if (!session) {
      return reply.code(404).send({
        error: 'Session not found'
      });
    }

    return session;

  } catch (error: any) {
    fastify.log.error('Error retrieving session:', error);
    return reply.code(500).send({
      error: 'Failed to retrieve session',
      message: error.message
    });
  }
});

// Get all sessions endpoint (with pagination)
fastify.get('/sessions', async (request: any, reply) => {
  try {
    const { limit = 10, offset = 0 } = request.query;
    const sessions = await dbService.getAllSessions(
      parseInt(limit),
      parseInt(offset)
    );

    return {
      sessions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: sessions.length
      }
    };

  } catch (error: any) {
    fastify.log.error('Error retrieving sessions:', error);
    return reply.code(500).send({
      error: 'Failed to retrieve sessions',
      message: error.message
    });
  }
});

// File upload endpoint for transcripts
fastify.post('/upload', async (request, reply) => {
  try {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        error: 'No file uploaded'
      });
    }

    // Check file type
    if (!data.filename.endsWith('.txt')) {
      return reply.code(400).send({
        error: 'Invalid file type',
        message: 'Only .txt files are allowed'
      });
    }

    // Read file content
    const buffer = await data.toBuffer();
    const transcript = buffer.toString('utf-8');

    // Check file size (should be < 5KB)
    if (transcript.length > 5000) {
      return reply.code(400).send({
        error: 'File too large',
        message: 'Transcript must be less than 5KB'
      });
    }

    // Return the transcript for processing
    return {
      filename: data.filename,
      transcript,
      size: transcript.length
    };

  } catch (error: any) {
    fastify.log.error('Upload error:', error);
    return reply.code(500).send({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '5000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`
🏥 Clinical Note & Coding Assistant Backend
📡 Server running at http://localhost:${port}
🔥 Environment: ${process.env.NODE_ENV || 'development'}
✅ Health check: http://localhost:${port}/health

Available endpoints:
- POST /analyze - Analyze a transcript
- POST /upload - Upload a transcript file
- GET /session/last - Get the last session
- GET /session/:id - Get a specific session
- GET /sessions - Get all sessions (paginated)
    `);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await fastify.close();
  await dbService.close();
  process.exit(0);
});

// Start the server
start();