import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles('HUMAN RESOURCES', 'ADMIN')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("insights")
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
