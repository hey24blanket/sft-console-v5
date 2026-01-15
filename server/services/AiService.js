const path = require('path');
// .env 파일 로드 (루트 경로 SFT_Console_v5/.env)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_MAP = {
    'GPT-5.2-pro': 'gpt-4o',
    'GPT-5.2': 'gpt-4-turbo',
    'GPT-5.1': 'gpt-3.5-turbo',
    'Gemini-3-pro': 'gemini-1.5-pro',
    'Gemini-3-bison': 'gemini-1.5-flash',
    'Gemini-2.5-pro': 'gemini-1.0-pro'
};

class AiService {
    static async generateDirecting(data) {
        // ★ [안전장치] customConfig가 없으면 빈 객체로 초기화 (에러 방지)
        const { customConfig = {}, customPrompts = {}, isExperienceMode } = data;

        // 1. API Key 우선순위: 클라이언트 설정 -> .env 파일
        const envKeyOpenAI = process.env.OPENAI_API_KEY;
        const envKeyGemini = process.env.GEMINI_API_KEY;

        const apiKey = customConfig.api_key || envKeyOpenAI || envKeyGemini;
        const uiModelName = customConfig.model || 'GPT-5.2-pro';
        const realModelId = MODEL_MAP[uiModelName] || uiModelName;
        const provider = uiModelName.toLowerCase().includes('gemini') ? 'google' : 'openai';

        // 디버그 로그: 키가 로드되었는지 확인 (보안상 앞 3자리만 표시)
        const keyStatus = apiKey ? `Loaded (${apiKey.substring(0, 3)}...)` : "MISSING";
        console.log(`🤖 AI Request: [${provider}] Model: ${uiModelName}, Key: ${keyStatus}`);

        if (!apiKey) {
            throw new Error(`API Key가 없습니다. Settings 메뉴에 입력하거나 .env 파일을 확인해주세요.`);
        }

        // 2. 프롬프트 구성
        let systemPrompt = customPrompts.master || "You are a creative director.";
        if (customPrompts.style) {
            systemPrompt += `\n\n[Style Guideline]\n${customPrompts.style}`;
        }

        // 3. 데이터 정리
        const sceneData = {
            id: data.formatted_id,
            narration: data.narrations,
            visual_plans: data.visual_plans,
            experience: isExperienceMode ? data.experience_track : null
        };
        const userContent = JSON.stringify(sceneData, null, 2);

        // 4. 호출
        if (provider === 'google') {
            return await this.callGemini(apiKey, realModelId, systemPrompt, userContent);
        } else {
            return await this.callOpenAI(apiKey, realModelId, systemPrompt, userContent);
        }
    }

    static async callOpenAI(apiKey, model, systemPrompt, userContent) {
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze this scene and generate JSON directing:\n${userContent}` }
            ],
            response_format: { type: "json_object" }
        });
        return this.parseResult(completion.choices[0].message.content);
    }

    static async callGemini(apiKey, model, systemPrompt, userContent) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const aiModel = genAI.getGenerativeModel({
            model: model,
            generationConfig: { responseMimeType: "application/json" }
        });
        const fullPrompt = `${systemPrompt}\n\nRespond in JSON only.\n\n[Scene Data]\n${userContent}`;
        const result = await aiModel.generateContent(fullPrompt);
        const response = await result.response;
        return this.parseResult(response.text());
    }

    static parseResult(text) {
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            throw new Error("AI 응답이 올바른 JSON이 아닙니다.");
        }
    }
}

module.exports = AiService;