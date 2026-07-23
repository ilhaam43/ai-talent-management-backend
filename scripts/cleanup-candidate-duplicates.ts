import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TARGET_EMAIL = 'test-auth@example.com';

async function cleanupDuplicates() {
    console.log(`🧹 Cleaning up duplicate data for: ${TARGET_EMAIL}\n`);

    const user = await prisma.user.findUnique({
        where: { email: TARGET_EMAIL },
        include: { candidates: true }
    });

    if (!user || user.candidates.length === 0) {
        console.log('❌ User or candidate not found.');
        await prisma.$disconnect();
        return;
    }

    const candidateId = user.candidates[0].id;
    console.log(`✅ Found candidate: ${candidateId}\n`);

    // ─── 1. Educations ───────────────────────────────────────────────
    const educations = await prisma.candidateEducation.findMany({
        where: { candidateId },
        orderBy: { id: 'asc' }
    });
    const uniqueEduKeys = new Set<string>();
    const eduToDelete: string[] = [];
    for (const edu of educations) {
        const key = `${edu.candidateLastEducationId}|${edu.candidateSchool}|${edu.candidateMajor}`;
        if (uniqueEduKeys.has(key)) {
            eduToDelete.push(edu.id);
        } else {
            uniqueEduKeys.add(key);
        }
    }
    if (eduToDelete.length > 0) {
        await prisma.candidateEducation.deleteMany({ where: { id: { in: eduToDelete } } });
        console.log(`🎓 Removed ${eduToDelete.length} duplicate education records. Kept ${educations.length - eduToDelete.length}.`);
    } else {
        console.log(`🎓 Educations: no duplicates found (${educations.length} records).`);
    }

    // ─── 2. Work Experiences ─────────────────────────────────────────
    const works = await prisma.candidateWorkExperience.findMany({
        where: { candidateId },
        orderBy: { id: 'asc' }
    });
    const uniqueWorkKeys = new Set<string>();
    const worksToDelete: string[] = [];
    for (const w of works) {
        const key = `${w.companyName}|${w.jobTitle}|${w.employmentStartedDate?.toISOString()}`;
        if (uniqueWorkKeys.has(key)) {
            worksToDelete.push(w.id);
        } else {
            uniqueWorkKeys.add(key);
        }
    }
    if (worksToDelete.length > 0) {
        await prisma.candidateWorkExperience.deleteMany({ where: { id: { in: worksToDelete } } });
        console.log(`💼 Removed ${worksToDelete.length} duplicate work experience records. Kept ${works.length - worksToDelete.length}.`);
    } else {
        console.log(`💼 Work Experiences: no duplicates found (${works.length} records).`);
    }

    // ─── 3. Organization Experiences ─────────────────────────────────
    const orgs = await prisma.candidateOrganizationExperience.findMany({
        where: { candidateId },
        orderBy: { id: 'asc' }
    });
    const uniqueOrgKeys = new Set<string>();
    const orgsToDelete: string[] = [];
    for (const o of orgs) {
        const key = `${o.organizationName}|${o.role}|${o.organizationStartedDate?.toISOString()}`;
        if (uniqueOrgKeys.has(key)) {
            orgsToDelete.push(o.id);
        } else {
            uniqueOrgKeys.add(key);
        }
    }
    if (orgsToDelete.length > 0) {
        await prisma.candidateOrganizationExperience.deleteMany({ where: { id: { in: orgsToDelete } } });
        console.log(`🏫 Removed ${orgsToDelete.length} duplicate organization records. Kept ${orgs.length - orgsToDelete.length}.`);
    } else {
        console.log(`🏫 Organization Experiences: no duplicates found (${orgs.length} records).`);
    }

    // ─── 4. Certifications ───────────────────────────────────────────
    const certs = await prisma.candidateCertification.findMany({
        where: { candidateId },
        orderBy: { id: 'asc' }
    });
    const uniqueCertKeys = new Set<string>();
    const certsToDelete: string[] = [];
    for (const c of certs) {
        const key = `${c.certificationTitle}|${c.institutionName}|${c.certificationStartDate?.toISOString()}`;
        if (uniqueCertKeys.has(key)) {
            certsToDelete.push(c.id);
        } else {
            uniqueCertKeys.add(key);
        }
    }
    if (certsToDelete.length > 0) {
        await prisma.candidateCertification.deleteMany({ where: { id: { in: certsToDelete } } });
        console.log(`📜 Removed ${certsToDelete.length} duplicate certification records. Kept ${certs.length - certsToDelete.length}.`);
    } else {
        console.log(`📜 Certifications: no duplicates found (${certs.length} records).`);
    }

    // ─── 5. Supporting Documents ─────────────────────────────────────
    const docs = await prisma.candidateDocument.findMany({
        where: { candidateId },
        orderBy: { id: 'asc' }
    });
    const uniqueDocKeys = new Set<string>();
    const docsToDelete: string[] = [];
    for (const d of docs) {
        const key = `${d.documentTypeId}`;
        if (uniqueDocKeys.has(key)) {
            docsToDelete.push(d.id);
        } else {
            uniqueDocKeys.add(key);
        }
    }
    if (docsToDelete.length > 0) {
        await prisma.candidateDocument.deleteMany({ where: { id: { in: docsToDelete } } });
        console.log(`📄 Removed ${docsToDelete.length} duplicate document records. Kept ${docs.length - docsToDelete.length}.`);
    } else {
        console.log(`📄 Supporting Documents: no duplicates found (${docs.length} records).`);
    }

    console.log('\n✅ Cleanup complete!');
    await prisma.$disconnect();
    await pool.end();
}

cleanupDuplicates().catch(e => {
    console.error('Error during cleanup:', e);
    process.exit(1);
});
