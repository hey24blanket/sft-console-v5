// public/js/modules/UniversalDataManager.js
import { db } from './Database.js';
import { Toast } from './Toast.js';

const MODEL_SPECS = [
    { id: 'GPT-5.2-pro', provider: 'openai', name: 'GPT-5.2 Pro', desc: '최상급 추론/코딩 (High Cost)', price: '₩200 / 10k자' },
    { id: 'GPT-5.2', provider: 'openai', name: 'GPT-5.2', desc: '밸런스 모델 (Standard)', price: '₩60 / 10k자' },
    { id: 'GPT-5.1', provider: 'openai', name: 'GPT-5.1', desc: '초고속/저비용 (Cost Efficient)', price: '₩40 / 10k자' },
    { id: 'Gemini-3-pro', provider: 'google', name: 'Gemini 3 Pro', desc: '복합 추론/긴 문맥 (Premium)', price: '₩180 / 10k자' },
    { id: 'Gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', desc: '가성비 최강 (Best Value)', price: '₩110 / 10k자' },
    { id: 'Gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash', desc: '초고속 (Low Latency)', price: '₩20 / 10k자' }
];

export class UniversalDataManager {
    constructor(projectManager) {
        this.pm = projectManager;
        this.context = null;
        this.activeSourceId = null;
        this.activeSourceLabel = null;
        this.createModal();
    }

    createModal() {
        if (document.getElementById('udm-modal')) return;
        const div = document.createElement('div');
        div.id = 'udm-modal';
        div.className = 'modal-overlay';

        div.innerHTML = `
            <div class="modal-box" style="width: 1200px; height: 85vh; padding: 0; display:flex; flex-direction:column; background:#222;">
                <div class="modal-header" style="padding: 15px; background: #252525; border-bottom:1px solid #333; flex:0 0 auto;">
                    <span id="udm-title" style="font-weight:bold; color:#3498db;"><i class="fas fa-database"></i> Data Manager</span>
                    <button class="btn-icon" id="btn-udm-close"><i class="fas fa-times"></i></button>
                </div>

                <div class="modal-body udm-container">
                    <div class="udm-sidebar" style="width:280px; border-right:1px solid #333; background:#1a1a1a; display:flex; flex-direction:column;">
                        <div style="padding:10px; font-size:11px; font-weight:bold; color:#777; border-bottom:1px solid #333;">
                            VERSION HISTORY
                        </div>
                        <div id="udm-history-list" class="udm-history-list" style="flex:1; overflow-y:auto;"></div>
                    </div>

                    <div class="udm-main">
                        <div class="udm-toolbar" style="height:50px; background:#252525; border-bottom:1px solid #333; display:flex; align-items:center; justify-content:space-between; padding:0 15px;">
                            <div class="udm-info" style="display:flex; align-items:center;">
                                <span style="font-weight:bold; color:#fff; font-size:13px;">Running (Live)</span>
                                <span id="udm-source-info" class="source-info"></span>
                                <span id="udm-status" class="udm-status" style="font-size:11px; margin-left:10px;">● Unsaved Changes</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="udm-ver-label" placeholder="Version Label" style="width:140px; height:28px; background:#111; border:1px solid #444; color:white; padding:5px; font-size:12px;">
                                <button class="btn" id="btn-udm-save-ver" style="background:#d35400; color:white; padding:4px 10px;">
                                    <i class="fas fa-tag"></i> Save Version
                                </button>
                            </div>
                        </div>
                        
                        <div id="udm-content-wrapper">
                            <textarea id="udm-editor"></textarea>
                            <div id="udm-gui-form" style="display:none; padding:20px; overflow-y:auto; height:100%;"></div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="background: #252525; padding:15px; border-top:1px solid #333; flex:0 0 auto; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:11px; color:#666;">
                        * Save Version: 히스토리 저장 / Apply: 실제 반영 (GitHub Sync는 즉시 실행)
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn" id="btn-udm-cancel">Cancel</button>
                        <button class="btn btn-primary" id="btn-udm-apply" style="width:120px; font-weight:bold;">Apply & Close</button>
                    </div>
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

        this.editor.addEventListener('input', () => this.markUnsaved());
        this.guiForm.addEventListener('change', () => this.markUnsaved());
        this.guiForm.addEventListener('input', () => this.markUnsaved());

        window.switchUdmTab = (tabName) => this.switchSettingsTab(tabName);
        window.selectModel = (id) => this.selectModelCard(id);
        window.syncGithub = () => this.syncGithub();
    }

    markUnsaved() { this.modal.querySelector('#udm-status').classList.add('unsaved'); }

    async open(type, id, title) {
        this.context = { type, id, title };
        document.getElementById('udm-title').innerHTML = `<i class="fas fa-edit"></i> ${title}`;
        this.modal.classList.add('open');
        this.labelInput.value = '';
        this.activeSourceId = null;
        this.updateHeaderInfo();

        if (type === 'global_settings') {
            this.editor.style.display = 'none';
            this.guiForm.style.display = 'block';
            this.switchSettingsTab('ai'); // Default tab
        } else {
            this.editor.style.display = 'block';
            this.guiForm.style.display = 'none';
            await this.loadContentForEditor(type, id);
        }

        this.modal.querySelector('#udm-status').classList.remove('unsaved');
    }

    async switchSettingsTab(tabName) {
        const tabBtns = document.querySelectorAll('.udm-tab-btn');
        tabBtns.forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-btn-${tabName}`)?.classList.add('active');

