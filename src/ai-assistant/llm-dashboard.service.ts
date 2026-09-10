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
   * Company headcount against the active plan's member cap. Returns null when
   * the dashboard is unreachable; callers treat null as "no cap info" and fail
   * open rather than blocking HR onboarding during a dashboard outage.
   */
  async getCompanyCap(
    companyId: string,
  ): Promise<{ memberCount: number; maxMembers: number | null; overMemberCap: boolean } | null> {
    return this.post('/api/internal/company-cap', { companyId });
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
}
