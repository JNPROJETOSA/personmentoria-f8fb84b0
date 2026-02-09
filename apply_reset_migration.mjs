import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Need: VITE_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY)');
    process.exit(1);
}

console.log('📦 Applying reset_user_records migration...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    try {
        // Read the SQL file
        const sqlContent = fs.readFileSync('./reset_user_records.sql', 'utf8');

        console.log('📖 Read SQL migration file');
        console.log('🔧 Attempting to apply migration...\n');

        // Note: This requires the supabase client to have permissions to execute raw SQL
        // If using anon key, this might fail. Service role key is needed for DDL operations.

        // Try using the query method (might not work with all Supabase setups)
        // Alternatively, the user may need to run this through Supabase dashboard

        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

        if (error) {
            console.error('⚠️  Failed to apply migration via RPC (expected if exec_sql is not available)');
            console.error('   Error:', error.message);
            console.log('\n📌 MANUAL STEPS REQUIRED:');
            console.log('   1. Go to your Supabase Dashboard');
            console.log('   2. Navigate to SQL Editor');
            console.log('   3. Copy and paste the contents of reset_user_records.sql');
            console.log('   4. Run the SQL script');
            console.log('\n   Or use the Supabase CLI: npx supabase db execute reset_user_records.sql\n');
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');
        console.log('   Function reset_user_records() is now available\n');

    } catch (error) {
        console.error('❌ Error applying migration:', error.message);
        console.log('\n📌 MANUAL STEPS REQUIRED:');
        console.log('   1. Go to your Supabase Dashboard');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Copy and paste the contents of reset_user_records.sql');
        console.log('   4. Run the SQL script');
        console.log('\n   Or use the Supabase CLI if installed\n');
        process.exit(1);
    }
}

applyMigration();
