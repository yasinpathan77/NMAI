import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseService {
  private db: sqlite3.Database;
  private run: Function;
  private get: Function;
  private all: Function;

  constructor(dbPath?: string) {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Set database path
    const databasePath = dbPath || path.join(dataDir, 'sessions.db');

    // Initialize SQLite database
    this.db = new sqlite3.Database(databasePath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database at:', databasePath);
      }
    });

    // Promisify database methods for async/await
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));

    // Initialize database schema
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   * Creates tables if they don't exist
   */
  private async initializeSchema() {
    try {
      // Main sessions table
      await this.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          transcript TEXT NOT NULL,
          result_json TEXT NOT NULL,
          has_emergency BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Index for faster queries
      await this.run(`
        CREATE INDEX IF NOT EXISTS idx_sessions_timestamp
        ON sessions(timestamp DESC)
      `);

      // Analysis metrics table (for future analytics)
      await this.run(`
        CREATE TABLE IF NOT EXISTS analysis_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          processing_time_ms INTEGER,
          transcript_length INTEGER,
          num_problems_found INTEGER,
          num_icd10_codes INTEGER,
          num_cpt_codes INTEGER,
          llm_model TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
      `);

      // Audit log table (for compliance)
      await this.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          action TEXT NOT NULL,
          user_ip TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          details TEXT
        )
      `);

      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    }
  }

  /**
   * Save a session result
   */
  async saveSession(sessionData: {
    id: string;
    transcript: string;
    result: any;
    hasEmergency?: boolean;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO sessions (id, transcript, result_json, has_emergency)
        VALUES (?, ?, ?, ?)
      `;

      await this.run(
        query,
        sessionData.id,
        sessionData.transcript,
        JSON.stringify(sessionData.result),
        sessionData.hasEmergency ? 1 : 0
      );

      // Log the action
      await this.logAudit({
        sessionId: sessionData.id,
        action: 'SESSION_CREATED',
        details: `Transcript length: ${sessionData.transcript.length}`
      });

      console.log('Session saved successfully:', sessionData.id);
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  /**
   * Get the most recent session
   */
  async getLastSession(): Promise<any | null> {
    try {
      const query = `
        SELECT id, timestamp, transcript, result_json, has_emergency
        FROM sessions
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const row = await this.get(query);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        timestamp: row.timestamp,
        transcript: row.transcript,
        result: JSON.parse(row.result_json),
        hasEmergency: row.has_emergency === 1
      };
    } catch (error) {
      console.error('Error getting last session:', error);
      throw error;
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const query = `
        SELECT id, timestamp, transcript, result_json, has_emergency
        FROM sessions
        WHERE id = ?
      `;

      const row = await this.get(query, sessionId);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        timestamp: row.timestamp,
        transcript: row.transcript,
        result: JSON.parse(row.result_json),
        hasEmergency: row.has_emergency === 1
      };
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions (with pagination)
   */
  async getAllSessions(limit: number = 10, offset: number = 0): Promise<any[]> {
    try {
      const query = `
        SELECT id, timestamp, transcript, result_json, has_emergency
        FROM sessions
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.all(query, limit, offset);

      return rows.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        transcript: row.transcript,
        result: JSON.parse(row.result_json),
        hasEmergency: row.has_emergency === 1
      }));
    } catch (error) {
      console.error('Error getting all sessions:', error);
      throw error;
    }
  }

  /**
   * Save analysis metrics
   */
  async saveMetrics(metrics: {
    sessionId: string;
    processingTimeMs: number;
    transcriptLength: number;
    numProblemsFound: number;
    numIcd10Codes: number;
    numCptCodes: number;
    llmModel?: string;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO analysis_metrics
        (session_id, processing_time_ms, transcript_length,
         num_problems_found, num_icd10_codes, num_cpt_codes, llm_model)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.run(
        query,
        metrics.sessionId,
        metrics.processingTimeMs,
        metrics.transcriptLength,
        metrics.numProblemsFound,
        metrics.numIcd10Codes,
        metrics.numCptCodes,
        metrics.llmModel || 'gemini-1.5-pro'
      );
    } catch (error) {
      console.error('Error saving metrics:', error);
      // Don't throw - metrics are optional
    }
  }

  /**
   * Log audit trail
   */
  async logAudit(audit: {
    sessionId?: string;
    action: string;
    userIp?: string;
    userAgent?: string;
    details?: string;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_log (session_id, action, user_ip, user_agent, details)
        VALUES (?, ?, ?, ?, ?)
      `;

      await this.run(
        query,
        audit.sessionId || null,
        audit.action,
        audit.userIp || null,
        audit.userAgent || null,
        audit.details || null
      );
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't throw - audit logging is optional
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      const totalSessions = await this.get('SELECT COUNT(*) as count FROM sessions');
      const emergencySessions = await this.get('SELECT COUNT(*) as count FROM sessions WHERE has_emergency = 1');
      const avgMetrics = await this.get(`
        SELECT
          AVG(processing_time_ms) as avg_processing_time,
          AVG(transcript_length) as avg_transcript_length,
          AVG(num_problems_found) as avg_problems,
          AVG(num_icd10_codes) as avg_icd10,
          AVG(num_cpt_codes) as avg_cpt
        FROM analysis_metrics
      `);

      return {
        totalSessions: totalSessions.count,
        emergencySessions: emergencySessions.count,
        averageMetrics: avgMetrics
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
export default DatabaseService;