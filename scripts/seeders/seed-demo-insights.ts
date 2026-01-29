import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Data to populate:
// 4 Strong Match (Pass)
// 3 Match (Partially Pass)
// 2 Not Match (Not Pass)
// Total 9
const candidatesData = [
  {
    name: "Demo User 1",
    score: 95,
    job: "Frontend Engineer",
    stage: "INTERVIEW USER 1",
    // Old data (Yesterday or before)
    date: "2025-11-26",
    created: "2025-11-26T10:00:00.000Z",
    status: "PASSED",
  },
  {
    name: "Demo User 2",
    score: 92,
    job: "Frontend Engineer",
    stage: "AI SCREENING",
    // Old data
    date: "2025-11-25",
    created: "2025-11-25T10:00:00.000Z",
    status: "PASSED",
  },
  {
    name: "Demo User 3", // New data (Today) - Using current date effectively if we want it to be "new" but for seed consistency let's make it dynamic or split dates.
    // However, the test requirement is "show increase". So we need some OLD data and some NEW data.
    // If I hardcode 2025, it is ALL old data compared to NOW (2026).
    // I need relative dates.
    score: 98,
    job: "Backend Engineer",
    stage: "AI SCREENING",
    date: "TODAY",
    created: "TODAY",
    status: "PASSED",
  },
  {
    name: "Demo User 4",
    score: 91,
    job: "Backend Engineer",
    stage: "AI SCREENING",
    date: "TODAY",
    created: "TODAY",
    status: "PASSED",
  },

  {
    name: "Demo User 5",
    score: 75,
    job: "Frontend Engineer",
    stage: "AI SCREENING",
    date: "2025-11-25",
    created: "2025-11-25T10:00:00.000Z",
    status: "PARTIALLY PASSED",
  },
  {
    name: "Demo User 6",
    score: 78,
    job: "Frontend Engineer",
    stage: "INTERVIEW USER 2",
    date: "TODAY",
    created: "TODAY",
    status: "PARTIALLY PASSED",
  },
  {
    name: "Demo User 7",
    score: 72,
    job: "Backend Engineer",
    stage: "AI SCREENING",
    date: "2025-11-25",
    created: "2025-11-25T10:00:00.000Z",
    status: "PARTIALLY PASSED",
  },

  {
    name: "Demo User 8",
    score: 45,
    job: "Frontend Engineer",
    stage: "AI SCREENING",
    date: "2025-11-25",
    created: "2025-11-25T10:00:00.000Z",
    status: "NOT PASSED",
  },
  {
    name: "Demo User 9",
    score: 30,
    job: "Backend Engineer",
    stage: "AI SCREENING",
    date: "TODAY",
    created: "TODAY",
    status: "NOT PASSED",
  },
];

