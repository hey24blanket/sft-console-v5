const express = require('express');
const path = require('path');
const app = express();
const port = 3001; // 또는 3001 등 사용하시는 포트

// 1. 미들웨어 설정
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // public 폴더를 정적 파일로 제공

// 2. 라우터 파일 가져오기
const aiRoutes = require('./server/routes/ai');
const gitRoutes = require('./server/routes/git'); // ★ 이번에 추가된 부분

// 3. API 라우트 등록
app.use('/api/ai', aiRoutes);
app.use('/api/git', gitRoutes); // ★ 이번에 추가된 부분

// 4. 메인 페이지 라우팅 (SPA 지원 등을 위해)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. 서버 시작
app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`🚀 SFT Console V5 Server running on port ${port}`);
    console.log(`📂 Serving static files from: ./public`);
    console.log(`🤖 AI Routes: /api/ai/generate`);
    console.log(`🐙 Git Routes: /api/git/sync`);
    console.log(`=========================================`);
});