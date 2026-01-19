import { db } from './Database.js';

const TOOL_ICONS = {
    roadmap: "fa-map-signs",
    list: "fa-list-ul",
    table: "fa-table",
    chart_line: "fa-chart-line",
    chart_bar: "fa-chart-bar",
    chart_pie: "fa-chart-pie",
    definition: "fa-book",
    split_3: "fa-columns",
    split_5: "fa-grip-horizontal",
    card_hierarchy: "fa-sitemap",
    pictogram: "fa-icons",
    speech_bubble: "fa-comment-dots",
    callout: "fa-bullseye",
    big_title: "fa-heading",
    mid_title: "fa-subscript",
    display_explain: "fa-desktop",
    prompt_input: "fa-keyboard",
    action_animation: "fa-running",
    default: "fa-cube"
};

export class ConveyorRenderer {
    constructor() {
        // [FIX] HTML에 conveyor-belt가 없으면 자동으로 생성 (에러 방지 핵심)
        this.container = document.getElementById('conveyor-belt');

        if (!this.container) {
            const parent = document.getElementById('view-conveyor');
            if (parent) {
                // 부모 뷰 안에 툴바와 컨테이너를 동적으로 생성
                parent.innerHTML = `
                    <div class="conv-toolbar">
                        <div style="font-weight:bold; color:#eee;">Production Line</div>
                    </div>
                    <div class="conv-container">
                        <div id="conveyor-belt" style="display:flex; gap:15px; overflow-x:auto; height:100%; width:100%; align-items:flex-start;"></div>
                    </div>
                `;
                this.container = document.getElementById('conveyor-belt');
            }
        }
    }

    loadData() {
        if (!window.directorJson || !window.directorJson.sequences) return;
        this.render();
    }

    render() {
        // [FIX] 안전장치: 컨테이너가 여전히 없으면 중단
        if (!this.container) return console.warn("Conveyor container not found.");

        this.container.innerHTML = '';

        const json = window.directorJson;
        json.sequences.forEach(seq => {
            if (seq.scenes) {
                seq.scenes.forEach(scene => {
                    this.renderSceneCard(scene);
                });
            }
        });
    }

    renderSceneCard(scene) {
        const card = document.createElement('div');
        // 스타일 직접 주입 (CSS 의존성 줄임)
        card.className = 'scene-card';
        card.style.cssText = `
            min-width: 200px; width: 200px; background: #252525; border-radius: 6px; 
            padding: 10px; cursor: pointer; border-left: 4px solid #555;
            display: flex; flex-direction: column; gap: 5px; flex-shrink: 0;
        `;

        card.onclick = () => {
            document.querySelectorAll('.scene-card').forEach(c => c.style.borderColor = ''); // 초기화
            // card.style.borderColor = '#3498db'; // 활성 효과
            if (window.InspectorInstance) window.InspectorInstance.open(scene);
        };

        const isRec = scene.is_screen_rec === true;
        const toolData = scene.tool_control || {};
        const expData = scene.experience_track || {};
        const hasExp = expData.has_experience === true;
        const hasAiPlan = scene.visual_plans && scene.visual_plans.length > 0;

        if (isRec) {
            card.style.borderLeftColor = "#e74c3c";
            card.style.background = "#2c1a1a";
        } else if (hasExp) {
            card.style.borderLeftColor = "#9b59b6";
            card.style.background = "#2a202e";
        } else if (hasAiPlan) {
            card.style.borderLeftColor = "#3498db";
            card.style.background = "#202830";
        }

        let badgeHtml = "";
        let mainIconClass = "fa-circle";
        let toolName = "";

        if (isRec) {
            mainIconClass = "fa-video";
            badgeHtml += `<span style="color:#e74c3c; font-weight:bold; font-size:11px;"> REC</span>`;
        } else {
            if (toolData.ranked_tools && toolData.ranked_tools.length > 0) {
                const topToolId = toolData.ranked_tools[0].tool_id;
                mainIconClass = TOOL_ICONS[topToolId] || TOOL_ICONS.default;
                toolName = topToolId;
                badgeHtml += `<span style="color:#f39c12; margin-right:6px;"><i class="fas ${mainIconClass}"></i></span>`;
            } else {
                badgeHtml += `<span style="color:#777;"><i class="fas fa-question-circle"></i></span>`;
            }
            if (hasExp) {
                badgeHtml += `<span style="background:#8e44ad; color:white; font-size:9px; padding:1px 4px; border-radius:3px; margin-left:4px;">EXP</span>`;
            }
        }

        const narr = (scene.narrations || [])[0] || "(내레이션 없음)";
        let subText = isRec ? "Screen Recording" : (toolName ? `[${toolName}]` : "");

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; color:#eee; font-size:13px;">${scene.formatted_id}</span>
                <div>${badgeHtml}</div>
            </div>
            <div style="font-size:11px; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:5px;">
                "${narr}"
            </div>
            <div style="font-size:10px; color:#888; margin-top:2px;">${subText}</div>
        `;

        this.container.appendChild(card);
    }
}