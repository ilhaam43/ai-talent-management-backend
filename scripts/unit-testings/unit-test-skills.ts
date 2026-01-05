
import { SkillsService } from '../../src/skills/skills.service';
import assert from 'assert';

async function runUnitTests() {
    console.log('Running SkillsService Unit Tests...');

    // 1. Setup Mocks
    const mockPrisma = {
        skill: {
            create: async (args: any) => ({ id: 'skill-1', ...args.data }),
            findMany: async () => [{ id: 'skill-1', skillName: 'Test Skill' }],
            findUnique: async (args: any) => {
                if (args.where.id === 'skill-1') return { id: 'skill-1', skillName: 'Test Skill' };
                return null;
            },
            update: async (args: any) => ({ id: args.where.id, ...args.data }),
            delete: async (args: any) => ({ id: args.where.id }),
        },
    };

    const service = new SkillsService(mockPrisma as any);

    // 2. TEST: Create
    console.log('[TEST] create()');
    const created = await service.create({ skillName: 'New Skill' });
    assert.strictEqual(created.id, 'skill-1');
    assert.strictEqual(created.skillName, 'New Skill');
    console.log('✅ create() passed');

    // 3. TEST: findAll
    console.log('[TEST] findAll()');
    const all = await service.findAll();
    assert.strictEqual(all.length, 1);
    console.log('✅ findAll() passed');

    // 4. TEST: findOne
    console.log('[TEST] findOne()');
    const one = await service.findOne('skill-1');
    assert.strictEqual(one.id, 'skill-1');
    console.log('✅ findOne() passed');

    // 5. TEST: update
    console.log('[TEST] update()');
    const updated = await service.update('skill-1', { description: 'Updated' });
    assert.strictEqual(updated.description, 'Updated');
    console.log('✅ update() passed');

    // 6. TEST: remove
    console.log('[TEST] remove()');
    const removed = await service.remove('skill-1');
    assert.strictEqual(removed.id, 'skill-1');
    console.log('✅ remove() passed');

    console.log('\nALL SKILLS UNIT TESTS PASSED');
}

runUnitTests().catch(e => {
    console.error('❌ Skills Unit Test Failed:', e);
    process.exit(1);
});
