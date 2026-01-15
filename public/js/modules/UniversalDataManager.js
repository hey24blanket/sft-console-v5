import { db } from './Database.js';
import { Toast } from './Toast.js';

// ★ 모델 정보 데이터베이스 (2026년 기준)
const MODEL_SPECS = [
    { id: 'GPT-5.2-pro', provider: 'openai', name: 'GPT-5.2 Pro', desc: '최고급, 긴 맥락/최상 정밀도', price: '₩200 / 10k자' },
    { id: 'GPT-5.2', provider: 'openai', name: 'GPT-5.2', desc: '안정성 + 강력함 + 실사용 추천', price: '₩60 / 10k자' },
    { id: 'GPT-5.1', provider: 'openai', name: 'GPT-5.1', desc: '비용 절감형, 빠른 응답 속도', price: '₩10 / 10k자' },
    { id: 'Gemini-3-pro', provider: 'google', name: 'Gemini 3 Pro', desc: '강력한 문서/논리 처리 능력', price: '₩180 / 10k자' },
    { id: 'Gemini-3-bison', provider: 'google', name: 'Gemini 3 Bison', desc: '성능과 속도의 균형 (Balanced)', price: '₩40 / 10k자' },
    { id: 'Gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', desc: '안정성이 검증된 운영용 모델', price: '₩50 / 10k자' }
];

export class UniversalDataManager {
    constructor(projectManager) {
        this.pm = projectManager;
        this.context = null;
        this.createModal();
    }

