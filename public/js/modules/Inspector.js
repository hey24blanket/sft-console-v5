// public/js/modules/Inspector.js
import { db } from './Database.js';

const TOOL_NAMES = {
    roadmap: "로드맵 (단계/흐름)", list: "리스트 (목록)", table: "표 (비교/대조)",
    chart_line: "라인 차트 (추이)", chart_bar: "막대 차트 (순위/비교)", chart_pie: "원형 차트 (비율)",
    definition: "단어 설명 (정의)", split_3: "3분할 (3요소)", split_5: "5분할 (5요소)",
    card_hierarchy: "카드 분류 (계층)", pictogram: "픽토그램 (상징)",
    speech_bubble: "말풍선 (핵심/질문)", callout: "콜아웃 (포커스)",
    big_title: "빅 타이틀 (주제)", mid_title: "미드 타이틀",
    display_explain: "디스플레이 (자료화면)", prompt_input: "프롬프트 입력 (타이핑)",
    action_animation: "액션 애니메이션 (이동/변화)"
};

export class Inspector {
    constructor(saveCallback) {
        this.container = document.getElementById('inspector-panel');
        this.currentScene = null;
        this.mode = 'general';
        this.saveCallback = saveCallback;
        this.activeKeywordTabIndex = 0;
        this.initEvents();
        this.initResize();
    }

    initEvents() {
        if (this.container) {
            this.container.addEventListener('click', (e) => {
                if (e.target.closest('.btn-close-inspector') || e.target.classList.contains('fa-times')) {
                    this.close();
                }
            });
        }
    }

