import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MessageQuotaWindowState {
  enabled: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  pct: number;
  freesAt: string | null;
}

export interface MessageQuotaPreflight {
  allowed: boolean;
  reason?: string;
  details?: {
    window?: 'fiveHour' | 'week';
    used?: number;
    limit?: number;
    freesAt?: string | null;
  } | null;
  hasMessageQuota?: boolean;
  usedMessages?: number;
  planMessages?: number | null;
  planName?: string | null;
  totalRemainingMessages?: number | null;
  periodEnd?: string | null;
  windows?: {
    fiveHour?: MessageQuotaWindowState;
    week?: MessageQuotaWindowState;
  } | null;
}

export interface CompanyMessageLimits {
  fiveHourEnabled: boolean;
  fiveHourLimit?: number | null;
  weekEnabled: boolean;
  weekLimit?: number | null;
}

/**
 * Server-to-server client for the LLM Usage Dashboard internal API.
 * The dashboard stays sysadmin-only; the backend proxies HR-facing
 * quota info and enforces the message quota on the chat path.
 */
@Injectable()
export class LlmDashboardService {
  private readonly logger = new Logger(LlmDashboardService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return (this.config.get<string>('LLM_DASHBOARD_URL') || '').replace(/\/+$/, '');
  }

  private get internalKey(): string {
    return this.config.get<string>('LLM_DASHBOARD_INTERNAL_KEY') || '';
  }

  private get enabled(): boolean {
    return !!this.baseUrl && !!this.internalKey;
  }

  private async post<T = any>(path: string, body: Record<string, unknown>): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service': 'backend',
          'x-internal-key': this.internalKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Dashboard ${path} responded ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      this.logger.warn(`Dashboard ${path} unreachable: ${err.message}`);
      return null;
    }
  }

  private async put<T = any>(path: string, body: Record<string, unknown>): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-internal-service': 'backend',
          'x-internal-key': this.internalKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Dashboard ${path} responded ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      this.logger.warn(`Dashboard ${path} unreachable: ${err.message}`);
      return null;
    }
  }

  private async get<T = any>(path: string): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'x-internal-service': 'backend',
          'x-internal-key': this.internalKey,
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Dashboard ${path} responded ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      this.logger.warn(`Dashboard ${path} unreachable: ${err.message}`);
      return null;
    }
  }

  private async delete<T = any>(path: string, body?: Record<string, unknown>): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          'x-internal-service': 'backend',
          'x-internal-key': this.internalKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Dashboard ${path} responded ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      this.logger.warn(`Dashboard ${path} unreachable: ${err.message}`);
      return null;
    }
  }

  /**
   * Message-quota preflight for the chat path. Fails open when the
   * dashboard is unreachable so chat availability is preserved.
   */
  async preflight(userId: string): Promise<MessageQuotaPreflight> {
    const res = await this.post('/api/internal/preflight', {
      userId,
      sourceService: 'BACKEND',
    });
    if (!res) return { allowed: true };
    return {
      allowed: !!res.allowed,
      reason: res.reason || undefined,
      details: res.details || null,
      hasMessageQuota: !!res.hasMessageQuota,
      usedMessages: res.usedMessages ?? 0,
      planMessages: res.planMessages ?? null,
      planName: res.planName || null,
      totalRemainingMessages: res.totalRemainingMessages ?? null,
      periodEnd: res.periodEnd || null,
      windows: res.windows || null,
    };
  }

  /**
   * Write a provisional chat-message marker so back-to-back sends are counted
   * before the dashboard's GoClaw trace sync (30s cron) lands. The sync
   * consumes the marker FIFO when the real trace arrives; stale markers are
   * purged after 5 minutes. Fire-and-forget: a failed marker must never break
   * the send itself (worst case the burst gap reopens for one message).
   */
  async recordPendingMessage(userId: string, requestId: string): Promise<void> {
    await this.post('/api/internal/events', {
      userId,
      sourceService: 'BACKEND',
      featureName: 'goclaw_chat',
      status: 'PENDING',
      requestId,
      totalTokens: 0,
    });
  }

  /**
   * Write the company's rolling message limits (5h / 1w). Caller must
   * already be authorized as the company's HR admin.
   */
  async updateCompanyLimits(
    companyId: string,
    limits: CompanyMessageLimits,
    updatedBy: string,
  ): Promise<any | null> {
    return this.put('/api/internal/company-limits', { companyId, ...limits, updatedBy });
  }

  /**
   * HR-facing plan/quota summary (plan tier, message usage, members).
   */
  async getQuotaSummary(userId: string): Promise<any | null> {
    return this.post('/api/internal/quota-summary', { userId });
  }

  /**
   * Drop a removed member's mapping and hand their standalone account the
   * Demo Trial plan. Caller has already unlinked them in AITM.
   */
  async unlinkMember(
    userId: string,
  ): Promise<{ unlinked: boolean; demoPlanAssigned: boolean; planName: string | null } | null> {
    return this.post('/api/internal/member-unlink', { userId });
  }

  /**
   * Plan seat allocation: get allocated seats and plan limits for a company.
   */
  async getCompanyPlanSeats(companyId: string): Promise<any | null> {
    return this.get(`/api/internal/company/${companyId}/plan-seats`);
  }

  /**
   * Allocate a company AI plan seat to an employee.
   */
  async allocateCompanyPlanSeat(companyId: string, userId: string, actorUserId: string): Promise<any> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/internal/company/${companyId}/plan-seats`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service': 'backend',
          'x-internal-key': this.internalKey,
        },
        body: JSON.stringify({ userId, actorUserId }),
        signal: AbortSignal.timeout(5000),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        return { error: data?.error || 'FAILED', message: data?.message || `Dashboard responded ${res.status}`, status: res.status };
      }
      return data;
    } catch (err: any) {
      return { error: 'UNREACHABLE', message: err.message, status: 500 };
    }
  }

  /**
   * Revoke an employee's company AI plan seat.
   */
  async revokeCompanyPlanSeat(companyId: string, userId: string, actorUserId: string): Promise<any> {
    return this.delete(`/api/internal/company/${companyId}/plan-seats/${userId}`, { actorUserId });
  }
}