    createModal() {
        const div = document.createElement('div');
        div.id = 'udm-modal';
        div.className = 'modal-overlay';
        div.innerHTML = `
            <div class="modal-box" style="width: 1000px; height: 750px; padding: 0; display:flex; flex-direction:column;">
                <div class="modal-header" style="padding: 15px; background: #252525; flex:0 0 auto;">
                    <span id="udm-title"><i class="fas fa-database"></i> Data Manager</span>
                    <button class="btn-icon" id="btn-udm-close"><i class="fas fa-times"></i></button>
                </div>

                <div class="modal-body udm-container" style="flex:1; overflow:hidden;">
                    <div class="udm-sidebar">
                        <div style="padding:10px; font-size:11px; font-weight:bold; color:#777; border-bottom:1px solid #333;">
                            VERSION HISTORY
                        </div>
                        <div id="udm-history-list" class="udm-history-list"></div>
                    </div>

                    <div class="udm-main">
                        <div class="udm-toolbar">
                            <div class="udm-info">
                                <span id="udm-current-ver">Current Live Data</span>
                                <span id="udm-status" class="udm-status">● Unsaved Changes</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="udm-ver-label" placeholder="Version Label" style="width:150px; height:30px;">
                                <button class="btn" id="btn-udm-save-ver" style="background:#d35400; color:white;">
                                    <i class="fas fa-tag"></i> Save Version
                                </button>
                            </div>
                        </div>
                        
                        <div id="udm-content-wrapper" style="flex:1; position:relative; overflow-y:auto;">
                            <textarea id="udm-editor" class="ide-editor"></textarea>
                            <div id="udm-gui-form" style="display:none; padding:20px;"></div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="background: #252525; flex:0 0 auto;">
                    <div style="flex:1; text-align:left; font-size:11px; color:#666; padding-top:8px;">
                        * Save Version: 히스토리 저장 / Apply: 실제 반영
                    </div>
                    <button class="btn" id="btn-udm-cancel">Cancel</button>
                    <button class="btn btn-primary" id="btn-udm-apply" style="width:120px; font-weight:bold;">
                        Apply & Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        this.modal = div;
        this.editor = div.querySelector('#udm-editor');
        this.guiForm = div.querySelector('#udm-gui-form');
        this.historyList = div.querySelector('#udm-history-list');
        this.labelInput = div.querySelector('#udm-ver-label');

        div.querySelector('#btn-udm-close').onclick = () => this.close();
        div.querySelector('#btn-udm-cancel').onclick = () => this.close();
        div.querySelector('#btn-udm-apply').onclick = () => this.applyToLive();
        div.querySelector('#btn-udm-save-ver').onclick = () => this.saveToHistory();

        // 변경 감지
        this.editor.addEventListener('input', () => this.markUnsaved());
        this.guiForm.addEventListener('change', () => this.markUnsaved());
        this.guiForm.addEventListener('input', () => this.markUnsaved());
    }

    markUnsaved() {
        this.modal.querySelector('#udm-status').classList.add('unsaved');
    }

    async open(type, id, title) {
        this.context = { type, id, title };
        document.getElementById('udm-title').innerHTML = `<i class="fas fa-edit"></i> ${title}`;
        this.modal.classList.add('open');
        this.labelInput.value = '';

        // 데이터 로드
        let data = null;
        if (type === 'global_settings') data = await db.global_settings.get(id);
        else if (type === 'stage_data') data = await db.stage_data.get(id);
        else if (type === 'system_prompts') data = await db.system_prompts.get(id);

        let content = "";
        if (data) {
            if (type === 'stage_data') content = data.current || "";
            else if (type === 'system_prompts') content = data.content || "";
            else if (type === 'global_settings') {
                const { id: _, ...rest } = data;
                content = JSON.stringify(rest, null, 2);
            }
        }

        // ★ 설정(global_settings)일 때만 GUI 폼 표시
        if (type === 'global_settings') {
            this.editor.style.display = 'none';
            this.guiForm.style.display = 'block';
            this.renderSettingsGUI(content);
        } else {
            this.editor.style.display = 'block';
            this.guiForm.style.display = 'none';
            this.editor.value = content;
        }

        this.modal.querySelector('#udm-status').classList.remove('unsaved');
        document.getElementById('udm-current-ver').innerText = "Running (Live)";
        await this.loadHistoryList();
    }

    // ★ GUI 렌더링 (탭 + 카드 시스템 + GitHub Sync)
    renderSettingsGUI(jsonContent) {
        let config = {};
        try { config = JSON.parse(jsonContent || "{}"); } catch (e) { }

        const ai = config.ai_config || {};
        const gh = config.github_config || {};

        this.guiForm.innerHTML = `
            <div class="udm-tabs">
                <button class="udm-tab-btn active" onclick="switchUdmTab('ai')"><i class="fas fa-robot"></i> AI Model</button>
                <button class="udm-tab-btn" onclick="switchUdmTab('github')"><i class="fab fa-github"></i> GitHub</button>
            </div>

            <div id="udm-sec-ai" class="udm-section active">
                <div class="form-group">
                    <label class="form-label">API Key (OpenAI / Gemini)</label>
                    <input type="password" id="gui-api-key" class="form-input" placeholder="sk-..." value="${ai.api_key || ''}">
                    <div style="font-size:11px; color:#666; margin-top:5px;">* 비워두면 .env 키 사용</div>
                </div>

                <label class="form-label" style="margin-top:20px;">Select AI Model</label>
                <div class="model-grid">
                    ${MODEL_SPECS.map(m => `
                        <div class="model-card ${ai.model === m.id ? 'selected' : ''}" onclick="selectModel('${m.id}')" id="card-${m.id}">
                            <div class="mc-name">
                                <i class="fas ${m.provider === 'openai' ? 'fa-bolt' : 'fa-star'}" style="color:${m.provider === 'openai' ? '#10a37f' : '#4285f4'}"></i>
                                ${m.name}
                            </div>
                            <div class="mc-desc">${m.desc}</div>
                            <div class="mc-price">${m.price}</div>
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="gui-selected-model" value="${ai.model || 'GPT-5.2-pro'}">
            </div>

            <div id="udm-sec-github" class="udm-section">
                <div class="form-group">
                    <label class="form-label">Repository Owner (User/Org)</label>
                    <input type="text" id="gui-repo-owner" class="form-input" placeholder="e.g. MyUserName" value="${gh.repo_owner || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Repository Name</label>
                    <input type="text" id="gui-repo-name" class="form-input" placeholder="e.g. sft-console-project" value="${gh.repo_name || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Branch</label>
                    <input type="text" id="gui-repo-branch" class="form-input" placeholder="main" value="${gh.branch || 'main'}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Personal Access Token (PAT)</label>
                    <input type="password" id="gui-repo-token" class="form-input" placeholder="ghp_..." value="${gh.token || ''}">
                    <div style="font-size:11px; color:#666; margin-top:5px;">* 비워두면 .env의 GITHUB_TOKEN 사용</div>
                </div>

                <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
                <div class="form-group">
                    <label class="form-label">Local Project Path (Absolute Path)</label>
                    <input type="text" id="gui-local-path" class="form-input" placeholder="C:/Projects/MySFTProject" value="${gh.local_path || ''}">
                    <div style="font-size:11px; color:#aaa; margin-top:5px;">
                        <i class="fas fa-exclamation-triangle"></i> 서버가 이 경로의 파일들을 Git으로 업로드합니다.
                    </div>
                </div>

                <div style="margin-top:20px; text-align:right;">
                    <button class="btn" id="btn-git-sync" onclick="syncGithub()" style="background:#24292e; border:1px solid #444;">
                        <i class="fab fa-github"></i> Push to GitHub Now
                    </button>
                </div>
            </div>
        `;

        // --- 전역 함수 바인딩 ---

        // 1. 탭 전환
        window.switchUdmTab = (tab) => {
            document.querySelectorAll('.udm-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.udm-section').forEach(s => s.classList.remove('active'));

            if (tab === 'ai') {
                document.querySelector('[onclick="switchUdmTab(\'ai\')"]').classList.add('active');
                document.getElementById('udm-sec-ai').classList.add('active');
            } else {
                document.querySelector('[onclick="switchUdmTab(\'github\')"]').classList.add('active');
                document.getElementById('udm-sec-github').classList.add('active');
            }
        };

        // 2. 모델 선택
        window.selectModel = (id) => {
            document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
            document.getElementById(`card-${id}`).classList.add('selected');
            document.getElementById('gui-selected-model').value = id;
            this.markUnsaved();
        };

        // 3. GitHub Sync 실행
        window.syncGithub = async () => {
            const btn = document.getElementById('btn-git-sync');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Syncing...`;

            try {
                // 현재 입력값 가져오기 (저장 안 해도 폼 값으로 시도)
                const formData = this.getGuiData();
                const config = JSON.parse(formData);

                // 서버 요청
                const response = await fetch('/api/git/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Git Sync Failed");
                }

                const res = await response.json();
                if (window.Toast) window.Toast.show(res.message);
                else alert(res.message);

            } catch (e) {
                console.error(e);
                alert(`❌ Git Error: ${e.message}`);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };
    }

    // 현재 GUI 값을 JSON 문자열로 변환
    getGuiData() {
        if (this.context.type !== 'global_settings') return this.editor.value;

        // 폼에서 값 읽기
        const aiModel = document.getElementById('gui-selected-model').value;
        const apiKey = document.getElementById('gui-api-key').value;
        const provider = aiModel.toLowerCase().includes('gemini') ? 'google' : 'openai';

        const config = {
            ai_config: {
                provider: provider,
                model: aiModel,
                api_key: apiKey
            },
            github_config: {
                repo_owner: document.getElementById('gui-repo-owner').value,
                repo_name: document.getElementById('gui-repo-name').value,
                branch: document.getElementById('gui-repo-branch').value,
                local_path: document.getElementById('gui-local-path').value,
                token: document.getElementById('gui-repo-token').value
            },
            ui_config: { theme: "dark" }
        };
        return JSON.stringify(config, null, 2);
    }

    // --- 저장 및 로드 로직 (getGuiData 사용) ---

    async saveToHistory() {
        const content = this.getGuiData();
        const label = this.labelInput.value.trim() || 'Auto Save';
        const targetIdStr = Array.isArray(this.context.id) ? this.context.id.join('_') : this.context.id;

        await db.version_history.add({
            target_type: this.context.type,
            target_id: targetIdStr,
            content: content,
            label: label,
            timestamp: Date.now()
        });

        if (window.Toast) Toast.show(`Version Saved: ${label}`);
        this.labelInput.value = '';
        await this.loadHistoryList();
    }

    async applyToLive() {
        const content = this.getGuiData();
        const { type, id } = this.context;

        try {
            if (type === 'global_settings') {
                const settingsObj = JSON.parse(content);
                settingsObj.id = id;
                settingsObj.updatedAt = Date.now();
                await db.global_settings.put(settingsObj);
            } else if (type === 'stage_data') {
                const record = { pid: id[0], stage: id[1], type: id[2], current: content, updatedAt: Date.now() };
                await db.stage_data.put(record);
                if (this.pm) this.pm.updateDashboardStatus();
            } else if (type === 'system_prompts') {
                await db.system_prompts.put({ id: id, content: content, updatedAt: Date.now() });
            }

            if (window.Toast) Toast.show("Settings Applied!");
            this.close();
        } catch (e) {
            console.error(e);
            alert("Save Failed: " + e.message);
        }
    }

    close() {
        this.modal.classList.remove('open');
        this.context = null;
    }

    async loadHistoryList() {
        this.historyList.innerHTML = '';
        const targetIdStr = Array.isArray(this.context.id) ? this.context.id.join('_') : this.context.id;

        const history = await db.version_history
            .where({ target_type: this.context.type, target_id: targetIdStr })
            .reverse()
            .sortBy('timestamp');

        const liveItem = document.createElement('div');
        liveItem.className = 'version-item active';
        liveItem.innerHTML = `<div class="ver-label">Running (Live)</div><div class="ver-date">Now editing...</div>`;
        liveItem.onclick = () => {
            if (this.context.type === 'global_settings') this.renderSettingsGUI(this.getGuiData());
            else this.editor.value = this.getGuiData();
            this.renderActiveItem(liveItem);
        };
        this.historyList.appendChild(liveItem);

        history.forEach(ver => {
            const el = document.createElement('div');
            el.className = 'version-item';
            const date = new Date(ver.timestamp).toLocaleString();
            el.innerHTML = `
                <div class="ver-label">${ver.label || 'No Label'}</div>
                <div class="ver-date">${date}</div>
                <div class="ver-tag">v${ver.id}</div>
            `;
            el.onclick = () => {
                if (this.context.type === 'global_settings') this.renderSettingsGUI(ver.content);
                else this.editor.value = ver.content;
                this.renderActiveItem(el);
                this.markUnsaved();
            };
            this.historyList.appendChild(el);
        });
    }

    renderActiveItem(el) {
        this.historyList.querySelectorAll('.version-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
    }
}