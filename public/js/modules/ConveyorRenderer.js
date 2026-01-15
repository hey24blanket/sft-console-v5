import { Toast } from './Toast.js';
import { db } from './Database.js';

export class ConveyorRenderer {
    constructor() {
        this.container = document.getElementById('view-conveyor');
        this.queue = [];
        this.currentIndex = 0;
        this.currentMode = 'all';
        this.initUI();
    }

    initUI() {
        this.container.innerHTML = `
            <div class="conv-toolbar">
                <div style="display:flex; gap:10px;">
                    <button id="btn-prev-task" class="btn btn-action" style="width:40px; background:#444; border-color:#555;"><i class="fas fa-arrow-left"></i></button>
                    
                    <button id="btn-conv-ai" class="btn btn-action" style="background:#8e44ad; border-color:#8e44ad;">
                        <i class="fas fa-magic"></i> AI Directing
                    </button>
                    
                    <button id="btn-next-copy" class="btn btn-action">COPY & NEXT <i class="fas fa-arrow-right"></i></button>
                </div>
                
                <div style="margin-left:20px; font-size:14px; color:#aaa;">
                    Progress: <span id="conv-progress" style="color:white; font-weight:bold;">0 / 0</span>
                </div>
                <div style="flex:1; margin-left:20px;">
                    <div style="width:100%; height:6px; background:#333; border-radius:3px; overflow:hidden;">
                        <div id="conv-bar" style="width:0%; height:100%; background:var(--primary); transition:0.3s;"></div>
                    </div>
                </div>
            </div>
            
            <div class="conv-container">
                <div class="conv-panel" style="flex: 0 0 350px; overflow-y:auto;">
                    <h3 style="margin-top:0;"><i class="fas fa-cog"></i> Settings</h3>
                    
                    <div class="mode-group" style="margin-bottom:15px;">
                        <button class="mode-btn active" data-mode="all">All Scenes</button>
                        <button class="mode-btn" data-mode="exp">Experience Only</button>
                    </div>
                    
                    <label style="font-size:12px; color:#aaa; display:block; margin-bottom:5px;">
                        <i class="fas fa-crown"></i> System Prompt (Master)
                    </label>
                    <div id="master-prompt-box" class="plan-textarea" 
                         style="height:120px; padding:10px; overflow-y:auto; cursor:pointer; border:1px solid #444; color:#ddd; font-size:11px; margin-bottom:15px; white-space:pre-wrap;">
                        (Loading...)
                    </div>

                    <label style="font-size:12px; color:#aaa; display:block; margin-bottom:5px;">
                        <i class="fas fa-palette"></i> System Prompt (Style)
                    </label>
                    <div id="style-prompt-box" class="plan-textarea" 
                         style="height:80px; padding:10px; overflow-y:auto; cursor:pointer; border:1px solid #444; color:#aaa; font-size:11px; white-space:pre-wrap;">
                        (Loading...)
                    </div>

                    <div style="margin-top:10px; font-size:10px; color:#666;">
                        * 박스를 클릭하여 프롬프트를 수정하세요.
                    </div>
                </div>

                <div class="conv-panel">
                    <h3>📄 JSON Output <span id="conv-current-id" style="color:var(--primary); margin-left:10px;">-</span></h3>
                    <div id="conv-output" class="conv-display" style="background:#111; padding:15px; font-family:monospace; color:#0f0; white-space:pre-wrap; overflow-y:auto; flex:1; border-radius:4px; font-size:12px;">Waiting for data...</div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.loadPrompts();
    }

    bindEvents() {
        document.getElementById('btn-next-copy').addEventListener('click', () => this.copyAndNext());
        document.getElementById('btn-prev-task').addEventListener('click', () => this.prevTask());

        // ★ AI 버튼 클릭 이벤트 연결
        document.getElementById('btn-conv-ai').addEventListener('click', () => this.generateAi());

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
                this.buildQueue(this.currentMode);
            });
        });

        document.getElementById('master-prompt-box').addEventListener('click', () => {
            if (window.UniversalData) {
                window.UniversalData.pm = { updateDashboardStatus: () => this.loadPrompts() };
                window.UniversalData.open('system_prompts', 'master', 'System Prompt (Master)');
            }
        });

        document.getElementById('style-prompt-box').addEventListener('click', () => {
            if (window.UniversalData) {
                window.UniversalData.pm = { updateDashboardStatus: () => this.loadPrompts() };
                window.UniversalData.open('system_prompts', 'style', 'System Prompt (Style)');
            }
        });
    }

    async loadPrompts() {
        try {
            const master = await db.system_prompts.get('master');
            const style = await db.system_prompts.get('style');

            const mBox = document.getElementById('master-prompt-box');
            const sBox = document.getElementById('style-prompt-box');

            if (mBox) mBox.innerText = master?.content || "(Click to set Master Prompt)";
            if (sBox) sBox.innerText = style?.content || "(Click to set Style Prompt)";
        } catch (e) { console.error(e); }
    }

    loadData() {
        if (!window.directorJson) return;
        this.buildQueue(this.currentMode);
    }

    buildQueue(mode) {
        this.queue = [];
        const sequences = window.directorJson.sequences || [];
        sequences.forEach(seq => {
            (seq.scenes || []).forEach(scene => {
                this.queue.push(scene);
            });
        });
        this.currentIndex = 0;
        this.updateView();
    }

    updateView() {
        const progressEl = document.getElementById('conv-progress');
        const barEl = document.getElementById('conv-bar');
        const outputEl = document.getElementById('conv-output');
        const idEl = document.getElementById('conv-current-id');

        if (this.queue.length === 0) {
            outputEl.innerText = "No scenes found.";
            return;
        }

        const scene = this.queue[this.currentIndex];
        const total = this.queue.length;
        const current = this.currentIndex + 1;

        progressEl.innerText = `${current} / ${total}`;
        barEl.style.width = `${(current / total) * 100}%`;
        idEl.innerText = scene.formatted_id;

        let jsonData = null;
        if (this.currentMode === 'all') {
            jsonData = scene.ai_planning || { info: "Press 'AI Directing' to generate." };
        } else {
            jsonData = scene.ai_planning_exp || { info: "Press 'AI Directing' to generate (Exp)." };
        }

        outputEl.innerText = JSON.stringify(jsonData, null, 2);
    }

    // ★ [핵심] AI 요청 로직
    async generateAi() {
        if (this.queue.length === 0) return;

        const btn = document.getElementById('btn-conv-ai');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating...`;

        try {
            const scene = this.queue[this.currentIndex];

            // 1. DB에서 설정 가져오기
            const configData = await db.global_settings.get('main_config');
            const masterData = await db.system_prompts.get('master');
            const styleData = await db.system_prompts.get('style');

            // ★ [변경점] API Key 강제 체크 제거
            // 키가 비어있으면 서버의 .env를 사용하면 되므로 여기서 막지 않습니다.
            // ai_config가 아예 없으면 기본 객체를 만듭니다.
            const aiConfig = configData?.ai_config || { provider: 'openai', model: 'gpt-4o', api_key: '' };

            // 2. 요청 페이로드 구성
            const payload = {
                ...scene,

                // ★ [중요] customConfig가 undefined가 되지 않도록 보장
                customConfig: aiConfig,

                customPrompts: {
                    master: masterData?.content || "",
                    style: styleData?.content || ""
                },
                isExperienceMode: (this.currentMode === 'exp')
            };

            // 3. 서버 요청
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errJson = await response.json();
                throw new Error(errJson.error || "Server Error");
            }

            const result = await response.json();

            // 4. 결과 저장
            if (this.currentMode === 'all') {
                scene.ai_planning = result;
            } else {
                scene.ai_planning_exp = result;
            }

            if (window.ProjectMgrInstance) {
                await window.ProjectMgrInstance.saveDirectorState();
            }

            this.updateView();
            if (window.Toast) window.Toast.show("AI Generation Complete! 🎨");

        } catch (e) {
            console.error(e);
            alert(`❌ AI Error: ${e.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    copyAndNext() {
        const text = document.getElementById('conv-output').innerText;
        navigator.clipboard.writeText(text).then(() => {
            if (window.Toast) Toast.show("Copied!");
            this.nextTask();
        });
    }

    nextTask() {
        if (this.currentIndex < this.queue.length - 1) {
            this.currentIndex++;
            this.updateView();
        } else {
            if (window.Toast) Toast.show("All scenes completed!");
        }
    }

    prevTask() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateView();
        }
    }
}