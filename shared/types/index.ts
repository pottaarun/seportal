// Shared types across Pages and Workers

export interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  COLLAB?: DurableObjectNamespace;
  API_WORKER?: Fetcher;
  CRON_WORKER?: Fetcher;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'active' | 'inactive' | 'trial';
  created_at: string;
  updated_at: string;
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  user_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AnalyticsStats {
  total_events: number;
  unique_users: number;
  period_start: string;
  period_end: string;
}

// Webhook types
export interface WebhookPayload {
  source: 'salesforce' | 'slack' | 'custom';
  event_type: string;
  data: Record<string, any>;
  received_at: string;
}

// Collaboration types
export interface CollabMessage {
  type: 'init' | 'update' | 'cursor' | 'participant_joined' | 'participant_left';
  payload?: any;
  user_id?: string;
  timestamp?: string;
}

export interface CollabState {
  participants: number;
  lastUpdate?: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Cron job types
export interface CronJobResult {
  job_name: string;
  status: 'success' | 'failed';
  executed_at: string;
  duration_ms?: number;
  error?: string;
}

export interface HealthCheck {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    db: boolean;
    kv: boolean;
    r2?: boolean;
  };
}
