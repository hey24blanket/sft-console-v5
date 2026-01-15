export class AiResultModal {
    constructor(projectManager) {
        this.pm = projectManager;
        this.scene = null;
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.modal.id = 'ai-result-modal';
        this.initUI();
        document.body.appendChild(this.modal);
    }

    initUI() {
        this.modal.innerHTML = `
            <div class="modal-box" style="width: 900px; height: 80%; background:#1e1e1e;">
                <div class="modal-header">
                    <span id="ai-modal-title" style="color:#2ecc71"><i class="fas fa-robot"></i> AI Micro-Actions</span>
                    <button class="btn-icon" id="btn-close-ai"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="display:flex; gap:20px; padding:20px;">
                    <div style="flex:1; overflow-y:auto; padding-right:10px;">
                        <h4 style="margin:0 0 10px 0; color:#aaa;">Preview</h4>
                        <div id="ai-preview-container"></div>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column;">
                        <h4 style="margin:0 0 10px 0; color:#aaa;">JSON Source</h4>
                        <textarea id="ai-json-editor" class="ide-editor" style="flex:1; border:1px solid #333;"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" id="btn-copy-ai"><i class="fas fa-copy"></i> Copy JSON</button>
                    <button class="btn btn-primary" id="btn-save-ai">Save & Close</button>
                </div>
            </div>
        `;

        // Event Binding
        this.modal.querySelector('#btn-close-ai').addEventListener('click', () => this.close());
        this.modal.querySelector('#btn-save-ai').addEventListener('click', () => this.save());
        this.modal.querySelector('#btn-copy-ai').addEventListener('click', () => this.copyJson());

        // JSON 수정 시 Preview 실시간 갱신 (선택사항, 에러 방지 위해 blur 시 갱신 권장)
        this.modal.querySelector('#ai-json-editor').addEventListener('blur', (e) => this.updatePreview(e.target.value));

        // 배경 클릭 시 닫기 (자동 저장 포함)
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.save();
        });
    }

    open(scene) {
        if (!scene || !scene.ai_planning) return alert("AI 생성 데이터가 없습니다.");

        this.scene = scene;
        const jsonText = JSON.stringify(scene.ai_planning, null, 2);

        this.modal.querySelector('#ai-modal-title').innerHTML = `<i class="fas fa-robot"></i> AI Plan: ${scene.formatted_id}`;
        this.modal.querySelector('#ai-json-editor').value = jsonText;
        this.updatePreview(jsonText);

        this.modal.classList.add('open');
        this.modal.style.display = 'flex';
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
            (data.micro_actions || []).forEach(action => {
                container.innerHTML += `
                    <div style="background:#111; border:1px solid #333; padding:10px; margin-bottom:8px; border-radius:4px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span style="font-weight:bold; color:#2ecc71; font-size:11px;">Action ${action.order}</span>
                            <span style="color:#aaa; font-size:11px;">${action.tech_spec || ''}</span>
                        </div>
                        <div style="font-weight:bold; font-size:12px; margin-bottom:3px;">${action.title}</div>
                        <div style="font-size:11px; color:#888; margin-bottom:5px;">🗣️ "${action.narration}"</div>
                        <div style="font-size:11px; color:#ddd;">👁️ ${action.visual_direction}</div>
                    </div>
                `;
            });

        } catch (e) {
            console.error("JSON Preview Error:", e);
            document.getElementById('ai-preview-container').innerHTML = `<div style="color:red;">Invalid JSON</div>`;
        }
    }

    save() {
        if (!this.scene) return;
        try {
            const newJson = JSON.parse(document.getElementById('ai-json-editor').value);
            this.scene.ai_planning = newJson; // 메모리 업데이트

            // DB 자동 저장 요청
            if (this.pm) this.pm.saveDirectorState();

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