-- Reset all applications to Talent Pool
-- This script resets all candidate applications to Talent Pool state

-- 1. Get the AI SCREENING pipeline ID
DO $$
DECLARE
    ai_screening_id UUID;
BEGIN
    -- Find AI SCREENING pipeline
    SELECT id INTO ai_screening_id 
    FROM application_pipelines 
    WHERE application_pipeline = 'AI SCREENING' 
    LIMIT 1;

    -- Reset all applications
    UPDATE candidate_applications 
    SET 
        is_talent_pool = true,
        application_pipeline_id = ai_screening_id;

    -- Output results
    RAISE NOTICE 'Reset % applications to Talent Pool', (SELECT COUNT(*) FROM candidate_applications);
END $$;

-- Verify the results
SELECT 
    COUNT(*) FILTER (WHERE is_talent_pool = true) as talent_pool_count,
    COUNT(*) FILTER (WHERE is_talent_pool = false) as active_count,
    COUNT(*) as total_count
FROM candidate_applications;
