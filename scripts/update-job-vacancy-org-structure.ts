import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Updating job vacancies with organizational structure...\\n');

    // Get all job vacancies with their division
    const jobVacancies = await prisma.jobVacancy.findMany({
        include: {
            division: {
                include: {
                    directorate: true,
                    group: true,
                    departments: { take: 1 } // Get first department in the division
                }
            }
        }
    });

    let updatedCount = 0;
    for (const vacancy of jobVacancies) {
        if (vacancy.division) {
            const updateData: any = {
                directorateId: vacancy.division.directorateId,
                groupId: vacancy.division.groupId,
            };

            // If division has departments, assign the first one
            if (vacancy.division.departments && vacancy.division.departments.length > 0) {
                updateData.departmentId = vacancy.division.departments[0].id;
            }

            await prisma.jobVacancy.update({
                where: { id: vacancy.id },
                data: updateData
            });

            updatedCount++;
            console.log(`✓ Updated vacancy: ${vacancy.id} - Directorate: ${vacancy.division.directorate?.directorateName || 'N/A'}`);
        }
    }

    console.log(`\\n✅ Updated ${updatedCount} job vacancies with organizational structure!`);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
