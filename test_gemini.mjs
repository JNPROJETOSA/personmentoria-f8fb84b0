
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyBQHXb5BphfgqSNFyGoaPLozvkHY1JJ1kQ";

async function checkModels() {
    console.log("Checking available models...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log("No models found or error:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.log("Error listing models: " + e.message);
    }
}

checkModels();
