// Simple reset script - no TypeScript, just plain JavaScript
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_talent_db';
const pool = new Pool({ connectionString });

async function resetTalentPool() {
    console.log('🔄 Resetting all applications to Talent Pool...\n');

    try {
        // Find AI SCREENING pipeline
        const pipelineResult = await pool.query(
            "SELECT id FROM application_pipelines WHERE application_pipeline = 'AI SCREENING' LIMIT 1"
        );

        if (pipelineResult.rows.length === 0) {
            console.log('❌ Could not find AI SCREENING pipeline');
            return;
        }

        const aiScreeningId = pipelineResult.rows[0].id;

        // Reset all applications
        const updateResult = await pool.query(
            'UPDATE candidate_applications SET is_talent_pool = true, application_pipeline_id = $1',
            [aiScreeningId]
        );

        console.log(`✅ Reset ${updateResult.rowCount} application(s) to Talent Pool\n`);

        // Verify
        const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_talent_pool = true) as talent_pool_count,
        COUNT(*) FILTER (WHERE is_talent_pool = false) as active_count,
        COUNT(*) as total_count
      FROM candidate_applications
    `);

        const stats = verifyResult.rows[0];
        console.log('📊 Final state:');
        console.log(`   - Applications in Talent Pool: ${stats.talent_pool_count}`);
        console.log(`   - Applications Active: ${stats.active_count}`);
        console.log(`   - Total: ${stats.total_count}`);
        console.log('\n🚀 Refresh your application to see the changes!');

    } catch (error) {
        console.error('❌ Error during reset:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

resetTalentPool()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    });
