require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const open = require('open');

// 1. 라우터 모듈 불러오기 (새로 추가됨)
const aiRoutes = require('./routes/ai');

const app = express();

// 포트 설정 (3001번 유지)
const PORT = process.env.PORT || 3001;

// 2. Middleware 설정
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 대용량 JSON 처리를 위해 제한 상향
app.use(express.static(path.join(__dirname, '../public'))); // Frontend 정적 파일 서빙

// 3. API Routes 등록
// 기본 상태 체크
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', version: '5.0.0' });
});

// ★ AI 서비스 라우터 연결 (핵심 추가 사항)
// /api/ai/generate 등의 요청을 routes/ai.js로 보냅니다.
app.use('/api/ai', aiRoutes);

// 4. Main Entry (SPA 지원)
// API 요청이 아닌 모든 경로는 index.html을 반환하여 프론트엔드 라우팅 지원
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 5. 서버 실행
app.listen(PORT, () => {
    console.log(`\n🚀 SFT Console v5 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving Client from /public`);
    console.log(`🤖 AI Service Ready at /api/ai`);

    // 서버 시작 시 브라우저 자동 열기 (개발 편의성, 필요시 주석 해제)
    // open(`http://localhost:${PORT}`);
});