async function main() {
  console.log("🌱 Seeding Demo Insights Data...");

  // 1. Ensure Defaults exists
  const employmentType =
    (await prisma.employmentType.findFirst()) ||
    (await prisma.employmentType.create({
      data: { employmentType: "FULL-TIME" },
    }));
  const position =
    (await prisma.employeePosition.findFirst()) ||
    (await prisma.employeePosition.create({
      data: { employeePosition: "Staff" },
    }));
  const vacancyStatus =
    (await prisma.jobVacancyStatus.findFirst()) ||
    (await prisma.jobVacancyStatus.create({
      data: { jobVacancyStatus: "OPEN" },
    }));
  const duration =
    (await prisma.jobVacancyDuration.findFirst()) ||
    (await prisma.jobVacancyDuration.create({ data: { daysDuration: 30 } }));
  const reason =
    (await prisma.jobVacancyReason.findFirst()) ||
    (await prisma.jobVacancyReason.create({ data: { reason: "New Role" } }));

  const passwordHash = await bcrypt.hash("password123", 10);

  for (const item of candidatesData) {
    console.log(`Processing ${item.name}...`);

    // A. Reference Data: Job Role
    let jobRole = await prisma.jobRole.findFirst({
      where: { jobRoleName: item.job },
    });
    if (!jobRole) {
      jobRole = await prisma.jobRole.create({
        data: { jobRoleName: item.job },
      });
    }

    // B. Reference Data: Job Vacancy
    let vacancy = await prisma.jobVacancy.findFirst({
      where: { jobRoleId: jobRole.id },
    });

    if (!vacancy) {
      vacancy = await prisma.jobVacancy.create({
        data: {
          jobRoleId: jobRole.id,
          employeePositionId: position.id,
          employmentTypeId: employmentType.id,
          jobVacancyStatusId: vacancyStatus.id,
          jobVacancyDurationId: duration.id,
          jobVacancyReasonId: reason.id,
          jobRequirement: `Requirements for ${item.job}`,
          jobDescription: `Description for ${item.job}`,
          jobQualification: `Qualification for ${item.job}`,
          cityLocation: "Jakarta",
          minSalary: 5000000,
          maxSalary: 10000000,
        },
      });
    }

    // C. Reference Data: Pipeline & Status
    let pipeline = await prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: item.stage },
    });
    if (!pipeline) {
      // Create if not exists (simplified)
      pipeline = await prisma.applicationPipeline.create({
        data: { applicationPipeline: item.stage },
      });
    }

    let status = await prisma.applicationLastStatus.findFirst({
      where: { applicationLastStatus: item.status },
    });
    if (!status) {
      status = await prisma.applicationLastStatus.create({
        data: { applicationLastStatus: item.status },
      });
    }

    // D. User & Candidate
    const email = `${item.name.toLowerCase().replace(/\s+/g, ".")}@demo.com`;

    let user = await prisma.user.findUnique({ where: { email } });

    // Determine Dates
    const now = new Date();
    let createdAt = new Date(item.created === "TODAY" ? now : item.created);

    // If it's "TODAY", ensure it is actually later than the "midnight" check in the service
    // Service uses `new Date().setHours(0,0,0,0)`.
    // So distinct past dates (2025) will count as previous. Dates now (2026) will count as "growth".

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: item.name,
          email: email,
          password: passwordHash,
          createdAt: createdAt, // Seed creation time
        },
      });
    }

    let candidate = await prisma.candidate.findFirst({
      where: { userId: user.id },
    });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          userId: user.id,
          candidateFullname: item.name,
          candidateEmail: email,
          createdAt: createdAt, // Seed creation time
        },
      });
    }

    // ... (Salary - assume no need to date this)

    // E. Candidate Salary
    let salary = await prisma.candidateSalary.findFirst({
      where: { candidateId: candidate.id },
    });
    if (!salary) {
      salary = await prisma.candidateSalary.create({
        data: {
          candidateId: candidate.id,
          currentSalary: 5000000,
          expectationSalary: 7000000,
          createdAt: createdAt,
        },
      });
    }

    // F. Application
    const existingApp = await prisma.candidateApplication.findFirst({
      where: {
        candidateId: candidate.id,
        jobVacancyId: vacancy.id,
      },
    });

    const aiMatchStatus =
      item.score >= 90
        ? "STRONG_MATCH"
        : item.score >= 70
          ? "MATCH"
          : "NOT_MATCH";

    if (!existingApp) {
      await prisma.candidateApplication.create({
        data: {
          candidateId: candidate.id,
          jobVacancyId: vacancy.id,
          candidateSalaryId: salary.id,
          applicationPipelineId: pipeline.id,
          applicationLatestStatusId: status.id,
          fitScore: item.score,
          submissionDate: new Date(item.date === "TODAY" ? now : item.date),
          aiInsight: `Demo insight for ${item.name}`,
          aiMatchStatus: aiMatchStatus as any,
          aiInterview: `Demo interview question`,
          aiCoreValue: `Demo values`,
          resultSummary: `Demo summary`,
          createdAt: createdAt, // CRITICAL for Dashboard Service to see it as "Today" vs "Yesterday"
        },
      });
    } else {
      // If updating, we might want to preserve the original createdAt or force update it if we are 'fixing' data.
      // For this task, we want to ensure the createdAt matches our seed intention.
      await prisma.candidateApplication.update({
        where: { id: existingApp.id },
        data: {
          fitScore: item.score,
          aiMatchStatus: aiMatchStatus as any,
          createdAt: createdAt, // Force update creation time to match test scenario
        },
      });
      // Also update Candidate createdAt to ensure Total Candidate consistency
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { createdAt: createdAt },
      });
    }
  }

  // --- Seeding for Charts ---
  console.log("🌱 Seeding Chart Data (Job Vacancies)...");

  const chartVacancies = [
    // 2023
    { status: "CLOSED", reason: "Replacement", year: 2023, count: 1 },

    // 2024
    { status: "CLOSED", reason: "Replacement", year: 2024, count: 34 },
    { status: "CLOSED", reason: "New Position", year: 2024, count: 12 },

    // 2025
    { status: "CLOSED", reason: "Replacement", year: 2025, count: 125 }, // High number for visual
    { status: "CLOSED", reason: "New Position", year: 2025, count: 76 },

    // Current Status Mix (Pie Chart) - Mostly 2025/2026
    { status: "OPEN", reason: "Replacement", year: 2025, count: 48 }, // In Progress
    { status: "DRAFT", reason: "New Position", year: 2025, count: 26 }, // Hold
    // Done is covered by CLOSED above, but let's ensure some are recent
    { status: "CLOSED", reason: "Replacement", year: 2025, count: 20 },
  ];

  for (const group of chartVacancies) {
    console.log(
      `Creating ${group.count} vacancies for ${group.year} - ${group.status} - ${group.reason}`,
    );

    // Get or Create Status
    let statusObj = await prisma.jobVacancyStatus.findFirst({
      where: { jobVacancyStatus: group.status },
    });
    if (!statusObj)
      statusObj = await prisma.jobVacancyStatus.create({
        data: { jobVacancyStatus: group.status },
      });

    // Get or Create Reason
    let reasonObj = await prisma.jobVacancyReason.findFirst({
      where: { reason: group.reason },
    });
    if (!reasonObj)
      reasonObj = await prisma.jobVacancyReason.create({
        data: { reason: group.reason },
      });

    // Defaults
    const employmentType = await prisma.employmentType.findFirst();
    const position = await prisma.employeePosition.findFirst();
    const duration = await prisma.jobVacancyDuration.findFirst();
    // Job Role - Generic
    let jobRole = await prisma.jobRole.findFirst({
      where: { jobRoleName: "Genetic Engineer" },
    });
    if (!jobRole)
      jobRole = await prisma.jobRole.create({
        data: { jobRoleName: "Genetic Engineer" },
      });

    const date = new Date(group.year, 5, 15); // Mid-year

    // Batch create using loop because createMany is not supported nicely with relations in some versions, or just simple loop
    // Optimizing: We can use createMany for speed if we don't need relations returned, but JobVacancy has many relation fields.
    // Safest is simple loop or createMany. JobVacancy usually doesn't have unique constraint issues on non-id fields.

    // To keep it simple and safe:
    await prisma.jobVacancy.createMany({
      data: Array(group.count)
        .fill(null)
        .map(() => ({
          jobRoleId: jobRole!.id,
          employeePositionId: position!.id,
          employmentTypeId: employmentType!.id,
          jobVacancyStatusId: statusObj!.id,
          jobVacancyDurationId: duration!.id,
          jobVacancyReasonId: reasonObj!.id,
        })),
    });
  }

  // --- Seeding for Action Center (Tabs) ---
  console.log("🌱 Seeding Action Center Data...");

  // Tab 0: Job Role Request (DRAFT Vacancies)
  // We need DRAFT vacancies.
  // We already add one DRAFT in chart data, but let's add specific ones for visual verification
  const draftRoles = ["Cloud Architect", "DevOps Engineer", "Security Analyst"];
  const group = await prisma.group.findFirst();
  const division = await prisma.division.findFirst();
  const directorate = await prisma.directorate.findFirst();
  const draftStatus = await prisma.jobVacancyStatus.findFirst({
    where: { jobVacancyStatus: "DRAFT" },
  });

  if (draftStatus) {
    for (const roleName of draftRoles) {
      let rRole = await prisma.jobRole.findFirst({
        where: { jobRoleName: roleName },
      });
      if (!rRole)
        rRole = await prisma.jobRole.create({
          data: { jobRoleName: roleName },
        });

      const employmentType = await prisma.employmentType.findFirst();
      const position = await prisma.employeePosition.findFirst();
      const duration = await prisma.jobVacancyDuration.findFirst();
      const reason = await prisma.jobVacancyReason.findFirst();

      await prisma.jobVacancy.create({
        data: {
          jobRoleId: rRole.id,
          employeePositionId: position!.id,
          employmentTypeId: employmentType!.id,
          jobVacancyStatusId: draftStatus.id,
          jobVacancyDurationId: duration!.id,
          jobVacancyReasonId: reason!.id,
          groupId: group?.id,
          divisionId: division?.id,
          directorateId: directorate?.id,
          createdAt: new Date(),
          cityLocation: "Jakarta",
        },
      });
    }
  }

  // Tab 1-5: Specific Stages
  const actionCenterData = [
    { name: "AC User 1", stage: "Offering", tab: "Offer Letter" },
    { name: "AC User 2", stage: "MCU", tab: "MCU" },
    { name: "AC User 3", stage: "Onboarding", tab: "Onboarding" },
    { name: "AC User 4", stage: "AI SCREENING", tab: "Online Assessment" }, // More for tab 1
    { name: "AC User 5", stage: "HR Interview", tab: "Interview" },
  ];

  for (const acItem of actionCenterData) {
    // Create user/candidate/app
    // Reuse logic or simplified
    const email = `${acItem.name.toLowerCase().replace(/\s+/g, ".")}@ac.demo.com`;

    // 1. User
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      user = await prisma.user.create({
        data: { name: acItem.name, email, password: passwordHash },
      });

    // 2. Candidate
    let candidate = await prisma.candidate.create({
      data: {
        userId: user.id,
        candidateFullname: acItem.name,
        candidateEmail: email,
      },
    });
    let salary = await prisma.candidateSalary.create({
      data: { candidateId: candidate.id },
    });

    // 3. Pipeline
    let pipeline = await prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: acItem.stage },
    });
    if (!pipeline)
      pipeline = await prisma.applicationPipeline.create({
        data: { applicationPipeline: acItem.stage },
      });

    let status = await prisma.applicationLastStatus.findFirst(); // ANY is fine

    // 4. App
    // Use the generic vacancy
    const vacancy = await prisma.jobVacancy.findFirst({
      where: { jobVacancyStatus: { jobVacancyStatus: "OPEN" } },
    });

    if (vacancy) {
      await prisma.candidateApplication.create({
        data: {
          candidateId: candidate.id,
          jobVacancyId: vacancy.id,
          candidateSalaryId: salary.id,
          applicationPipelineId: pipeline.id,
          applicationLatestStatusId: status!.id,
          fitScore: 88,
          submissionDate: new Date(),
          isTalentPool: false,
        },
      });
    }
  }

  console.log("✅ Demo Insights Data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
