import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Finding users with employee records (HR/Admin)...\n');
  
  const result = await pool.query(`
    SELECT 
      u.email,
      u.name,
      ur.role_name,
      e.id as employee_id
    FROM users u
    INNER JOIN employees e ON u.id = e.user_id
    INNER JOIN user_roles ur ON e.user_role_id = ur.id
    LIMIT 10
  `);

  for (const row of result.rows) {
    console.log(`Email: ${row.email}`);
    console.log(`Name: ${row.name}`);
    console.log(`Role: ${row.role_name}`);
    console.log(`Employee ID: ${row.employee_id}`);
    console.log('---');
  }

  console.log(`\nFound ${result.rows.length} users with employee records`);
  console.log('\n💡 Use one of these emails to login as HR in the test script');

  await pool.end();
}

main().catch(console.error);
