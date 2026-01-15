export class Inspector {
    constructor(saveCallback) {
        this.panel = document.getElementById('inspector-panel');
        this.sceneIdEl = document.getElementById('inspector-scene-id');
        this.narrationEl = document.getElementById('inspector-narration');
        this.editingScene = null;
        this.currentMode = 'normal'; // 'normal' | 'exp'
        this.saveCallback = saveCallback;

        this.initEvents();
    }

    initEvents() {
        this.panel.querySelector('.fa-times')?.parentElement.addEventListener('click', () => this.close());

        const saveBtn = this.panel.querySelector('button[onclick="saveInspector()"]');
        if (saveBtn) {
            saveBtn.removeAttribute('onclick');
            saveBtn.addEventListener('click', () => this.save());
        }

        const aiBtn = document.getElementById('btn-inspector-ai');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => this.generateAiDirecting());
        }
    }

    open(scene, mode = 'normal') {
        if (!scene) return;
        this.editingScene = scene;
        this.currentMode = mode;

        this.panel.classList.add('open');

        // 1. 헤더 & 나레이션 설정
        if (mode === 'exp') {
            this.sceneIdEl.innerText = `${scene.formatted_id} [Experience Mode]`;
            this.sceneIdEl.style.color = '#9b59b6'; // 보라색
            this.narrationEl.style.color = '#9b59b6';
        } else {
            this.sceneIdEl.innerText = `${scene.formatted_id}`;
            this.sceneIdEl.style.color = 'white';
            this.narrationEl.style.color = '#ddd';
        }

        const narrations = scene.narrations || [];
        this.narrationEl.innerText = narrations.length > 0 ? narrations.join('\n\n') : "(No Narration)";

        // 2. 우측 패널(Overlay/Resource) 제어
        const overlayCol = document.querySelector('.inspector-column.overlay-col');
        if (overlayCol) {
            // 체험 모드면 우측 패널 숨김 (심플하게)
            overlayCol.style.visibility = (mode === 'exp') ? 'hidden' : 'visible';
        }

        // 3. 중앙 패널 렌더링 (UI 완전 분리)
        if (mode === 'exp') {
            this.renderExperienceUI(scene);
        } else {
            this.renderNormalUI(scene);
            this.bindOverlayData(scene); // 오버레이는 Normal에서만
        }
    }

    close() {
        this.panel.classList.remove('open');
        this.editingScene = null;
        this.currentMode = 'normal';
    }

    save() {
        if (!this.editingScene) return;

        // ★ Normal 모드일 때만 Visual Plan & Overlay 저장
        if (this.currentMode === 'normal') {
            // Visual Plans 저장
            const plans = this.editingScene.visual_plans || [];
            plans.forEach((plan, idx) => {
                const el = document.getElementById(`plan-desc-${idx}`);
                if (el) plan.description = el.value;
            });

            // Overlay 저장
            const overlayEnabled = document.getElementById('overlay-enabled').checked;
            const overlayText = document.getElementById('overlay-text').value;
            if (!this.editingScene.keyword_emphasis) this.editingScene.keyword_emphasis = {};
            this.editingScene.keyword_emphasis.enabled = overlayEnabled;
            this.editingScene.keyword_emphasis.description = overlayText;
        }

        console.log(`✅ Scene Updated (${this.currentMode}):`, this.editingScene.formatted_id);
        if (this.saveCallback) this.saveCallback();
    }

    // === [UI Renderer 1] 일반 모드 (파란색) ===
    renderNormalUI(scene) {
        const container = document.getElementById('visual-plans-container');
        if (!container) return;
        container.innerHTML = ''; // 초기화

        const plans = scene.visual_plans || [];

        // 데이터가 없으면 기본값 생성
        if (plans.length === 0) {
            plans.push({ type: 'Plan A', description: '' });
            plans.push({ type: 'Plan B', description: '' });
            scene.visual_plans = plans;
        }

        plans.forEach((plan, idx) => {
            const div = document.createElement('div');
            const isSelected = (scene.selected_plan === (idx + 1));
            div.className = `plan-option ${isSelected ? 'selected' : ''}`;

            div.innerHTML = `
                <div class="plan-header">
                    <input type="radio" name="plan-select" ${isSelected ? 'checked' : ''}>
                    <label class="plan-label">${plan.type || 'Plan ' + (idx + 1)}</label>
                </div>
                <textarea class="plan-textarea" id="plan-desc-${idx}">${plan.description || ''}</textarea>
            `;

            // 이벤트 바인딩 (데이터 수정 허용)
            div.querySelector('input').addEventListener('change', () => {
                scene.selected_plan = idx + 1;
                this.renderNormalUI(scene); // 재렌더링
            });

            div.querySelector('textarea').addEventListener('input', (e) => {
                plan.description = e.target.value; // 원본 데이터 수정
            });

            container.appendChild(div);
        });
    }

    // === [UI Renderer 2] 체험 모드 (보라색) ===
    renderExperienceUI(scene) {
        const container = document.getElementById('visual-plans-container');
        if (!container) return;
        container.innerHTML = ''; // 초기화

        // 체험 데이터 가져오기 (Visual Plan을 건드리지 않음!)
        const exp = scene.experience_track || {};
        const hasExp = exp.has_experience;

        // 체험 정보 표시용 카드 생성 (Input/Textarea 아님)
        const div = document.createElement('div');
        div.style.background = '#2c1e33'; // 보라색 계열 배경
        div.style.border = '1px solid #9b59b6';
        div.style.padding = '15px';
        div.style.borderRadius = '6px';
        div.style.color = '#fff';

        if (hasExp) {
            div.innerHTML = `
                <h4 style="margin:0 0 10px 0; color:#e056fd;"><i class="fas fa-gamepad"></i> Experience Guide</h4>
                <div style="margin-bottom:8px;"><strong>Title:</strong> ${exp.title || '-'}</div>
                <div style="margin-bottom:8px;"><strong>Type:</strong> ${exp.interaction_type || '-'}</div>
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:4px; font-size:12px; line-height:1.4;">
                    ${exp.guide || '가이드 내용 없음'}
                </div>
                <div style="margin-top:10px; font-size:11px; color:#aaa;">
                    * 이 내용은 '체험 모드 AI Directing'의 프롬프트로 사용됩니다.
                </div>
            `;
        } else {
            div.innerHTML = `<div style="color:#aaa;">체험 데이터가 없는 씬입니다.</div>`;
        }

        container.appendChild(div);
    }

    bindOverlayData(scene) {
        const overlayEnabled = document.getElementById('overlay-enabled');
        const overlayText = document.getElementById('overlay-text');
        if (scene.keyword_emphasis) {
            overlayEnabled.checked = scene.keyword_emphasis.enabled !== false;
            overlayText.value = scene.keyword_emphasis.description || '';
        } else {
            overlayEnabled.checked = false;
            overlayText.value = '';
        }
    }

    async generateAiDirecting() {
        if (!this.editingScene) return alert("씬을 먼저 선택해주세요.");
        const btn = document.getElementById('btn-inspector-ai');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating...`;

        try {
            // ★ AI 요청 데이터 구성 (Deep Copy)
            let requestData = JSON.parse(JSON.stringify(this.editingScene));

            // 체험 모드라면, AI에게 보낼 때만 'Visual Plan'을 '체험 가이드'로 바꿔치기해서 보냄
            // (화면이나 원본 데이터는 건드리지 않음)
            if (this.currentMode === 'exp') {
                const exp = requestData.experience_track || {};
                const expData = `[Title] ${exp.title}\n[Type] ${exp.interaction_type}\n[Guide] ${exp.guide}`;

                // AI는 visual_plans[0]을 참고하므로 여기에 주입
                requestData.visual_plans = [{ type: 'Experience Guide', description: expData }];
            }

            requestData.isExperienceMode = (this.currentMode === 'exp');

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error((await response.json()).error);

            const result = await response.json();

            // 저장 위치 분기
            if (this.currentMode === 'exp') {
                this.editingScene.ai_planning_exp = result;
                alert(`AI 체험 기획안(Dark Green) 생성 완료!`);
            } else {
                this.editingScene.ai_planning = result;
                alert(`AI 표준 기획안(Green) 생성 완료!`);
            }

            this.save();

        } catch (e) {
            console.error(e);
            alert(`❌ AI 생성 실패: ${e.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}