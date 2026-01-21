
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

async function testInsert() {
    console.log('Testing Simplified INSERT on reviews table...');
    const date = new Date().toLocaleDateString('sv'); // YYYY-MM-DD

    // Using a dummy UUID for 'user_id' might violate FK constraints if not cautious, 
    // but let's try to see if it even accepts the columns.
    // Ideally, we need a real user ID. I'll rely on the previous knowledge or use a placeholder.
    // If FK fails, it means column structure is at least OK.

    // Checking if we can get a real user from recent queries? Difficult without auth context.
    // I will try to fetch a user first if possible, or just use a random one and expect FK error (which is better than Column error).

    const dummyId = '00000000-0000-0000-0000-000000000000';

    console.log(`Payload: { user_id: '${dummyId}', topic: 'DEBUG TEST', date: '${date}' }`);

    const { data, error } = await supabase
        .from('reviews')
        .insert({
            user_id: dummyId,
            topic: 'DEBUG TEST',
            date: date
        })
        .select();

    if (error) {
        console.error('Insert Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Insert Success:', data);
        // Cleanup
        if (data && data[0]) {
            await supabase.from('reviews').delete().eq('id', data[0].id);
        }
    }
}

testInsert();
