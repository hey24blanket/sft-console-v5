export class TimelineRenderer {
    constructor(inspector, aiModal) {
        this.inspector = inspector;
        this.aiModal = aiModal;
        this.container = document.getElementById('track-content');
        this.ruler = document.getElementById('timeline-ruler');
        this.zoomSlider = document.getElementById('zoom-slider');
        this.durationDisplay = document.getElementById('tl-duration');

        this.zoom = 5;
        this.CHARS_PER_SECOND = 7000 / 1200;
        this.totalDuration = 0;

        // ★ 레이아웃 상수
        this.GAP_SIZE = 30;
        this.START_OFFSET = 20;
        this.DIVIDER_Y = 190;

        // 트랙 높이 정의
        this.TRACK_SCENE_Y = 70;
        this.TRACK_EXP_Y = 125;
        this.TRACK_AI_STD_Y = 230;     // 일반 AI (연두)
        this.TRACK_AI_EXP_Y = 265;     // ★ 체험 AI (짙은 녹색) - 아래에 추가

        this.initEvents();
    }

    initEvents() {
        this.zoomSlider?.addEventListener('input', (e) => {
            this.zoom = parseFloat(e.target.value);
            this.render();
        });

        const trackArea = document.getElementById('track-area');
        if (trackArea) {
            trackArea.addEventListener('scroll', () => {
                if (this.ruler) this.ruler.style.transform = `translateX(-${trackArea.scrollLeft}px)`;
            });
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

    render() {
        if (!window.directorJson) return;
        this.container.innerHTML = '';
        this.calculateTotalDuration();
        this.renderRuler();
        this.renderDivider();

        let currentLeft = this.START_OFFSET;

        (window.directorJson.sequences || []).forEach((seq) => {
            const seqStartPos = currentLeft;
            let seqDurationPixels = 0;

            (seq.scenes || []).forEach(scene => {
                let charCount = 0;
                if (scene.narrations) scene.narrations.forEach(n => charCount += n.length);
                const durSec = Math.max(1, charCount / this.CHARS_PER_SECOND);
                const width = durSec * this.zoom;
                seqDurationPixels += width;

                // 1. Blue Scene (Normal Mode)
                this.renderClip(scene, currentLeft, width, 'scene');

                // 2. Purple Experience (Exp Mode)
                if (scene.experience_track && scene.experience_track.has_experience) {
                    this.renderClip(scene, currentLeft, width, 'exp');
                }

                // 3. Green AI Plan (Standard)
                if (scene.ai_planning) {
                    this.renderClip(scene, currentLeft, width, 'ai_std');
                }

                // ★ 4. Dark Green AI Plan (Experience)
                if (scene.ai_planning_exp) {
                    this.renderClip(scene, currentLeft, width, 'ai_exp');
                }

                currentLeft += width + 2;
            });

            // Sequence Line
            const seqBlock = document.createElement('div');
            seqBlock.className = 'seq-block';
            seqBlock.style.position = 'absolute';
            seqBlock.style.top = '10px';
            seqBlock.style.left = `${seqStartPos}px`;
            seqBlock.style.width = `${seqDurationPixels}px`;
            seqBlock.style.borderTop = "3px solid var(--seq-line-color)";
            seqBlock.innerHTML = `
                <div class="seq-info" style="padding: 5px 2px;">
                    <div class="seq-title" style="color:var(--seq-line-color); font-size:12px; font-weight:bold; margin-bottom:2px;">${seq.title}</div>
                    <div class="seq-desc">${seq.plot_popup || ''}</div>
                </div>
            `;
            this.container.appendChild(seqBlock);

            currentLeft += this.GAP_SIZE;
        });

        this.container.style.width = `${currentLeft + 100}px`;
    }

    renderDivider() {
        const divider = document.createElement('div');
        divider.style.position = 'absolute';
        divider.style.top = `${this.DIVIDER_Y}px`;
        divider.style.left = '0';
        divider.style.width = '100%';
        divider.style.minWidth = '2000px';
        divider.style.height = '3px';
        divider.style.background = 'transparent';
        divider.style.borderBottom = '3px dashed #555';
        divider.style.zIndex = '0';
        this.container.appendChild(divider);
    }

    renderClip(scene, left, width, type) {
        const clip = document.createElement('div');
        clip.style.left = `${left}px`;
        clip.style.width = `${width}px`;
        clip.style.position = 'absolute';
        clip.style.cursor = 'pointer';
        clip.style.borderRadius = '4px';
        clip.style.overflow = 'hidden';
        clip.style.fontSize = '10px';
        clip.style.color = 'white';
        clip.style.padding = '2px 4px';
        clip.style.whiteSpace = 'nowrap';
        clip.style.boxSizing = 'border-box';
        clip.style.transition = '0.1s';

        if (type === 'scene') {
            clip.className = `track-clip ${scene.is_screen_rec ? 'screen-rec' : ''}`;
            clip.style.top = `${this.TRACK_SCENE_Y}px`;
            clip.style.height = '50px';
            clip.style.border = '1px solid rgba(255,255,255,0.2)';
            const planIdx = scene.selected_plan || 1;
            clip.innerHTML = `
                <div class="clip-head" style="display:flex; justify-content:space-between;">
                    <span>${scene.formatted_id}</span>
                    <span style="background:rgba(0,0,0,0.3); padding:0 3px; border-radius:2px;">P${planIdx}</span>
                </div>
            `;
            // ★ Normal Mode로 열기
            clip.onclick = () => {
                this.highlightClip(scene.formatted_id);
                this.inspector.open(scene, 'normal');
            };
        }
        else if (type === 'exp') {
            clip.className = 'experience-track-bar';
            clip.style.top = `${this.TRACK_EXP_Y}px`;
            clip.style.height = '30px';
            clip.style.background = 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)';
            clip.style.border = '1px solid #9b59b6';
            clip.innerText = `🎮 ${scene.experience_track.title || 'Exp'}`;
            // ★ Exp Mode로 열기
            clip.onclick = () => {
                this.highlightClip(scene.formatted_id);
                this.inspector.open(scene, 'exp');
            };
        }
        else if (type === 'ai_std') {
            clip.style.top = `${this.TRACK_AI_STD_Y}px`;
            clip.style.height = '30px';
            clip.style.background = 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'; // 연두
            clip.style.border = '1px solid #2ecc71';
            clip.innerHTML = `<i class="fas fa-robot"></i> AI Plan`;
            // AI Modal 열기 (일반 데이터)
            clip.onclick = () => this.aiModal.open({ ...scene, ai_planning: scene.ai_planning });
        }
        else if (type === 'ai_exp') {
            // ★ Dark Green AI Track
            clip.style.top = `${this.TRACK_AI_EXP_Y}px`;
            clip.style.height = '30px';
            clip.style.background = 'linear-gradient(135deg, #145a32 0%, #1e8449 100%)'; // 짙은 녹색
            clip.style.border = '1px solid #1e8449';
            clip.innerHTML = `<i class="fas fa-gamepad"></i> Exp AI`;
            // AI Modal 열기 (체험 데이터 - 모달이 인식하게 trick)
            // 모달은 scene.ai_planning을 읽으므로, exp 데이터를 거기로 매핑해서 넘김
            clip.onclick = () => this.aiModal.open({ ...scene, ai_planning: scene.ai_planning_exp });
        }

        this.container.appendChild(clip);
    }

    // ... (calculateTotalDuration, renderRuler 등 나머지는 기존과 동일) ...
    calculateTotalDuration() {
        this.totalDuration = 0;
        window.directorJson?.sequences?.forEach(seq => {
            seq.scenes?.forEach(scene => {
                let c = 0;
                scene.narrations?.forEach(n => c += n.length);
                this.totalDuration += Math.max(1, c / this.CHARS_PER_SECOND);
            });
        });
    }

    renderRuler() {
        if (!this.ruler) return;
        this.ruler.innerHTML = '';
        let timePos = 0;
        let pixelPos = this.START_OFFSET;
        const interval = 10;
        const maxTime = this.totalDuration + 120;

        while (timePos <= maxTime) {
            const mark = document.createElement('div');
            const isMajor = timePos % 60 === 0;
            mark.className = `ruler-mark ${isMajor ? 'major' : ''}`;
            mark.style.left = `${pixelPos}px`;
            if (isMajor || this.zoom > 5) {
                const min = Math.floor(timePos / 60);
                const sec = Math.floor(timePos % 60);
                mark.innerHTML = `<span class="ruler-label" style="margin-left:2px;">${min}:${sec.toString().padStart(2, '0')}</span>`;
            }
            this.ruler.appendChild(mark);
            timePos += interval;
            pixelPos += interval * this.zoom;
        }
    }

    highlightClip(id) {
        document.querySelectorAll('.track-clip.highlighted, .experience-track-bar.highlighted').forEach(el => el.classList.remove('highlighted'));
    }

    fitTimeline() {
        const trackArea = document.getElementById('track-area');
        if (!trackArea || !window.directorJson) return;
        this.calculateTotalDuration();
        const seqCount = window.directorJson.sequences ? window.directorJson.sequences.length : 0;
        const totalGapPixels = seqCount * this.GAP_SIZE;
        const availableWidth = trackArea.clientWidth - this.START_OFFSET - totalGapPixels - 150;
        let newZoom = availableWidth / this.totalDuration;
        if (newZoom <= 0) newZoom = 1;
        this.zoom = Math.max(0.2, Math.min(13, newZoom));
        if (this.zoomSlider) this.zoomSlider.value = this.zoom;
        this.render();
    }
}