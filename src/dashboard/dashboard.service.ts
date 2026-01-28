import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getInsights() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getCounts = async (model: any, where: any = {}) => {
      const total = await model.count({ where });
      const previous = await model.count({
        where: {
          ...where,
          createdAt: {
            lt: today,
          },
        },
      });
      return { total, previous };
    };

    const candidates = await getCounts(this.prisma.candidate);

    const pass = await getCounts(this.prisma.candidateApplication, {
      aiMatchStatus: "STRONG_MATCH" as any,
    });

    const partial = await getCounts(this.prisma.candidateApplication, {
      aiMatchStatus: "MATCH" as any,
    });

    const notPass = await getCounts(this.prisma.candidateApplication, {
      aiMatchStatus: "NOT_MATCH" as any,
    });

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "100%" : "0%";
      const growth = ((current - previous) / previous) * 100;
      return `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`;
    };

    return [
      {
        title: "Total Candidate",
        number: candidates.total.toLocaleString("id-ID"),
        percentage: calculateGrowth(candidates.total, candidates.previous),
        variant: 0,
      },
      {
        title: "Pass Candidate",
        number: pass.total.toLocaleString("id-ID"),
        percentage: calculateGrowth(pass.total, pass.previous),
        variant: 1,
      },
      {
        title: "Partially Pass",
        number: partial.total.toLocaleString("id-ID"),
        percentage: calculateGrowth(partial.total, partial.previous),
        variant: 2,
      },
      {
        title: "Not Pass",
        number: notPass.total.toLocaleString("id-ID"),
        percentage: calculateGrowth(notPass.total, notPass.previous),
        variant: 3,
      },
    ];
  }

  async getRecruitmentCharts() {
    // 1. Pie Chart: Vacancy Status
    // Mapping: OPEN -> In Progress, DRAFT -> Hold, CLOSED -> Done
    const getStatusCount = async (statusName: string) => {
      return this.prisma.jobVacancy.count({
        where: {
          jobVacancyStatus: {
            jobVacancyStatus: statusName,
          },
        },
      });
    };

    const inProgress = await getStatusCount("OPEN");
    const hold = await getStatusCount("DRAFT");
    const done = await getStatusCount("CLOSED");

    const pieData = [
      { name: "In Progress", value: inProgress, color: "#0B3983" },
      { name: "Hold", value: hold, color: "#9CA3AF" },
      { name: "Done", value: done, color: "#3D42DF" },
    ];

    // 2. Bar Chart: Reasons by Year
    // Fetch all vacancies with reason and createdAt
    const vacancies = await this.prisma.jobVacancy.findMany({
      select: {
        createdAt: true,
        jobVacancyReason: {
          select: { reason: true },
        },
      },
    });

    const years = new Set<number>();
    vacancies.forEach((v) => years.add(v.createdAt.getFullYear()));
    const sortedYears = Array.from(years).sort((a, b) => a - b);

    // If no years, default to current and previous
    if (sortedYears.length === 0) {
      const y = new Date().getFullYear();
      sortedYears.push(y);
    }

    const barData = sortedYears.flatMap((year) => {
      const vYear = vacancies.filter((v) => v.createdAt.getFullYear() === year);

      const replacement = vYear.filter(
        (v) => v.jobVacancyReason.reason === "Replacement",
      ).length;
      const additional = vYear.filter(
        (v) => v.jobVacancyReason.reason !== "Replacement",
      ).length;

      return [
        { name: `Replacement ${year}`, value: replacement },
        { name: `Additional ${year}`, value: additional },
      ];
    });

    return { pieData, barData };
  }

  async getActionCenter(tab: number) {
    let rawData: any[] = [];
    let taskName = "";

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
    };

    if (tab === 0) {
      // Job Role Request (DRAFT Vacancies)
      taskName = "Approval Job Role";
      rawData = await this.prisma.jobVacancy.findMany({
        where: {
          jobVacancyStatus: {
            jobVacancyStatus: "DRAFT",
          },
        },
        include: {
          jobRole: true,
          division: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Application Stages
      let stageNames: string[] = [];
      switch (tab) {
        case 1: // Online Assessment
          taskName = "Send Online Assessment";
          stageNames = ["AI SCREENING", "Online Assessment"];
          break;
        case 2: // Interview
          taskName = "Schedule Interview";
          stageNames = [
            "HR Interview",
            "User Interview",
            "INTERVIEW USER 1",
            "INTERVIEW USER 2",
          ];
          break;
        case 3: // Offer Letter
          taskName = "Prepare Offer Letter";
          stageNames = ["Offering", "Offer Letter"];
          break;
        case 4: // MCU
          taskName = "Schedule MCU";
          stageNames = ["MCU"];
          break;
        case 5: // Onboarding
          taskName = "Onboarding Preparation";
          stageNames = ["Onboarding", "Hired"];
          break;
        default:
          return [];
      }

      rawData = await this.prisma.candidateApplication.findMany({
        where: {
          applicationPipeline: {
            applicationPipeline: { in: stageNames },
          },
        },
        include: {
          jobVacancy: {
            include: {
              jobRole: true,
              division: true,
            },
          },
        },
        orderBy: { submissionDate: "desc" },
      });
    }

    // Transform to Table Format
    return rawData.map((item) => {
      if (tab === 0) {
        // Job Vacancy Item
        const v = item;
        return {
          jobRole: v.jobRole?.jobRoleName || "Unknown Role",
          pic: "HRD", // Hardcoded or derive from creator
          department: v.division?.divisionName || "General",
          task: taskName,
          date: formatDate(v.createdAt),
          actionIcon: "/action_icon.svg",
        };
      } else {
        // Application Item
        const app = item;
        const v = app.jobVacancy;
        return {
          jobRole: v?.jobRole?.jobRoleName || "Unknown Role",
          pic: "HRD",
          department: v?.division?.divisionName || "General",
          task: taskName,
          date: formatDate(app.submissionDate),
          actionIcon: "/action_icon.svg",
        };
      }
    });
  }
}
