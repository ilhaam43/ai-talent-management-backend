
import axios from 'axios';

const API_URL = 'http://localhost:3000/skills';

async function runTests() {
    console.log('Starting Skills API Endpoint Tests...');

    let skillId: string | null = null;
    const testSkill = { skillName: 'Test Skill Endpoint', description: 'Created by integration test' };

    try {
        // 1. CREATE
        console.log('\n[TEST] Create Skill...');
        const createRes = await axios.post(API_URL, testSkill);
        if (createRes.status === 201) {
            console.log('✅ Create Success:', createRes.data.id);
            skillId = createRes.data.id;
        } else {
            console.error('❌ Create Failed:', createRes.status, createRes.data);
        }

        // 2. GET ALL
        if (skillId) {
            console.log('\n[TEST] Get All Skills...');
            const listRes = await axios.get(API_URL);
            if (listRes.status === 200 && Array.isArray(listRes.data)) {
                const found = listRes.data.find((s: any) => s.id === skillId);
                if (found) console.log('✅ Get All: Created skill found in list');
                else console.warn('⚠️ Get All: Created skill NOT found in list');
            }
        }

        // 3. UPDATE
        if (skillId) {
            console.log('\n[TEST] Update Skill...');
            const updateRes = await axios.patch(`${API_URL}/${skillId}`, {
                description: "Updated description"
            });
            if (updateRes.status === 200 && updateRes.data.description === "Updated description") {
                console.log('✅ Update Success');
            } else {
                console.error('❌ Update Failed');
            }
        }

        // 4. DELETE
        if (skillId) {
            console.log('\n[TEST] Delete Skill...');
            const delRes = await axios.delete(`${API_URL}/${skillId}`);
            if (delRes.status === 200) {
                console.log('✅ Delete Success');

                // Verify gone
                try {
                    await axios.get(`${API_URL}/${skillId}`);
                } catch (e: any) {
                    if (e.response && e.response.status === 404) {
                        console.log('✅ Verified 404 after delete');
                    }
                }
            }
        }

    } catch (error: any) {
        console.error('❌ Test Execution Failed:', error.message);
        if (error.response) console.error('Response Data:', error.response.data);
    }
}

runTests();