        // ★ [Key Separation] 탭별로 다른 ID(Key) 사용
        if (tabName === 'ai' || tabName === 'github') {
            this.context.type = 'global_settings';
            this.context.id = 'main_config';
        } else if (tabName === 'prompts') {
            this.context.type = 'system_prompts';
            // ★ 기존 'master' -> 'api_prompt'로 변경하여 컨베이어와 구분
            this.context.id = 'api_prompt';
        }

        const content = await this.loadDataFromDB(this.context.type, this.context.id);
        this.renderSettingsGUI(tabName, content);
        await this.loadHistoryList();
    }

    async loadDataFromDB(type, id) {
        let data = null;
        if (type === 'global_settings') data = await db.global_settings.get(id);
        else if (type === 'stage_data') data = await db.stage_data.get({ pid: id[0], stage: id[1], type: id[2] });
        else if (type === 'system_prompts') data = await db.system_prompts.get(id);

        if (!data) return "";
        if (type === 'stage_data') return data.current || "";
        if (type === 'system_prompts') return data.content || "";
        if (type === 'global_settings') {
            const { id: _, ...rest } = data;
            return JSON.stringify(rest, null, 2);
        }
        return "";
    }

    async loadContentForEditor(type, id) {
        const content = await this.loadDataFromDB(type, id);
        this.editor.value = content;
        await this.loadHistoryList();
    }

    renderSettingsGUI(activeTab, contentJson) {
        let config = {};
        let promptContent = "";

        if (activeTab === 'prompts') {
            promptContent = contentJson;
        } else {
            try { config = JSON.parse(contentJson || "{}"); } catch (e) { }
        }

        const ai = config.ai_config || {};
        const gh = config.github_config || {};

        const tabsHtml = `
            <div class="udm-tabs" style="display:flex; border-bottom:1px solid #444; margin-bottom:15px;">
                <button id="tab-btn-ai" class="udm-tab-btn ${activeTab === 'ai' ? 'active' : ''}" onclick="switchUdmTab('ai')"><i class="fas fa-robot"></i> AI Model</button>
                <button id="tab-btn-prompts" class="udm-tab-btn ${activeTab === 'prompts' ? 'active' : ''}" onclick="switchUdmTab('prompts')"><i class="fas fa-comment-dots"></i> System Prompts</button>
                <button id="tab-btn-github" class="udm-tab-btn ${activeTab === 'github' ? 'active' : ''}" onclick="switchUdmTab('github')"><i class="fab fa-github"></i> GitHub</button>
            </div>
        `;
        let bodyHtml = '';

        if (activeTab === 'ai') {
            bodyHtml = `
                <div class="form-group">
                    <label class="form-label">API Key (OpenAI / Google)</label>
                    <input type="password" id="gui-api-key" class="form-input" value="${ai.api_key || ''}" placeholder="sk-...">
                </div>
                <label class="form-label" style="margin-top:15px;">Select Model</label>
                <div class="model-grid">
                    ${MODEL_SPECS.map(m => `
                        <div class="model-card ${ai.model === m.id ? 'selected' : ''}" onclick="selectModel('${m.id}')" id="card-${m.id}">
                            <div class="mc-name">${m.name}</div>
                            <div class="mc-desc">${m.desc}</div>
                            <div class="mc-price">${m.price}</div>
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="gui-selected-model" value="${ai.model || 'GPT-5.2-pro'}">
            `;
        }
        else if (activeTab === 'prompts') {
            // ★ [UI Fix] 텍스트 영역을 모달 꽉 차게 확장
            bodyHtml = `
                <div style="display:flex; flex-direction:column; height:100%; min-height:500px;">
                    <label class="form-label" style="color:#2ecc71; font-size:14px; margin-bottom:10px;">
                        <i class="fas fa-terminal"></i> API Prompt (AI Persona)
                    </label>
                    <div style="font-size:12px; color:#aaa; margin-bottom:10px;">
                        * 이곳은 'AI Directing' 버튼 클릭 시 API에 전송되는 페르소나 프롬프트입니다. (Conveyor 마스터 프롬프트와 별개)
                    </div>
                    <textarea id="gui-prompt-editor" style="flex:1; background:#111; color:#eee; border:1px solid #444; padding:15px; resize:none; line-height:1.6; font-family:'Consolas', monospace; font-size:14px;">${promptContent}</textarea>
                </div>
            `;
        }
        else if (activeTab === 'github') {
            bodyHtml = `
                <div class="form-group"><label class="form-label">Repository Owner</label><input type="text" id="gui-repo-owner" class="form-input" value="${gh.repo_owner || ''}"></div>
                <div class="form-group"><label class="form-label">Repository Name</label><input type="text" id="gui-repo-name" class="form-input" value="${gh.repo_name || ''}"></div>
                <div class="form-group"><label class="form-label">Branch</label><input type="text" id="gui-repo-branch" class="form-input" value="${gh.branch || 'main'}"></div>
                <div class="form-group"><label class="form-label">GitHub Token (PAT)</label><input type="password" id="gui-repo-token" class="form-input" value="${gh.token || ''}"></div>
                <div class="form-group"><label class="form-label">Local Path (Server)</label><input type="text" id="gui-local-path" class="form-input" value="${gh.local_path || ''}"></div>
                <button class="btn" onclick="syncGithub()" style="margin-top:20px; width:100%; background:#24292e; padding:10px;"><i class="fab fa-github"></i> Sync Now</button>
            `;
        }

        this.guiForm.innerHTML = tabsHtml + `<div class="udm-section active" style="height:calc(100% - 60px);">${bodyHtml}</div>`;
    }

    selectModelCard(id) {
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        document.getElementById(`card-${id}`).classList.add('selected');
        document.getElementById('gui-selected-model').value = id;
        this.markUnsaved();
    }

    getGuiData() {
        if (this.context.type !== 'global_settings' && this.context.type !== 'system_prompts') return this.editor.value;

        const promptEditor = document.getElementById('gui-prompt-editor');
        if (promptEditor) return promptEditor.value;

        const config = {
            ai_config: {
                model: document.getElementById('gui-selected-model')?.value || 'GPT-5.2-pro',
                api_key: document.getElementById('gui-api-key')?.value || ''
            },
            github_config: {
                repo_owner: document.getElementById('gui-repo-owner')?.value || '',
                repo_name: document.getElementById('gui-repo-name')?.value || '',
                branch: document.getElementById('gui-repo-branch')?.value || 'main',
                token: document.getElementById('gui-repo-token')?.value || '',
                local_path: document.getElementById('gui-local-path')?.value || ''
            },
            ui_config: { theme: "dark" }
        };
        return JSON.stringify(config, null, 2);
    }

    async syncGithub() {
        const btn = document.querySelector('button[onclick="syncGithub()"]');
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

        try {
            const configJson = this.getGuiData();
            const config = JSON.parse(configJson);

            const response = await fetch('/api/git/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (!response.ok) throw new Error("Sync Failed");
            const res = await response.json();
            if (window.Toast) Toast.show(res.message);
            else alert(res.message);
        } catch (e) {
            alert("Git Error: " + e.message);
        } finally {
            if (btn) btn.innerHTML = '<i class="fab fa-github"></i> Sync Now';
        }
    }

    async applyToLive() {
        const content = this.getGuiData();
        const { type, id } = this.context;
        try {
            if (type === 'global_settings') {
                const settingsObj = JSON.parse(content);
                settingsObj.id = id;
                await db.global_settings.put(settingsObj);
            } else if (type === 'system_prompts') {
                await db.system_prompts.put({ id: id, content: content, updatedAt: Date.now() });
            } else if (type === 'stage_data') {
                await db.stage_data.put({ pid: id[0], stage: id[1], type: id[2], current: content, updatedAt: Date.now() });
                if (window.ProjectMgrInstance) await window.ProjectMgrInstance.updateDashboardStatus();
            }
            if (window.Toast) Toast.show("Applied & Saved!");
            this.close();
        } catch (e) { console.error(e); alert("Save Error: " + e.message); }
    }

    async saveToHistory() {
        const content = this.getGuiData();
        const label = this.labelInput.value.trim() || 'Auto Save';
        const targetIdStr = Array.isArray(this.context.id) ? this.context.id.join('_') : this.context.id;
        try {
            await db.version_history.add({ target_type: this.context.type, target_id: targetIdStr, content, label, timestamp: Date.now() });
            if (window.Toast) Toast.show("Version Saved");
            this.labelInput.value = '';
            await this.loadHistoryList();
        } catch (e) { console.error(e); }
    }

    async loadHistoryList() {
        this.historyList.innerHTML = '';
        const targetIdStr = Array.isArray(this.context.id) ? this.context.id.join('_') : this.context.id;
        const history = await db.version_history.where('[target_type+target_id]').equals([this.context.type, targetIdStr]).reverse().sortBy('timestamp');

        const live = document.createElement('div');
        live.className = `version-item ${this.activeSourceId === null ? 'active-version' : ''}`;
        live.innerHTML = `<div class="ver-label">Running (Live)</div><div class="ver-date">Now editing...</div>`;
        if (this.activeSourceId === null) live.style.borderLeft = "4px solid #3498db";
        live.onclick = () => {
            this.activeSourceId = null;
            this.updateHeaderInfo(); this.loadHistoryList();
            this.switchSettingsTab(this.context.type === 'system_prompts' ? 'prompts' : 'ai');
        };
        this.historyList.appendChild(live);

        history.forEach(ver => {
            const el = document.createElement('div');
            const isActive = (ver.id == this.activeSourceId);
            el.className = `version-item ${isActive ? 'active-version' : ''}`;
            const badgeHtml = isActive ? `<span class="current-badge">CURRENT</span>` : '';
            el.innerHTML = `<div class="ver-label">${ver.label} ${badgeHtml}</div><div class="ver-date">${new Date(ver.timestamp).toLocaleString()}</div><div class="ver-tag">v${ver.id}</div>`;
            el.onclick = () => { if (confirm("Load this version?")) this.loadVersionToEditor(ver); };
            this.historyList.appendChild(el);
        });
    }

    loadVersionToEditor(version) {
        const activeTab = document.querySelector('.udm-tab-btn.active')?.innerText.includes('Prompts') ? 'prompts' : 'ai';

        if (activeTab === 'prompts') {
            document.getElementById('gui-prompt-editor').value = version.content;
        } else if (activeTab === 'ai' || activeTab === 'github') {
            this.renderSettingsGUI(activeTab, version.content);
        } else {
            this.editor.value = version.content;
        }

        this.activeSourceId = version.id;
        this.activeSourceLabel = version.label;
        this.updateHeaderInfo();
        this.loadHistoryList();
    }

    updateHeaderInfo() {
        const infoEl = document.getElementById('udm-source-info');
        infoEl.innerText = this.activeSourceId ? `- Based on: ${this.activeSourceLabel}` : '';
    }
    close() { this.modal.classList.remove('open'); this.context = null; }
}