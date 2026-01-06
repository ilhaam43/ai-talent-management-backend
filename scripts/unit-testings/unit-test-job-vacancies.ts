
import { JobVacanciesService } from '../../src/job-vacancies/job-vacancies.service';
import assert from 'assert';

// Mock Logger to avoid clutter
const loggerMock = { log: () => { }, error: () => { }, warn: () => { } };
// We need to override the logger property if it's private... 
// actually it's easier to just ignore it as it calls console likely or Nest Logger.
// The service instantiates `new Logger()`, so we can't easily mock it without DI or prototype hacking.
// But it's fine, it will just log to console.

async function runUnitTests() {
    console.log('Running JobVacanciesService Unit Tests...');

    // 1. Setup Mocks
    const mockPrisma = {
        skill: {
            findMany: async (args: any) => {
                if (args.where.skillName.in.includes('Java')) {
                    return [{ id: 'skill-1', skillName: 'Java' }];
                }
                return [];
            }
        },
        jobVacancy: {
            create: async (args: any) => {
                // Verify structure
                assert.ok(args.data.jobVacancySkills.create, 'Should have nested creates');
                return { id: 'vac-1', ...args.data };
            },
            findMany: async () => [{ id: 'vac-1' }],
            findUnique: async () => ({ id: 'vac-1' }),
            update: async () => ({ id: 'vac-1' }),
            delete: async () => ({ id: 'vac-1' }),
        },
        jobVacancySkill: {
            deleteMany: async () => ({ count: 1 }),
            createMany: async () => ({ count: 1 })
        },
        $transaction: async (cb: any) => cb(mockPrisma)
    };

    const service = new JobVacanciesService(mockPrisma as any);

    // 2. TEST: Create
    console.log('[TEST] create()');
    const createDto = {
        jobRoleId: 'role-1',
        employeePositionId: 'pos-1',
        employmentTypeId: 'type-1',
        jobVacancyStatusId: 'status-1',
        jobVacancyDurationId: 'dur-1',
        jobVacancyReasonId: 'reason-1',
        skills: ['Java']
    };

    const created = await service.create(createDto);
    assert.strictEqual(created.id, 'vac-1');
    // Verify skill resolution logic in mock (we assume it worked if no error)
    console.log('✅ create() passed');


    // 3. TEST: findAll
    console.log('[TEST] findAll()');
    const all = await service.findAll();
    assert.strictEqual(all.length, 1);
    console.log('✅ findAll() passed');

    // 4. TEST: update (with skill sync)
    console.log('[TEST] update()');
    const updateDto = { skills: ['Java'] };
    // This triggers transaction
    await service.update('vac-1', updateDto);
    // Assertions happen inside the mock (e.g. if deleteMany/createMany are called)
    // In a real test framework we'd spy on the mock methods.
    // Here we trust the execution flow didn't throw.
    console.log('✅ update() passed');

    // 5. TEST: remove
    console.log('[TEST] remove()');
    await service.remove('vac-1');
    console.log('✅ remove() passed');

    console.log('\nALL UNIT TESTS PASSED');
}

runUnitTests().catch(e => {
    console.error('❌ Unit Test Failed:', e);
    process.exit(1);
});
