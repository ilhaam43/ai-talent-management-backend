import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("dashboard")
@UseGuards(AuthGuard("jwt"))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("insights")
  // @UseGuards(JwtAuthGuard) // Uncomment if auth is required
  async getInsights() {
    return this.dashboardService.getInsights();
  }

  @Get("charts")
  async getCharts() {
    return this.dashboardService.getRecruitmentCharts();
  }

  @Get("action-center")
  async getActionCenter(@Query("tab") tab: string) {
    return this.dashboardService.getActionCenter(Number(tab) || 0);
  }

  @Get("action-center/insights")
  async getActionCenterInsights() {
    return this.dashboardService.getActionCenterInsights();
  }
}
