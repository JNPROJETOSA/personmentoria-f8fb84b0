
const urls = [
    "https://jibsgrfzrkviffcignsm.supabase.co",
    "https://jibsgrfzrkvif-cignsm.supabase.co",
    "https://jibsgrfzrkvifcignsm.supabase.co",
    "https://jibsgrfzrkvif_cignsm.supabase.co"
];

async function check() {
    for (const url of urls) {
        try {
            console.log(`Checking ${url}...`);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${url}/rest/v1/`, { // checking REST endpoint
                method: 'HEAD',
                signal: controller.signal,
                headers: { 'apikey': 'public' } // Just to see if we get 401 (exists) or ENOTFOUND (doesn't exist)
            });
            clearTimeout(id);
            console.log(`[${res.status}] ${url} - Reached!`);
        } catch (e) {
            console.log(`[FAILED] ${url} - ${e.cause ? e.cause.code : e.message}`);
        }
    }
}

check();
