import axios from 'axios';

async function quickCheck() {
    try {
        const response = await axios.get('http://localhost:3000/candidate-applications');
        const first = response.data[0];

        console.log(JSON.stringify({
            directorateId: first.jobVacancy?.directorateId,
            groupId: first.jobVacancy?.groupId,
            divisionId: first.jobVacancy?.divisionId,
            departmentId: first.jobVacancy?.departmentId,
            hasDirectorate: !!first.jobVacancy?.directorate,
            hasGroup: !!first.jobVacancy?.group,
            hasDivision: !!first.jobVacancy?.division,
            hasDepartment: !!first.jobVacancy?.department
        }, null, 2));
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

quickCheck();
