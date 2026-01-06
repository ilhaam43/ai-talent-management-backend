
import { PrismaClient, AiMatchStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Data from the image
const candidatesData = [
    { name: 'Aulia Kayesha', score: 94, job: 'Product Manager', stage: 'INTERVIEW USER 1', date: '2025-11-26', status: 'PASSED' },
    { name: 'Daniel', score: 70, job: 'Product Manager', stage: 'AI SCREENING', date: '2025-11-25', status: 'PARTIALLY PASSED' },
    { name: 'Abdul Aziz', score: 69, job: 'Product Manager', stage: 'AI SCREENING', date: '2025-11-25', status: 'PARTIALLY PASSED' },
    { name: 'Amelia Evi', score: 65, job: 'Product Manager', stage: 'AI SCREENING', date: '2025-11-25', status: 'PARTIALLY PASSED' },
    { name: 'Elvita Carolina', score: 65, job: 'Lead Product Manager', stage: 'AI SCREENING', date: '2025-11-25', status: 'NOT PASSED' },
    { name: 'Andi Bagus', score: 88, job: 'Lead Product Manager', stage: 'INTERVIEW USER 2', date: '2025-11-25', status: 'PASSED' },
    { name: 'Aurelia Santika', score: 88, job: 'Sales Manager', stage: 'AI SCREENING', date: '2025-11-25', status: 'PASSED' },
    { name: 'Finna Putri', score: 88, job: 'Product Manager', stage: 'AI SCREENING', date: '2025-11-25', status: 'PASSED' },
    { name: 'Donny Kenan', score: 88, job: 'UI/UX Designer', stage: 'AI SCREENING', date: '2025-11-25', status: 'PASSED' },
    { name: 'Fadli Anantama', score: 93, job: 'Lead Product Manager', stage: 'INTERVIEW USER 1', date: '2025-11-25', status: 'PASSED' },
];

async function main() {
    console.log('Seeding candidates and applications...');

    // 1. Ensure Defaults exists (or fetch them)
    // We need generic IDs for required fields in JobVacancy if we create one.
    const employmentType = await prisma.employmentType.findFirst() || await prisma.employmentType.create({ data: { employmentType: 'FULL-TIME' } });
    const position = await prisma.employeePosition.findFirst() || await prisma.employeePosition.create({ data: { employeePosition: 'Staff' } });
    const vacancyStatus = await prisma.jobVacancyStatus.findFirst() || await prisma.jobVacancyStatus.create({ data: { jobVacancyStatus: 'OPEN' } });
    const duration = await prisma.jobVacancyDuration.findFirst() || await prisma.jobVacancyDuration.create({ data: { daysDuration: 30 } });
    const reason = await prisma.jobVacancyReason.findFirst() || await prisma.jobVacancyReason.create({ data: { reason: 'New Role' } });

    const passwordHash = await bcrypt.hash('password123', 10);

    for (const item of candidatesData) {
        console.log(`Processing ${item.name}...`);

        // A. Reference Data: Job Role
        let jobRole = await prisma.jobRole.findFirst({ where: { jobRoleName: item.job } });
        if (!jobRole) {
            console.log(`Creating Job Role: ${item.job}`);
            jobRole = await prisma.jobRole.create({ data: { jobRoleName: item.job } });
        }

        // B. Reference Data: Job Vacancy
        // Try to find an open vacancy for this role
        let vacancy = await prisma.jobVacancy.findFirst({
            where: { jobRoleId: jobRole.id }
        });

        if (!vacancy) {
            console.log(`Creating Job Vacancy for: ${item.job}`);
            vacancy = await prisma.jobVacancy.create({
                data: {
                    jobRoleId: jobRole.id,
                    employeePositionId: position.id,
                    employmentTypeId: employmentType.id,
                    jobVacancyStatusId: vacancyStatus.id,
                    jobVacancyDurationId: duration.id,
                    jobVacancyReasonId: reason.id,
                    jobRequirement: `Requirements for ${item.job}: Strong leadership, communication skills, 5+ years experience.`,
                    jobDescription: `Detailed description for ${item.job}. Responsibilities include managing the product lifecycle...`,
                    jobQualification: `Bachelor degree in Computer Science or related field.`,
                    cityLocation: 'Jakarta',
                    minSalary: 5000000,
                    maxSalary: 10000000,
                }
            });
        } else {
            console.log(`Updating Job Vacancy for: ${item.job}`);
            await prisma.jobVacancy.update({
                where: { id: vacancy.id },
                data: {
                    cityLocation: 'Jakarta',
                    jobQualification: `Bachelor degree in Computer Science or related field.`,
                }
            });
        }

        // C. Reference Data: Pipeline & Status
        const pipeline = await prisma.applicationPipeline.findFirst({ where: { applicationPipeline: item.stage } });
        if (!pipeline) throw new Error(`Pipeline ${item.stage} not found. Run seed-application-pipelines.ts first.`);

        const status = await prisma.applicationLastStatus.findFirst({ where: { applicationLastStatus: item.status } });
        if (!status) throw new Error(`Status ${item.status} not found. Run seed-application-last-statuses.ts first.`);

        // D. User & Candidate
        const email = `${item.name.toLowerCase().replace(/\s+/g, '.')}@example.com`;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: item.name,
                    email: email,
                    password: passwordHash,
                }
            });
        }

        let candidate = await prisma.candidate.findFirst({ where: { userId: user.id } });
        if (!candidate) {
            candidate = await prisma.candidate.create({
                data: {
                    userId: user.id,
                    candidateFullname: item.name,
                    candidateEmail: email,
                }
            });
        }

        // E. Candidate Salary (Required for Application)
        // Check if exists or create dummy
        let salary = await prisma.candidateSalary.findFirst({ where: { candidateId: candidate.id } });
        if (!salary) {
            salary = await prisma.candidateSalary.create({
                data: {
                    candidateId: candidate.id,
                    currentSalary: 5000000,
                    expectationSalary: 7000000
                }
            });
        }

        // G. Enrich Candidate Profile (Fill Nulls)
        // 1. Fetch References (Create if not exist for safety)
        const gender = await prisma.gender.findFirst({ where: { gender: 'Male' } }) || await prisma.gender.create({ data: { gender: 'Male' } });
        const religion = await prisma.religion.findFirst({ where: { religion: 'Islam' } }) || await prisma.religion.create({ data: { religion: 'Islam' } });
        const marital = await prisma.maritalStatus.findFirst({ where: { maritalStatus: 'Single' } }) || await prisma.maritalStatus.create({ data: { maritalStatus: 'Single' } });
        const nation = await prisma.nationality.findFirst({ where: { nationality: 'Indonesian' } }) || await prisma.nationality.create({ data: { nationality: 'Indonesian' } });

        // Update Candidate with full details
        console.log(`Enriching profile for ${item.name}`);
        await prisma.candidate.update({
            where: { id: candidate.id },
            data: {
                genderId: gender.id,
                religionId: religion.id,
                maritalStatusId: marital.id,
                nationalityId: nation.id,
                phoneNumber: '08123456789',
                placeOfBirth: 'Jakarta',
                dateOfBirth: new Date('1995-01-01'),
                cityDomicile: 'Jakarta Selatan',
                idCardNumber: `31750${Math.floor(100000 + Math.random() * 900000)}`, // Random ID
                candidateNickname: item.name.split(' ')[0],
            }
        });

        // F. Application
        // Check uniqueness (Candidate + Job)
        const existingApp = await prisma.candidateApplication.findFirst({
            where: {
                candidateId: candidate.id,
                jobVacancyId: vacancy.id
            }
        });

        if (existingApp) {
            console.log(`Updating existing application for ${item.name}`);
            await prisma.candidateApplication.update({
                where: { id: existingApp.id },
                data: {
                    fitScore: item.score,
                    applicationPipelineId: pipeline.id,
                    applicationLatestStatusId: status.id,
                    submissionDate: new Date(item.date),

                    // AI Analysis Fields
                    aiInsight: `Strong candidate with background in ${item.job}. Matches key requirements.`,
                    aiMatchStatus: item.score >= 90 ? 'STRONG_MATCH' : (item.score >= 70 ? 'MATCH' : 'NOT_MATCH'),
                    aiInterview: `Suggested question: How do you handle tight deadlines in ${item.job}?`,
                    aiCoreValue: `Shows strong alignment with company values of Innovation and Integrity.`,
                    resultSummary: `Candidate has good potential for ${item.job}. Recommended for interview.`,
                }
            });
        } else {
            console.log(`Creating application for ${item.name}`);
            await prisma.candidateApplication.create({
                data: {
                    candidateId: candidate.id,
                    jobVacancyId: vacancy.id,
                    candidateSalaryId: salary!.id,

                    applicationPipelineId: pipeline.id,
                    applicationLatestStatusId: status.id,

                    fitScore: item.score,
                    submissionDate: new Date(item.date),

                    // AI Analysis Fields
                    aiInsight: `Strong candidate with background in ${item.job}. Matches key requirements.`,
                    aiMatchStatus: item.score >= 90 ? 'STRONG_MATCH' : (item.score >= 70 ? 'MATCH' : 'NOT_MATCH'),
                    aiInterview: `Suggested question: How do you handle tight deadlines in ${item.job}?`,
                    aiCoreValue: `Shows strong alignment with company values of Innovation and Integrity.`,
                    resultSummary: `Candidate has good potential for ${item.job}. Recommended for interview.`,
                }
            });
        }
    }

    console.log('\n✅ Candidates and Applications seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
