const express = require('express');
const router = express.Router();
const AiService = require('../services/AiService');

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
    try {
        console.log("🤖 AI Request Received for:", req.body.formatted_id);

        // 클라이언트가 보낸 데이터 전체를 서비스로 넘김
        const result = await AiService.generateDirecting(req.body);

        res.json(result);
    } catch (error) {
        console.error("❌ AI Generation Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;