    initResize() {
        const handle = this.container?.querySelector('.resize-handle');
        if (!handle) return;
        let startY, startHeight;
        const onMouseMove = (e) => {
            const deltaY = startY - e.clientY;
            const newHeight = startHeight + deltaY;
            if (newHeight > 200 && newHeight < window.innerHeight * 0.85) {
                this.container.style.height = `${newHeight}px`;
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };
        handle.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            startHeight = parseInt(window.getComputedStyle(this.container).height, 10);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });
    }

    open(scene, mode = 'general') {
        this.currentScene = scene;
        this.mode = mode;
        this.activeKeywordTabIndex = 0;
        this.render();
        if (this.container) this.container.classList.add('open');
    }

    close() {
        if (this.container) this.container.classList.remove('open');
        this.currentScene = null;
    }

    save() {
        if (this.saveCallback) this.saveCallback();
        if (window.Toast) window.Toast.show("Scene Data Saved");
        this.close();
    }

    async handleAiDirecting() {
        if (!this.currentScene) return;
        const btn = document.getElementById('btn-inspector-ai');
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            const config = await db.global_settings.get('main_config') || {};
            // ★ [KEY CHANGE] master -> api_prompt
            const promptData = await db.system_prompts.get('api_prompt');
            const systemPrompt = promptData ? promptData.content : "You are a creative director.";

            const payload = {
                formatted_id: this.currentScene.formatted_id,
                narrations: this.currentScene.narrations,
                visual_plans: this.currentScene.visual_plans,
                experience_track: this.currentScene.experience_track,
                customConfig: config.ai_config || {},
                customPrompts: { master: systemPrompt },
                isExperienceMode: (this.mode === 'experience')
            };

            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("AI Server Error");
            const result = await res.json();
            this.currentScene.ai_planning = result;

            if (window.TimelineRendererInstance) window.TimelineRendererInstance.render();
            if (window.AiResultModalInstance) {
                window.AiResultModalInstance.open(this.currentScene);
            } else {
                alert("AI Result Modal module not loaded.");
            }
        } catch (e) {
            console.error(e);
            alert("AI Generation Failed: " + e.message);
        } finally {
            if (btn) btn.innerHTML = '<i class="fas fa-magic"></i> AI Directing';
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '<div class="resize-handle" title="Drag to resize"></div>';

        if (!this.currentScene) {
            this.container.innerHTML += `<div style="padding:20px; color:#666;">씬을 선택해주세요.</div>`;
            return;
        }

        const scene = this.currentScene;
        const isRec = scene.is_screen_rec === true;
        const charCount = scene.total_char_count || (scene.narrations || []).join("").length;
        const durationSec = (charCount * (1200 / 7000)).toFixed(1);

        const header = document.createElement('div');
        header.className = 'inspector-header';
        header.style.padding = "10px 15px";
        header.style.background = "#252525";
        header.style.borderBottom = "1px solid #333";
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.innerHTML = `
            <div style="flex:1;">
                <div style="font-size:16px; font-weight:bold; color:#fff; display:flex; align-items:center; gap:8px;">
                    <span>${scene.formatted_id}</span>
                    ${isRec ? '<span style="color:#7f8c8d; font-size:11px; border:1px solid #555; padding:1px 4px; border-radius:3px;">Screen Rec</span>' : ''}
                    <span style="font-size:11px; color:#f1c40f; font-weight:normal; margin-left:5px;">
                        <i class="far fa-clock"></i> ${durationSec}s (${charCount}자)
                    </span>
                    ${this.mode === 'experience' ? '<span style="background:#8e44ad; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">EXP Mode</span>' : ''}
                </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                ${!isRec ? `<button class="btn" id="btn-inspector-ai" style="background:#8e44ad; color:white; font-size:11px; padding:5px 10px;"><i class="fas fa-magic"></i> AI Directing</button>` : ''}
                <button class="btn btn-primary" onclick="window.InspectorInstance.save()" style="font-size:11px; padding:5px 10px;">Save</button>
                <button class="btn-icon btn-close-inspector" style="font-size:14px;"><i class="fas fa-times"></i></button>
            </div>
        `;
        this.container.appendChild(header);

        const aiBtn = header.querySelector('#btn-inspector-ai');
        if (aiBtn) aiBtn.onclick = () => this.handleAiDirecting();

        const body = document.createElement('div');
        body.className = 'inspector-body';
        body.style.display = 'flex';
        body.style.padding = '15px';
        body.style.gap = '20px';
        body.style.height = 'calc(100% - 60px)';
        body.style.overflow = 'hidden';

        try {
            const col1 = document.createElement('div');
            col1.className = 'inspector-column';
            col1.style.flex = '1';
            col1.innerHTML = `
                <div style="font-size:11px; font-weight:bold; color:#888; margin-bottom:5px;">NARRATION</div>
                <div class="narration-section" style="background:#222; padding:10px; border-radius:4px; height:calc(100% - 25px); overflow-y:auto; border:1px solid #444;">
                    <div class="narration-text" style="color:#ddd; font-size:13px; line-height:1.6; white-space:pre-wrap;">${(scene.narrations || []).join("\n\n")}</div>
                </div>
            `;
            body.appendChild(col1);

            if (this.mode === 'experience') {
                const col2 = document.createElement('div');
                col2.className = 'inspector-column';
                col2.style.flex = '1';
                col2.appendChild(this.renderVectorUI(scene));
                body.appendChild(col2);

                const col3 = document.createElement('div');
                col3.className = 'inspector-column';
                col3.style.flex = '1.5';
                col3.appendChild(this.renderExperienceUI(scene));
                body.appendChild(col3);
            } else {
                if (isRec) {
                    const notice = document.createElement('div');
                    notice.style.flex = '2';
                    notice.style.display = 'flex';
                    notice.style.alignItems = 'center';
                    notice.style.justifyContent = 'center';
                    notice.style.flexDirection = 'column';
                    notice.style.color = '#7f8c8d';
                    notice.innerHTML = `<i class="fas fa-video" style="font-size:40px; margin-bottom:15px;"></i><div>Screen Recording Scene</div>`;
                    body.appendChild(notice);
                } else {
                    const col2 = document.createElement('div');
                    col2.className = 'inspector-column';
                    col2.style.flex = '1.5';
                    col2.appendChild(this.renderVectorUI(scene));
                    const spacer = document.createElement('div');
                    spacer.style.height = "15px";
                    col2.appendChild(spacer);
                    col2.appendChild(this.renderVisualPlansUI(scene));
                    body.appendChild(col2);

                    const col3 = document.createElement('div');
                    col3.className = 'inspector-column';
                    col3.style.flex = '1';
                    col3.appendChild(this.renderToolUI(scene));
                    const divKW = document.createElement('div');
                    divKW.style.height = '15px';
                    col3.appendChild(divKW);
                    col3.appendChild(this.renderKeywordUI(scene));
                    const divAsset = document.createElement('div');
                    divAsset.style.height = '15px';
                    col3.appendChild(divAsset);
                    col3.appendChild(this.renderAssetUI(scene));
                    body.appendChild(col3);
                }
            }
        } catch (err) {
            console.error("Inspector Render Error:", err);
            body.innerHTML += `<div style="padding:20px; color:red;"><h3>Error</h3><pre>${err.message}</pre></div>`;
        }

        this.container.appendChild(body);
        this.initResize();
    }

    renderVectorUI(scene) {
        const wrap = document.createElement('div');
        wrap.className = "inspector-section";
        wrap.innerHTML = `<h4 style="color:#3498db; margin-bottom:10px; font-size:13px;">1. Scene Vector (뉘앙스)</h4>`;
        const vec = scene.scene_control?.vector || { emotion: 0.5, pace: 0.5, information: 0.5 };
        ['emotion', 'pace', 'information'].forEach(key => {
            const row = document.createElement('div');
            row.style.marginBottom = "5px";
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.innerHTML = `
                <span style="width:70px; font-size:11px; color:#ccc;">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <input type="range" min="0.1" max="1.0" step="0.1" value="${vec[key]}" style="flex:1;">
                <span style="width:30px; font-size:11px; text-align:right; color:#fff;">${vec[key]}</span>
            `;
            row.querySelector('input').addEventListener('input', (e) => {
                vec[key] = parseFloat(e.target.value);
                row.querySelector('span:last-child').innerText = vec[key];
                if (scene.scene_control) scene.scene_control.source = "manual";
            });
            wrap.appendChild(row);
        });
        return wrap;
    }

    renderToolUI(scene) {
        const wrap = document.createElement('div');
        wrap.className = "inspector-section";
        wrap.innerHTML = `<h4 style="color:#f39c12; margin-bottom:10px; font-size:13px;">2. Tool Control (템플릿)</h4>`;
        const toolData = scene.tool_control || { ranked_tools: [], notes: "" };
        const currentToolId = toolData.ranked_tools[0]?.tool_id || "None";
        const keyDisplay = document.createElement('div');
        keyDisplay.style.background = 'rgba(243, 156, 18, 0.1)';
        keyDisplay.style.border = '1px solid #f39c12';
        keyDisplay.style.borderRadius = '4px';
        keyDisplay.style.padding = '8px';
        keyDisplay.style.marginBottom = '10px';
        keyDisplay.innerHTML = `<div style="font-size:10px; color:#f39c12; margin-bottom:2px;">Current Tool Key</div><div style="font-size:14px; font-weight:bold; color:#fff; font-family:monospace;">${currentToolId}</div>`;
        wrap.appendChild(keyDisplay);
        const select = document.createElement('select');
        select.style.width = "100%";
        select.style.background = "#222";
        select.style.color = "#eee";
        select.style.border = "1px solid #444";
        select.style.padding = "5px";
        let options = `<option value="">(선택 안함)</option>`;
        for (const [id, name] of Object.entries(TOOL_NAMES)) {
            options += `<option value="${id}" ${id === currentToolId ? 'selected' : ''}>${name}</option>`;
        }
        select.innerHTML = options;
        select.addEventListener('change', (e) => {
            toolData.ranked_tools = [{ tool_id: e.target.value, rank: 1, reason: "Manual" }];
            toolData.source = "manual";
            this.render();
        });
        wrap.appendChild(select);
        return wrap;
    }

    renderVisualPlansUI(scene) {
        const wrap = document.createElement('div');
        wrap.className = "inspector-section";
        wrap.innerHTML = `<h4 style="color:#2ecc71; margin-bottom:10px; font-size:13px;">3. Visual Plans (연출 묘사)</h4>`;
        const plans = scene.visual_plans || [{ priority: 1, name: "Plan A", description: "" }, { priority: 2, name: "Plan B", description: "" }];
        plans.forEach((plan, idx) => {
            const div = document.createElement('div');
            div.style.marginBottom = "10px";
            div.innerHTML = `<div style="font-size:11px; color:#888; margin-bottom:2px;">Priority ${plan.priority} (${idx === 0 ? 'High-End' : 'Light'})</div><input type="text" value="${plan.name || ''}" placeholder="Title" style="width:100%; background:#333; border:none; color:#fff; font-size:12px; padding:4px; margin-bottom:2px;"><textarea style="width:100%; height:60px; background:#222; border:1px solid #444; color:#ccc; font-size:11px;">${plan.description || ''}</textarea>`;
            div.querySelector('input').onchange = (e) => plan.name = e.target.value;
            div.querySelector('textarea').onchange = (e) => plan.description = e.target.value;
            wrap.appendChild(div);
        });
        return wrap;
    }

    renderKeywordUI(scene) {
        const wrap = document.createElement('div');
        wrap.className = "inspector-section";
        wrap.innerHTML = `<h4 style="color:#1abc9c; margin-bottom:10px; font-size:13px;">Keyword Emphasis (텍스트 강조)</h4>`;
        if (!scene.keyword_emphasis) scene.keyword_emphasis = [];
        else if (!Array.isArray(scene.keyword_emphasis)) scene.keyword_emphasis = [scene.keyword_emphasis];
        const keywords = scene.keyword_emphasis;

        const tabBar = document.createElement('div');
        tabBar.style.display = "flex"; tabBar.style.gap = "4px"; tabBar.style.marginBottom = "10px"; tabBar.style.flexWrap = "wrap";
        keywords.forEach((kw, idx) => {
            const btn = document.createElement('button');
            const isActive = idx === this.activeKeywordTabIndex;
            btn.innerText = `KW ${idx + 1}`;
            btn.style.cssText = `padding:4px 8px; font-size:11px; border:1px solid #444; background:${isActive ? "#1abc9c" : "#333"}; color:${isActive ? "#000" : "#ccc"}; cursor:pointer; border-radius:3px;`;
            btn.onclick = () => { this.activeKeywordTabIndex = idx; this.render(); };
            tabBar.appendChild(btn);
        });
        const addBtn = document.createElement('button');
        addBtn.innerText = "+";
        addBtn.style.cssText = "padding:4px 8px; font-size:11px; border:1px solid #444; background:#222; color:#1abc9c; cursor:pointer; border-radius:3px;";
        addBtn.onclick = () => { keywords.push({ keyword: "", location: "Center", action: "", highlight: "", sub_text: "" }); this.activeKeywordTabIndex = keywords.length - 1; this.render(); };
        tabBar.appendChild(addBtn);
        wrap.appendChild(tabBar);

        if (keywords.length === 0) {
            wrap.innerHTML += `<div style="text-align:center; color:#666; font-size:11px; padding:10px;">No keywords added.</div>`;
        } else {
            if (this.activeKeywordTabIndex >= keywords.length) this.activeKeywordTabIndex = 0;
            const currentKW = keywords[this.activeKeywordTabIndex];
            const formContainer = document.createElement('div');
            formContainer.style.cssText = "background:#2a2a2a; padding:10px; border-radius:4px; border:1px solid #333;";
            const createField = (label, key, ph, isArea = false) => {
                const div = document.createElement('div'); div.style.marginBottom = "8px";
                div.innerHTML = `<div style="font-size:10px; color:#888; margin-bottom:2px;">${label}</div>`;
                const input = isArea ? document.createElement('textarea') : document.createElement('input');
                if (isArea) input.style.height = "40px"; else input.type = "text";
                input.style.cssText += "width:100%; background:#1a1a1a; color:#eee; border:1px solid #444; padding:4px; font-size:12px;";
                input.placeholder = ph;
                input.value = currentKW[key] || "";
                input.onchange = (e) => currentKW[key] = e.target.value;
                div.appendChild(input);
                return div;
            };
            formContainer.appendChild(createField("Keyword", "keyword", "데이터"));
            formContainer.appendChild(createField("Location", "location", "Center"));
            formContainer.appendChild(createField("Action", "action", "Stacking up", true));
            formContainer.appendChild(createField("Highlight", "highlight", "Neon Glow"));
            formContainer.appendChild(createField("Sub Text", "sub_text", "설명"));

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Keyword';
            delBtn.style.cssText = "width:100%; padding:6px; margin-top:5px; background:#c0392b; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;";
            delBtn.onclick = () => { if (confirm("Delete?")) { keywords.splice(this.activeKeywordTabIndex, 1); this.activeKeywordTabIndex = Math.max(0, this.activeKeywordTabIndex - 1); this.render(); } };
            formContainer.appendChild(delBtn);
            wrap.appendChild(formContainer);
        }
        return wrap;
    }

    renderAssetUI(scene) {
        const wrap = document.createElement('div');
        wrap.className = "inspector-section";
        wrap.innerHTML = `<h4 style="color:#e67e22; margin-bottom:10px; font-size:13px;">4. Asset Advice</h4>`;
        const asset = scene.asset_advice || { type: "Stock_Search", content: "" };
        const typeSel = document.createElement('select');
        typeSel.style.cssText = "width:100%; background:#222; color:#eee; border:1px solid #444; margin-bottom:5px;";
        typeSel.innerHTML = `<option value="Stock_Search" ${asset.type === 'Stock_Search' ? 'selected' : ''}>Stock Search</option><option value="Gen_AI_Image" ${asset.type === 'Gen_AI_Image' ? 'selected' : ''}>Gen AI Image</option><option value="Gen_AI_Video" ${asset.type === 'Gen_AI_Video' ? 'selected' : ''}>Gen AI Video</option>`;
        typeSel.onchange = (e) => { if (!scene.asset_advice) scene.asset_advice = {}; scene.asset_advice.type = e.target.value; };
        wrap.appendChild(typeSel);
        const txt = document.createElement('textarea');
        txt.style.cssText = "width:100%; height:50px; background:#222; color:#ccc;";
        txt.value = asset.content || "";
        txt.onchange = (e) => { if (!scene.asset_advice) scene.asset_advice = { type: "Stock_Search" }; scene.asset_advice.content = e.target.value; };
        wrap.appendChild(txt);
        return wrap;
    }

    renderExperienceUI(scene) {
        const wrap = document.createElement('div');
        wrap.className = "inspector-section";
        wrap.innerHTML = `<h4 style="color:#9b59b6; margin-bottom:10px; font-size:13px;">5. Experience Track (체험)</h4>`;
        const hasExp = scene.experience_track && scene.experience_track.has_experience;
        const toggle = document.createElement('div');
        toggle.innerHTML = `<label style="color:#eee; font-size:12px;"><input type="checkbox" ${hasExp ? 'checked' : ''}> <span style="margin-left:5px;">체험 요소 활성화</span></label>`;
        wrap.appendChild(toggle);
        const detail = document.createElement('div');
        detail.style.cssText = `display:${hasExp ? "block" : "none"}; border-left:2px solid #9b59b6; padding-left:10px; margin-top:10px;`;
        const exp = scene.experience_track || { title: "", interaction_type: "", guide: "" };
        detail.innerHTML = `<input type="text" id="exp-title" placeholder="Title" value="${exp.title || ''}" style="width:100%; margin-bottom:5px; background:#333; color:#fff; border:none; padding:4px;"><input type="text" id="exp-type" placeholder="Type" value="${exp.interaction_type || ''}" style="width:100%; margin-bottom:5px; background:#333; color:#fff; border:none; padding:4px;"><textarea id="exp-guide" placeholder="Guide" style="width:100%; height:60px; background:#222; color:#ccc;">${exp.guide || ''}</textarea>`;
        wrap.appendChild(detail);
        toggle.querySelector('input').onchange = (e) => {
            const chk = e.target.checked;
            detail.style.display = chk ? "block" : "none";
            if (chk) { if (!scene.experience_track) scene.experience_track = { has_experience: true, title: "", interaction_type: "", guide: "" }; else scene.experience_track.has_experience = true; }
            else { scene.experience_track = null; }
        };
        detail.querySelectorAll('input, textarea').forEach(el => {
            el.onchange = (e) => {
                if (scene.experience_track) {
                    if (el.id === 'exp-title') scene.experience_track.title = e.target.value;
                    if (el.id === 'exp-type') scene.experience_track.interaction_type = e.target.value;
                    if (el.id === 'exp-guide') scene.experience_track.guide = e.target.value;
                }
            };
        });
        return wrap;
    }
}