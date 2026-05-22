const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

router.post('/generate-blog', async (req, res) => {
    const { topic, promptType } = req.body;

    if (!topic) {
        return res.status(400).json({ error: "Topic is required to seed the AI node!" });
    }

    let systemPrompt = "";
    if (promptType === 'title') {
        systemPrompt = `You are an expert copywriter. Based on this topic: "${topic}", generate ONLY ONE single, clean, catchy blog title. Do not include quotes, serial numbers, asterisks, or any introductory text. Just return the title directly as a single line of text.`;
    } else {
        systemPrompt = `Write a well-structured, engaging, and professional blog post content on the topic: "${topic}". Keep it conversational yet highly insightful, divided into short scannable paragraphs. Do not use complex markdown formatting or HTML tags, just clean string format with spaces.`;
    }

    // --- AUTOMATIC API FAILOVER LOGIC ---
    try {
        console.log("🔄 Attempting generation with Primary API Key...");
        const aiPrimary = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_PRIMARY });
        
        const response = await aiPrimary.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
        });

        return res.json({ result: response.text });

    } catch (primaryError) {
        console.warn("⚠️ Primary API Key failed or limit hit! Switching to Backup Key...", primaryError.message);

        try {
            // Agar Primary fail hui, toh code yahan aayega aur Backup Key use karega
            const aiBackup = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_BACKUP });
            
            const responseBackup = await aiBackup.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: systemPrompt,
            });

            console.log("✅ Backup API Key saved the day! Response generated successfully.");
            return res.json({ result: responseBackup.text });

        } catch (backupError) {
            console.error("❌ Both Primary and Backup API Keys failed!", backupError.message);
            
            // SMART FALLBACK: Agar dono keys fail ho gayi (God forbid!), toh Mock Data bhej do
            if (promptType === 'title') {
                return res.json({ 
                    result: `Optimized Title: Master ${topic || 'This Topic'} in 2026 (System Safe Mode)` 
                });
            } else {
                return res.json({ 
                    result: `This is a high-quality backup structured article content about "${topic || 'your topic'}". [Note: Live AI cluster is currently under maintenance, but the core failover pipeline is fully functional!]` 
                });
            }
        }
    }
});

module.exports = router;