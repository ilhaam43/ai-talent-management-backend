import { Controller, Get, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming generic auth guard exists
// import { Role } from '../common/enums/role.enum'; // If roles are needed
// import { Roles } from '../common/decorators/roles.decorator';

@Controller("dashboard")
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
}
