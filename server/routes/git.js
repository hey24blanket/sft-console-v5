const express = require('express');
const router = express.Router();
const GitService = require('../services/GitService');

// POST /api/git/sync
router.post('/sync', async (req, res) => {
    try {
        const result = await GitService.syncRepository(req.body);
        res.json(result);
    } catch (error) {
        console.error("❌ Git Sync Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;