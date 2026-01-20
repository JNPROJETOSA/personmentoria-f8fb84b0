
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jibsgrfzrkviffcignsm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYnNncmZ6cmt2aWZfY2lnbnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5ODM5NDUsImV4cCI6MjA1NDU1OTk0NX0.9lq5eZtH8jYJ9p3wN1W8vC2X6rZQ2m6gX9h4nF5bL0'

function parseJwt(token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

async function testConnection() {
    console.log("Testing Supabase Connection...")

    try {
        const payload = parseJwt(SUPABASE_KEY);
        console.log("Key Payload (ref):", payload.ref);
        console.log("Expected Ref: jibsgrfzrkviffcignsm");

        if (payload.ref !== 'jibsgrfzrkviffcignsm') {
            console.error("MISMATCH! The key belongs to project:", payload.ref);
        } else {
            console.log("MATCH! Key reference is correct.");
        }

    } catch (e) {
        console.error("Invalid JWT format:", e.message);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })

        if (error) {
            console.error("Connection Failed:", error.message)
            console.error("Full Error:", JSON.stringify(error, null, 2))
        } else {
            console.log("Connection Successful! Status: 200 OK")
        }
    } catch (e) {
        console.error("Unexpected Error:", e)
    }
}

testConnection()
