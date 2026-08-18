import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export interface QuotaStatus {
  userId: string;
  tokensToday: number;
  tokensWeek: number;
  tokensMonth: number;
  maxTokensDay: number;
  maxTokensWeek: number;
  maxTokensMonth: number;
  warningThresholdPct: number;
  limitEnabled: boolean;
  status: 'ok' | 'warning' | 'exceeded';
  percentUsed: number;
}

/**
 * Checks user token quota against the GoClaw PostgreSQL database.
 * Reads from the same tables that the Quota Dashboard uses.
 */
@Injectable()
export class QuotaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuotaService.name);
  private pool: Pool | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('GOCLAW_DB_HOST');
    if (!host) {
      this.logger.warn('GOCLAW_DB_HOST not set — quota checks disabled');
      return;
    }

    this.pool = new Pool({
      host,
      port: parseInt(this.config.get<string>('GOCLAW_DB_PORT') || '5433', 10),
      database: this.config.get<string>('GOCLAW_DB_NAME') || 'postgres',
      user: this.config.get<string>('GOCLAW_DB_USER') || 'postgres',
      password: this.config.get<string>('GOCLAW_DB_PASSWORD') || 'goclaw',
      max: 3,
      idleTimeoutMillis: 30000,
    });

    this.logger.log(`Quota checker connected to GoClaw DB at ${host}:${this.config.get('GOCLAW_DB_PORT')}`);
  }

  onModuleDestroy() {
    if (this.pool) {
      this.pool.end();
    }
  }

  /**
   * Check if a user has exceeded their token quota.
   * The goclawUserId should be in format "aitm_<userId>"
   */
  async checkQuota(goclawUserId: string): Promise<QuotaStatus> {
    const defaultResult: QuotaStatus = {
      userId: goclawUserId,
      tokensToday: 0,
      tokensWeek: 0,
      tokensMonth: 0,
      maxTokensDay: 0,
      maxTokensWeek: 0,
      maxTokensMonth: 0,
      warningThresholdPct: 80,
      limitEnabled: false,
      status: 'ok',
      percentUsed: 0,
    };

    if (!this.pool) return defaultResult;

    try {
      const { rows } = await this.pool.query(`
        SELECT
          ul.max_tokens_day,
          ul.max_tokens_week,
          ul.max_tokens_month,
          ul.warning_threshold_pct,
          ul.enabled,
          COALESCE(d.tokens, 0)::bigint AS tokens_today,
          COALESCE(w.tokens, 0)::bigint AS tokens_week,
          COALESCE(m.tokens, 0)::bigint AS tokens_month
        FROM user_token_limits ul
        LEFT JOIN (
          SELECT user_id, SUM(total_input_tokens + total_output_tokens) AS tokens
          FROM traces WHERE parent_trace_id IS NULL AND user_id IS NOT NULL
            AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
          GROUP BY user_id
        ) d ON d.user_id = ul.user_id
        LEFT JOIN (
          SELECT user_id, SUM(total_input_tokens + total_output_tokens) AS tokens
          FROM traces WHERE parent_trace_id IS NULL AND user_id IS NOT NULL
            AND created_at >= date_trunc('week', NOW() AT TIME ZONE 'UTC')
          GROUP BY user_id
        ) w ON w.user_id = ul.user_id
        LEFT JOIN (
          SELECT user_id, SUM(total_input_tokens + total_output_tokens) AS tokens
          FROM traces WHERE parent_trace_id IS NULL AND user_id IS NOT NULL
            AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
          GROUP BY user_id
        ) m ON m.user_id = ul.user_id
        WHERE ul.user_id = $1
      `, [goclawUserId]);

      if (rows.length === 0) {
        // No limits set for this user — allow freely
        // Also fetch usage even without limits
        const usageResult = await this.pool.query(`
          SELECT COALESCE(SUM(total_input_tokens + total_output_tokens), 0)::bigint AS tokens_today
          FROM traces
          WHERE parent_trace_id IS NULL
            AND user_id = $1
            AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
        `, [goclawUserId]);

        return {
          ...defaultResult,
          tokensToday: Number(usageResult.rows[0]?.tokens_today || 0),
        };
      }

      const row = rows[0];
      const tokensToday = Number(row.tokens_today);
      const tokensWeek = Number(row.tokens_week);
      const tokensMonth = Number(row.tokens_month);
      const maxDay = Number(row.max_tokens_day || 0);
      const maxWeek = Number(row.max_tokens_week || 0);
      const maxMonth = Number(row.max_tokens_month || 0);
      const warningPct = Number(row.warning_threshold_pct || 80);
      const enabled = row.enabled;

      let status: 'ok' | 'warning' | 'exceeded' = 'ok';
      let percentUsed = 0;

      if (enabled) {
        // Check exceeded
        if ((maxDay > 0 && tokensToday >= maxDay) ||
            (maxWeek > 0 && tokensWeek >= maxWeek) ||
            (maxMonth > 0 && tokensMonth >= maxMonth)) {
          status = 'exceeded';
        }
        // Check warning
        else if ((maxDay > 0 && tokensToday >= maxDay * warningPct / 100) ||
                 (maxWeek > 0 && tokensWeek >= maxWeek * warningPct / 100) ||
                 (maxMonth > 0 && tokensMonth >= maxMonth * warningPct / 100)) {
          status = 'warning';
        }

        // Calculate percent used (based on daily limit as primary)
        if (maxDay > 0) {
          percentUsed = Math.min(100, Math.round((tokensToday / maxDay) * 100));
        } else if (maxWeek > 0) {
          percentUsed = Math.min(100, Math.round((tokensWeek / maxWeek) * 100));
        } else if (maxMonth > 0) {
          percentUsed = Math.min(100, Math.round((tokensMonth / maxMonth) * 100));
        }
      }

      return {
        userId: goclawUserId,
        tokensToday,
        tokensWeek,
        tokensMonth,
        maxTokensDay: maxDay,
        maxTokensWeek: maxWeek,
        maxTokensMonth: maxMonth,
        warningThresholdPct: warningPct,
        limitEnabled: enabled,
        status,
        percentUsed,
      };
    } catch (err) {
      this.logger.error(`Quota check failed for ${goclawUserId}: ${err}`);
      return defaultResult;
    }
  }
}
