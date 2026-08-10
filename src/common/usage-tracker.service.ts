import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TrackEventParams {
  userId: string;
  featureName: string;
  sourceService?: string;
  workflowName?: string;
  executionId?: string;
  requestId?: string;
  modelName?: string;
  providerName?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costAmount?: number;
  costCurrency?: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  latencyMs?: number;
  metadata?: Record<string, any>;
}

/**
 * UsageTrackerService — Reports usage events to the LLM Usage Dashboard
 * via its internal API (POST /api/internal/events).
 *
 * Fire-and-forget: errors are logged but never thrown so the calling
 * service is never impacted by tracking failures.
 */
@Injectable()
export class UsageTrackerService {
  private readonly logger = new Logger(UsageTrackerService.name);
  private readonly dashboardUrl: string | null;
  private readonly internalKey: string | null;

  constructor(private configService: ConfigService) {
    this.dashboardUrl = this.configService.get<string>('LLM_DASHBOARD_URL') || null;
    this.internalKey = this.configService.get<string>('LLM_DASHBOARD_INTERNAL_KEY') || null;

    if (this.dashboardUrl && this.internalKey) {
      this.logger.log(`UsageTracker enabled → ${this.dashboardUrl}`);
    } else {
      this.logger.warn(
        'UsageTracker DISABLED — set LLM_DASHBOARD_URL and LLM_DASHBOARD_INTERNAL_KEY in .env to enable',
      );
    }
  }

  /**
   * Report a usage event to the LLM Usage Dashboard.
   * This method is fire-and-forget — it will never throw.
   */
  async trackEvent(params: TrackEventParams): Promise<void> {
    if (!this.dashboardUrl || !this.internalKey) {
      return; // silently skip if not configured
    }

    const url = `${this.dashboardUrl}/api/internal/events`;

    const body = {
      userId: params.userId,
      sourceService: params.sourceService || 'BACKEND',
      featureName: params.featureName,
      workflowName: params.workflowName || null,
      executionId: params.executionId || null,
      requestId: params.requestId || `aitm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      modelName: params.modelName || null,
      providerName: params.providerName || null,
      promptTokens: params.promptTokens || 0,
      completionTokens: params.completionTokens || 0,
      totalTokens: params.totalTokens || 0,
      costAmount: params.costAmount || 0,
      costCurrency: params.costCurrency || 'IDR',
      status: params.status,
      latencyMs: params.latencyMs || null,
      metadata: params.metadata || {},
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service': 'backend',
          'x-internal-key': this.internalKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Dashboard returned ${response.status}: ${text}`);
      } else {
        const result: any = await response.json();
        this.logger.debug(
          `Tracked ${params.featureName} for user ${params.userId.slice(0, 8)}… → ${result?.status || 'OK'}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Failed to track event: ${err.message}`);
    }
  }
}
