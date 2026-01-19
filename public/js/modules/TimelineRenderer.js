// public/js/modules/TimelineRenderer.js
import { db } from './Database.js';

export class TimelineRenderer {
    constructor(inspector, aiModal) {
        this.inspector = inspector;
        this.aiModal = aiModal;
        this.container = document.getElementById('track-content');
        this.ruler = document.getElementById('timeline-ruler');
        this.zoomSlider = document.getElementById('zoom-slider');

        this.zoom = 5;
        this.CHARS_PER_SECOND = 7000 / 1200;
        this.totalDuration = 0;
        this.START_OFFSET = 20;
        this.GAP_SIZE = 30;

        this.TRACK_SCENE_Y = 80;
        this.TRACK_EXP_Y = 135;
        this.TRACK_AI_STD_Y = 180;
        this.TRACK_AI_EXP_Y = 215;

        this.initEvents();
        this.injectBatchButtons();
    }

    injectBatchButtons() {
        const controls = document.querySelector('.header-controls');
        if (!controls) return;

        const oldBtn1 = document.getElementById('btn-batch-gen');
        const oldBtn2 = document.getElementById('btn-batch-exp');
        if (oldBtn1) oldBtn1.remove();
        if (oldBtn2) oldBtn2.remove();

        // 1. General AI Button
        const btnGen = document.createElement('button');
        btnGen.id = 'btn-batch-gen';
        btnGen.className = 'btn';
        btnGen.style.marginLeft = '15px';
        btnGen.style.background = '#27ae60';
        btnGen.style.color = 'white';
        btnGen.style.border = '1px solid #2ecc71';
        btnGen.style.fontWeight = 'bold';
        btnGen.style.fontSize = '11px';
        btnGen.innerHTML = '<i class="fas fa-magic"></i> Gen All (General)';
        btnGen.onclick = () => this.runBatchAiDirecting('general', btnGen);

        // 2. Experience AI Button
        const btnExp = document.createElement('button');
        btnExp.id = 'btn-batch-exp';
        btnExp.className = 'btn';
        btnExp.style.marginLeft = '5px';
        btnExp.style.background = '#16a085';
        btnExp.style.color = 'white';
        btnExp.style.border = '1px solid #1abc9c';
        btnExp.style.fontWeight = 'bold';
        btnExp.style.fontSize = '11px';
        btnExp.innerHTML = '<i class="fas fa-gamepad"></i> Gen All (Exp)';
        btnExp.onclick = () => this.runBatchAiDirecting('experience', btnExp);

        controls.appendChild(btnGen);
        controls.appendChild(btnExp);
    }

