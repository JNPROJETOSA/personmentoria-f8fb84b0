
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

// Read .env manually
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        envConfig[match[1].trim()] = value;
    }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('Testing INSERT on reviews table...');
    const date = new Date().toISOString().split('T')[0];

    // Try to insert with a random user_id (might fail if not auth)
    // Check if we can just test the CLIENT connection first

    // We need a logged in context to test RLS properly usually, but we can check if it fails with specific RLS error
    // Using a dummy UUID
    const dummyId = '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase
        .from('reviews')
        .insert({
            user_id: dummyId,
            topic: 'RLS TEST',
            date: date,
            priority: 1,
            completed: true
        })
        .select();

    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Insert Success:', data);
        // Cleanup
        await supabase.from('reviews').delete().eq('id', data[0].id);
    }
}

checkRLS();
