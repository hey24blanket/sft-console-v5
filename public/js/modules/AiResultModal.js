// public/js/modules/AiResultModal.js
export class AiResultModal {
    constructor(projectManager) {
        this.pm = projectManager;
        this.scene = null;
        this.mode = 'general'; // general | experience
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.modal.id = 'ai-result-modal';
        this.initUI();
        document.body.appendChild(this.modal);
    }

    initUI() {
        this.modal.innerHTML = `
            <div class="modal-box" style="width: 1000px; height: 85%; background:#1e1e1e;">
                <div class="modal-header" style="justify-content:flex-start; gap:15px;">
                    <span id="ai-modal-title" style="color:#2ecc71; font-weight:bold; font-size:16px;"></span>
                    <div style="flex:1;"></div>
                    
                    <select id="ai-history-select" style="background:#111; color:#ddd; border:1px solid #444; padding:5px; border-radius:4px; max-width:200px;">
                        <option value="">Current Version</option>
                    </select>

                    <button class="btn-icon" id="btn-close-ai"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="display:flex; gap:20px; padding:20px;">
                    <div style="flex:1; overflow-y:auto; padding-right:10px;">
                        <h4 style="margin:0 0 10px 0; color:#aaa; border-bottom:1px solid #333; padding-bottom:5px;">Preview</h4>
                        <div id="ai-preview-container"></div>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column;">
                        <h4 style="margin:0 0 10px 0; color:#aaa; border-bottom:1px solid #333; padding-bottom:5px;">JSON Source</h4>
                        <textarea id="ai-json-editor" class="ide-editor" style="flex:1; border:1px solid #333; background:#111; color:#ccc; font-family:monospace; padding:10px;"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" id="btn-copy-ai"><i class="fas fa-copy"></i> Copy JSON</button>
                    <button class="btn btn-primary" id="btn-save-ai">Save & Close</button>
                </div>
            </div>
        `;

        this.modal.querySelector('#btn-close-ai').addEventListener('click', () => this.close());
        this.modal.querySelector('#btn-save-ai').addEventListener('click', () => this.save());
        this.modal.querySelector('#btn-copy-ai').addEventListener('click', () => this.copyJson());
        this.modal.querySelector('#ai-json-editor').addEventListener('input', (e) => this.updatePreview(e.target.value));

        // History Change
        this.modal.querySelector('#ai-history-select').addEventListener('change', (e) => {
            this.loadVersion(e.target.value);
        });
    }

    open(scene, mode = 'general') {
        this.scene = scene;
        this.mode = mode;

        // 데이터 선택 (일반 vs 체험)
        const currentData = mode === 'experience' ? scene.ai_planning_exp : scene.ai_planning;
        const historyData = mode === 'experience' ? scene.ai_history_exp : scene.ai_history;

        if (!currentData) return alert(`${mode === 'general' ? '일반' : '체험'} AI 데이터가 없습니다.`);

        // Title 설정
        const titleEl = this.modal.querySelector('#ai-modal-title');
        titleEl.innerHTML = mode === 'experience' ?
            `<i class="fas fa-gamepad"></i> AI Experience: ${scene.formatted_id}` :
            `<i class="fas fa-robot"></i> AI Plan: ${scene.formatted_id}`;
        titleEl.style.color = mode === 'experience' ? '#1abc9c' : '#2ecc71';

        // History Dropdown 설정
        const sel = this.modal.querySelector('#ai-history-select');
        sel.innerHTML = `<option value="current" selected>Current (Latest)</option>`;

        if (historyData && historyData.length > 0) {
            // 최신순 정렬
            [...historyData].reverse().forEach((h, idx) => {
                const time = new Date(h.timestamp).toLocaleTimeString();
                const verNum = historyData.length - idx;
                sel.innerHTML += `<option value="${h.id}">v${verNum} - ${time} (${h.model})</option>`;
            });
        }

        // 초기 데이터 로드
        const jsonText = JSON.stringify(currentData, null, 2);
        this.modal.querySelector('#ai-json-editor').value = jsonText;
        this.updatePreview(jsonText);

        this.modal.classList.add('open');
        this.modal.style.display = 'flex';
    }