    async runBatchAiDirecting(mode, btn) {
        if (!window.directorJson || !window.directorJson.sequences) return alert("데이터가 없습니다.");

        const label = mode === 'general' ? '일반 연출(General)' : '체험 연출(Experience)';
        if (!confirm(`모든 대상 씬에 대해 [${label}] AI 생성을 수행하시겠습니까?`)) return;

        const targets = [];
        window.directorJson.sequences.forEach(seq => {
            if (seq.scenes) {
                seq.scenes.forEach(scene => {
                    if (mode === 'general') {
                        if (scene.is_screen_rec !== true) targets.push(scene);
                    } else {
                        if (scene.experience_track && scene.experience_track.has_experience) targets.push(scene);
                    }
                });
            }
        });

        if (targets.length === 0) return alert("처리할 대상 씬이 없습니다.");

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.style.opacity = "0.7";

        try {
            const config = await db.global_settings.get('main_config') || {};

            // ★ [FIX] 프롬프트 ID 명확히 분기
            const promptId = mode === 'general' ? 'master_general' : 'master_exp';
            const promptData = await db.system_prompts.get(promptId);

            console.log(`[Batch] Loading Prompt: ${promptId}`, promptData); // 디버깅용 로그

            const systemPrompt = promptData ? promptData.content :
                (mode === 'general' ? "You are a creative director." : "You are an interaction designer.");

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < targets.length; i++) {
                const scene = targets[i];
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i + 1}/${targets.length}`;

                try {
                    const payload = {
                        formatted_id: scene.formatted_id,
                        narrations: scene.narrations,
                        visual_plans: scene.visual_plans,
                        experience_track: scene.experience_track,
                        customConfig: config.ai_config || {},
                        customPrompts: { master: systemPrompt },
                        isExperienceMode: (mode === 'experience')
                    };

                    const res = await fetch('/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) throw new Error("Server Error");
                    const result = await res.json();

                    const historyKey = mode === 'general' ? 'ai_history' : 'ai_history_exp';
                    const planningKey = mode === 'general' ? 'ai_planning' : 'ai_planning_exp';

                    if (!scene[historyKey]) scene[historyKey] = [];

                    scene[historyKey].push({
                        id: Date.now(),
                        timestamp: new Date().toISOString(),
                        model: config.ai_config?.model || "Batch-AI",
                        data: result
                    });

                    scene[planningKey] = result;
                    successCount++;

                } catch (e) {
                    console.error(`Failed [${mode}]: ${scene.formatted_id}`, e);
                    failCount++;
                }
            }

            alert(`[${label}] 완료!\n성공: ${successCount}건\n실패: ${failCount}건`);
            if (window.ProjectMgrInstance) await window.ProjectMgrInstance.saveDirectorState();
            this.render();

        } catch (err) {
            console.error(err);
            alert("오류 발생: " + err.message);
        } finally {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.innerHTML = originalText;
        }
    }

    // ... (initEvents, fitTimeline 등 나머지 메서드는 기존과 동일 유지)
    initEvents() {
        this.zoomSlider?.addEventListener('input', (e) => {
            this.zoom = parseFloat(e.target.value);
            this.render();
        });
        const trackArea = document.getElementById('track-area');
        if (trackArea) {
            trackArea.addEventListener('scroll', () => { if (this.ruler) this.ruler.style.transform = `translateX(-${trackArea.scrollLeft}px)`; });
            trackArea.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    this.zoom = Math.max(0.2, Math.min(13, this.zoom * delta));
                    if (this.zoomSlider) this.zoomSlider.value = this.zoom;
                    this.render();
                }
            });
        }
    }

    fitTimeline() {
        const trackArea = document.getElementById('track-area');
        if (!trackArea || !window.directorJson) return;
        this.calculateTotalDuration();
        if (this.totalDuration <= 0) return;
        const seqCount = window.directorJson.sequences ? window.directorJson.sequences.length : 0;
        const totalGapPixels = seqCount * this.GAP_SIZE;
        const availableWidth = trackArea.clientWidth - this.START_OFFSET - totalGapPixels - 50;
        let newZoom = availableWidth / this.totalDuration;
        this.zoom = Math.max(0.2, Math.min(13, newZoom));
        if (this.zoomSlider) this.zoomSlider.value = this.zoom;
        this.render();
    }

    render() {
        if (!window.directorJson) return;
        this.container.innerHTML = '';
        this.calculateTotalDuration();
        this.renderRuler();
        let currentLeft = this.START_OFFSET;
        (window.directorJson.sequences || []).forEach((seq) => {
            const seqStartPos = currentLeft;
            let seqDurationPixels = 0;
            (seq.scenes || []).forEach(scene => {
                const charCount = scene.total_char_count || (scene.narrations || []).join("").length;
                const durSec = Math.max(1, charCount / this.CHARS_PER_SECOND);
                const width = durSec * this.zoom;
                seqDurationPixels += width;

                this.renderClip(scene, currentLeft, width, 'scene');
                if (scene.experience_track && scene.experience_track.has_experience) {
                    this.renderClip(scene, currentLeft, width, 'exp');
                }
                if (scene.ai_planning) {
                    this.renderClip(scene, currentLeft, width, 'ai_std');
                }
                if (scene.ai_planning_exp) {
                    this.renderClip(scene, currentLeft, width, 'ai_exp');
                }
                currentLeft += width + 2;
            });
            const seqBlock = document.createElement('div');
            seqBlock.className = 'seq-block';
            seqBlock.style.cssText = `position:absolute; top:10px; left:${seqStartPos}px; width:${seqDurationPixels}px; height:60px; border-top:3px solid var(--seq-line-color);`;
            const descText = seq.plot_popup || seq.description || seq.synopsis || '';
            seqBlock.innerHTML = `<div class="seq-info"><div class="seq-title">${seq.title}</div><div class="seq-desc">${descText}</div></div>`;
            this.container.appendChild(seqBlock);
            currentLeft += this.GAP_SIZE;
        });
        this.container.style.width = `${currentLeft + 100}px`;
    }

    renderClip(scene, left, width, type) {
        const clip = document.createElement('div');
        clip.className = 'track-clip';
        clip.style.left = `${left}px`;
        clip.style.width = `${width}px`;
        clip.style.position = 'absolute';
        clip.style.cursor = 'pointer';

        if (type === 'scene') {
            const isRec = scene.is_screen_rec === true;
            clip.style.top = `${this.TRACK_SCENE_Y}px`;
            clip.style.height = '50px';
            clip.style.border = '1px solid #555';
            clip.style.background = isRec ? '#7f8c8d' : '#3498db';
            clip.innerHTML = `<div style="padding:4px; color:white; font-size:11px; font-weight:bold; display:flex; justify-content:space-between;"><span>${scene.formatted_id}</span>${isRec ? '<i class="fas fa-video"></i>' : ''}</div><div style="padding:0 4px; font-size:9px; color:#ddd; overflow:hidden; white-space:nowrap;">${(scene.narrations || [])[0] || ''}</div>`;
            clip.onclick = (e) => {
                e.stopPropagation();
                if (window.InspectorInstance) window.InspectorInstance.open(scene, 'general');
            };
        }
        else if (type === 'exp') {
            clip.style.top = `${this.TRACK_EXP_Y}px`;
            clip.style.height = '30px';
            clip.style.background = '#8e44ad';
            clip.style.border = '1px solid #9b59b6';
            clip.innerHTML = `<div style="padding:5px; color:white; font-size:10px; font-weight:bold;">🎮 Exp</div>`;
            clip.onclick = (e) => {
                e.stopPropagation();
                if (window.InspectorInstance) window.InspectorInstance.open(scene, 'experience');
            };
        }
        else if (type === 'ai_std') {
            clip.style.top = `${this.TRACK_AI_STD_Y}px`;
            clip.style.height = '25px';
            clip.style.background = '#2ecc71';
            clip.style.border = '1px solid #27ae60';
            clip.style.borderRadius = '3px';
            clip.title = "AI General Plan";
            clip.innerHTML = `<div style="color:#000; font-size:10px; font-weight:bold; padding:2px 4px; display:flex; align-items:center; gap:4px;"><i class="fas fa-robot"></i> ${scene.formatted_id}</div>`;
            clip.onclick = (e) => {
                e.stopPropagation();
                if (this.aiModal) this.aiModal.open(scene, 'general');
            };
        }
        else if (type === 'ai_exp') {
            clip.style.top = `${this.TRACK_AI_EXP_Y}px`;
            clip.style.height = '25px';
            clip.style.background = '#16a085';
            clip.style.border = '1px solid #1abc9c';
            clip.style.borderRadius = '3px';
            clip.title = "AI Experience Plan";
            clip.innerHTML = `<div style="color:white; font-size:10px; font-weight:bold; padding:2px 4px; display:flex; align-items:center; gap:4px;"><i class="fas fa-gamepad"></i> EXP</div>`;
            clip.onclick = (e) => {
                e.stopPropagation();
                if (this.aiModal) this.aiModal.open(scene, 'experience');
            };
        }
        this.container.appendChild(clip);
    }

    calculateTotalDuration() {
        this.totalDuration = 0;
        window.directorJson?.sequences?.forEach(seq => {
            seq.scenes?.forEach(scene => {
                const charCount = scene.total_char_count || (scene.narrations || []).join("").length;
                this.totalDuration += Math.max(1, charCount / this.CHARS_PER_SECOND);
            });
        });
    }

    renderRuler() {
        if (!this.ruler) return;
        this.ruler.innerHTML = '';
        let timePos = 0;
        let pixelPos = this.START_OFFSET;
        const maxTime = this.totalDuration + 60;
        while (timePos <= maxTime) {
            const isMajor = timePos % 60 === 0;
            const mark = document.createElement('div');
            mark.className = `ruler-mark ${isMajor ? 'major' : ''}`;
            mark.style.left = `${pixelPos}px`;
            if (isMajor) mark.innerText = `${Math.floor(timePos / 60)}:${(timePos % 60).toString().padStart(2, '0')}`;
            this.ruler.appendChild(mark);
            timePos += 10;
            pixelPos += 10 * this.zoom;
        }
    }
}