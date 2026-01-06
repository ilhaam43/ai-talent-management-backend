import axios from 'axios';

const API_URL = 'http://localhost:3000/candidate-applications';

async function verifyOrgStructure() {
    console.log('Verifying job vacancy organizational structure...\\n');

    try {
        const response = await axios.get(API_URL);
        const apps = response.data;

        if (apps.length > 0) {
            const first = apps[0];
            console.log('=== FIRST APPLICATION JOB VACANCY ===');
            console.log('Job Role:', first.jobVacancy?.jobRole?.jobRoleName);
            console.log('\\nOrganizational IDs:');
            console.log('  directorateId:', first.jobVacancy?.directorateId);
            console.log('  groupId:', first.jobVacancy?.groupId);
            console.log('  divisionId:', first.jobVacancy?.divisionId);
            console.log('  departmentId:', first.jobVacancy?.departmentId);

            if (first.jobVacancy?.directorateId && first.jobVacancy?.divisionId) {
                console.log('\\n✅ Organizational structure fields are populated!');
            } else {
                console.log('\\n❌ Some organizational fields are still null');
            }
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

verifyOrgStructure();