    loadVersion(historyId) {
        if (historyId === 'current') {
            const currentData = this.mode === 'experience' ? this.scene.ai_planning_exp : this.scene.ai_planning;
            this.modal.querySelector('#ai-json-editor').value = JSON.stringify(currentData, null, 2);
            this.updatePreview(JSON.stringify(currentData, null, 2));
            return;
        }

        const historyList = this.mode === 'experience' ? this.scene.ai_history_exp : this.scene.ai_history;
        const record = historyList.find(h => h.id == historyId); // type casting 허용

        if (record) {
            this.modal.querySelector('#ai-json-editor').value = JSON.stringify(record.data, null, 2);
            this.updatePreview(JSON.stringify(record.data, null, 2));
        }
    }

    close() {
        this.modal.classList.remove('open');
        this.modal.style.display = 'none';
        this.scene = null;
    }

    updatePreview(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            const container = document.getElementById('ai-preview-container');
            container.innerHTML = '';

            // Plot Info
            if (data.plot) {
                container.innerHTML += `
                    <div style="background:#252525; padding:10px; border-radius:6px; margin-bottom:10px;">
                        <div style="color:var(--primary); font-weight:bold; font-size:12px;">Synopsis</div>
                        <div style="font-size:12px; color:#ddd; margin-bottom:5px;">${data.plot.synopsis || '-'}</div>
                        <div style="color:var(--accent); font-weight:bold; font-size:12px;">Metaphor</div>
                        <div style="font-size:12px; color:#ddd;">${data.plot.metaphor || '-'}</div>
                    </div>
                `;
            }

            // Actions
            const actions = data.micro_actions || [];
            if (actions.length === 0) {
                container.innerHTML += `<div style="color:#666;">No actions defined.</div>`;
            }

            actions.forEach(action => {
                container.innerHTML += `
                    <div style="background:#111; border:1px solid #333; padding:10px; margin-bottom:8px; border-radius:4px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span style="font-weight:bold; color:${this.mode === 'experience' ? '#1abc9c' : '#2ecc71'}; font-size:11px;">Action ${action.order}</span>
                            <span style="color:#aaa; font-size:11px;">${action.tech_spec || ''}</span>
                        </div>
                        <div style="font-weight:bold; font-size:12px; margin-bottom:3px;">${action.title}</div>
                        <div style="font-size:11px; color:#888; margin-bottom:5px;">🗣️ "${action.narration}"</div>
                        <div style="font-size:11px; color:#ddd;">👁️ ${action.visual_direction}</div>
                    </div>
                `;
            });
        } catch (e) {
            // 파싱 중 에러는 무시 (타이핑 중일 수 있음)
        }
    }

    save() {
        if (!this.scene) return;
        try {
            const newJson = JSON.parse(document.getElementById('ai-json-editor').value);

            // 현재 모드에 따라 저장 위치 결정
            if (this.mode === 'experience') {
                this.scene.ai_planning_exp = newJson;
            } else {
                this.scene.ai_planning = newJson;
            }

            // DB 저장 요청
            if (this.pm) this.pm.saveDirectorState();

            // 타임라인 리프레시 (혹시 내용 바뀌었을까봐)
            if (window.TimelineRendererInstance) window.TimelineRendererInstance.render();

            console.log("✅ AI Plan Saved");
            this.close();
        } catch (e) {
            alert("JSON 문법 오류! 저장할 수 없습니다.");
        }
    }

    copyJson() {
        const text = document.getElementById('ai-json-editor').value;
        navigator.clipboard.writeText(text).then(() => {
            alert("JSON Copied to Clipboard!");
        });
    }
}