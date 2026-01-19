import { db } from './Database.js';

// 템플릿 자동 추천을 위한 키워드 맵 (기존 코드 유지)
const TOOL_CATALOG = {
    roadmap: { keywords: /스텝|단계|과정|흐름|로드맵|순서|따라/ },
    list: { keywords: /첫째|둘째|셋째|목록|리스트|가지|나열/ },
    table: { keywords: /비교|대조|표|vs|차이|장단점/ },
    chart_line: { keywords: /변화|추이|상승|하락|증가|감소|선|연도|흐름|급격/ },
    chart_bar: { keywords: /막대|그래프|차트|비교|높|낮|순위|가장|vs/ },
    chart_pie: { keywords: /비율|퍼센트|%|점유율|원형|비중|구성|차지/ },
    definition: { keywords: /정의|뜻|개념|이란|용어/ },
    speech_bubble: { keywords: /질문|생각|대사|말|혹시/ },
    split_3: { keywords: /세 가지|3가지|3개|분류/ },
    split_5: { keywords: /다섯|5가지|5개|요소/ },
    display_explain: { keywords: /화면|디스플레이|자료|영상/ },
    card_hierarchy: { keywords: /카드|그룹|종류|포함/ },
    action_animation: { keywords: /행동|움직|변화|애니메이션/ },
    pictogram: { keywords: /아이콘|그림|상징|모양/ },
    callout: { keywords: /여기|주목|강조|부분|포인트/ },
    prompt_input: { keywords: /입력|타이핑|검색|치면|작성/ },
    big_title: { keywords: /주제|제목|시작|인트로|오늘/ },
    mid_title: { keywords: /챕터|섹션|다음|넘어|이어서/ }
};

export class ProjectManager {
    constructor(conveyorRenderer, inspector) {
        this.conveyor = conveyorRenderer;
        this.inspector = inspector;
        this.currentProjectId = null;
        this.listContainer = document.getElementById('project-list');
    }

    // ============================================================
    // ★ [FIX] 누락되었던 핵심 메서드 복원 (loadProjectList 등)
    // ============================================================

    // 1. 프로젝트 목록 로드 및 렌더링
    async loadProjectList() {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        // DB에서 최신순 정렬하여 가져오기
        const projects = await db.projects.orderBy('updatedAt').reverse().toArray();

        projects.forEach(p => {
            const item = document.createElement('div');
            item.className = 'sb-item';
            if (this.currentProjectId === p.id) item.classList.add('active');

            item.innerHTML = `
                <div style="font-weight:bold; color:#eee;">${p.title}</div>
                <div style="font-size:11px; color:#666;">${new Date(p.updatedAt).toLocaleString()}</div>
            `;

            item.onclick = () => this.selectProject(p.id);
            this.listContainer.appendChild(item);
        });

        // 프로젝트가 하나도 없으면 안내 메시지
        if (projects.length === 0) {
            this.listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#555; font-size:12px;">No Projects.<br>Create New Project +</div>`;
        }
    }

    // 2. 새 프로젝트 생성
    async createNewProject() {
        const title = prompt("새 프로젝트 이름을 입력하세요:", "New Project");
        if (!title) return;

        try {
            const id = await db.projects.add({
                title: title,
                updatedAt: Date.now()
            });
            // 생성 후 바로 선택
            await this.selectProject(id);
            await this.loadProjectList();
        } catch (e) {
            alert("프로젝트 생성 실패: " + e.message);
        }
    }

    // 3. 프로젝트 선택 로직
    async selectProject(pid) {
        this.currentProjectId = pid;
        window.currPid = pid; // 전역 변수 동기화 (main.js 등에서 사용)

        // UI 선택 효과 갱신
        const items = this.listContainer.querySelectorAll('.sb-item');
        items.forEach(el => el.classList.remove('active'));
        // (리스트를 다시 그리는 대신 간단히 스타일만 바꾸려면 여기서 처리 가능하나, loadProjectList 호출이 더 깔끔함)
        await this.loadProjectList();

        // 대시보드 정보 업데이트
        await this.updateDashboardStatus();

        console.log(`✅ Project Selected: ID ${pid}`);
    }

    // 4. 대시보드 상태 업데이트 (DB 데이터를 읽어서 화면 갱신)
    async updateDashboardStatus() {
        if (!this.currentProjectId) return;

        const pid = this.currentProjectId;
        const project = await db.projects.get(pid);

        // (1) 기본 정보
        const titleInput = document.getElementById('inp-title');
        if (titleInput && project) {
            titleInput.value = project.title;
            // 제목 수정 시 자동 저장 이벤트 연결
            titleInput.onblur = async () => {
                if (titleInput.value !== project.title) {
                    await db.projects.update(pid, { title: titleInput.value, updatedAt: Date.now() });
                    this.loadProjectList();
                }
            };
        }

        // (2) 각 스테이지 데이터 버전 확인 헬퍼
        const checkVer = async (stage, type, elementId) => {
            const el = document.getElementById(elementId);
            if (!el) return;
            const data = await db.stage_data.get([pid, stage, type]);

            if (data && data.current && data.current.length > 0) {
                // 데이터가 있으면 초록색 표시 및 날짜
                el.innerHTML = `<span style="color:#2ecc71"><i class="fas fa-check"></i> Data Exists</span> <span style="color:#666; font-size:10px;">(${new Date(data.updatedAt).toLocaleTimeString()})</span>`;
                // 부모 row에 강조 스타일
                el.closest('.data-row')?.classList.add('has-data');
            } else {
                el.innerHTML = 'No Data';
                el.closest('.data-row')?.classList.remove('has-data');
            }
        };

        // UI 요소 갱신 실행
        await checkVer('gems', 's1', 'ver-gems-s1');
        await checkVer('gems', 's2', 'ver-gems-s2');
        await checkVer('s1', 'prompt', 'ver-s1-prompt');
        await checkVer('s1', 'json', 'ver-s1-json');
        await checkVer('s2', 'prompt', 'ver-s2-prompt');
        await checkVer('s2', 'json', 'ver-s2-json');
    }

    // ============================================================
    // ▼ 기존 하이브리드 로직 (loadDirectorState 등) 유지
    // ============================================================

    calculateDefaultVector(narrations) {
        const text = (narrations || []).join(" ");
        let vec = { emotion: 0.3, pace: 0.5, information: 0.4 };

        if (text.match(/원리|구조|정의|개념|학습|설명/)) vec.information += 0.4;
        if (text.match(/안녕하세요|반갑습니다|환영합니다/)) { vec.emotion = 0.2; vec.pace = 0.4; vec.information = 0.2; }
        if (text.match(/놀랍|중요|핵심|기억|위험/)) vec.emotion += 0.4;
        if (text.match(/빠르게|순식간|바로|자,|그럼/)) vec.pace += 0.3;

        const clamp = (n) => parseFloat(Math.min(Math.max(n, 0.1), 0.9).toFixed(2));
        return { emotion: clamp(vec.emotion), pace: clamp(vec.pace), information: clamp(vec.information) };
    }

    calculateDefaultTools(narrations) {
        const text = (narrations || []).join(" ");
        const candidates = [];
        for (const [id, info] of Object.entries(TOOL_CATALOG)) {
            if (text.match(info.keywords)) {
                candidates.push({ tool_id: id, rank: 0, reason: "Keyword Match" });
            }
        }
        const ranked = candidates.slice(0, 2).map((item, index) => ({ ...item, rank: index + 1 }));
        return {
            source: ranked.length > 0 ? "auto_rule_fallback" : "default",
            ranked_tools: ranked,
            notes: ""
        };
    }

    async loadDirectorState() {
        if (!this.currentProjectId) return alert("프로젝트를 선택해주세요.");

        const data = await db.stage_data.get({ pid: this.currentProjectId, stage: 's2', type: 'json' });
        if (!data || !data.current || data.current === "{}" || data.current.length < 5) {
            console.warn("Director Input Data Empty");
            alert("Stage 2 결과 데이터(JSON)가 없습니다. Dashboard에서 먼저 입력해주세요.");
            return;
        }

        try {
            let json = JSON.parse(data.current);
            let isModified = false;

            if (json.sequences && Array.isArray(json.sequences)) {
                for (const seq of json.sequences) {
                    if (!seq.scenes) continue;
                    for (const scene of seq.scenes) {
                        if (scene.is_screen_rec === true) continue;

                        if (!scene.scene_control) {
                            scene.scene_control = {
                                vector: this.calculateDefaultVector(scene.narrations),
                                source: "fallback_auto"
                            };
                            isModified = true;
                        }

                        if (!scene.tool_control) {
                            scene.tool_control = this.calculateDefaultTools(scene.narrations);
                            console.log(`🛠 Fallback Tools for [${scene.formatted_id}]`);
                            isModified = true;
                        }

                        if (!scene.visual_plans || scene.visual_plans.length === 0) {
                            scene.visual_plans = [
                                { priority: 1, name: "Plan A", description: "No description yet." },
                                { priority: 2, name: "Plan B", description: "No description yet." }
                            ];
                            isModified = true;
                        }
                    }
                }
            }

            if (isModified) {
                await db.stage_data.put({
                    pid: this.currentProjectId, stage: 's2', type: 'json',
                    current: JSON.stringify(json, null, 2), updatedAt: new Date().toISOString()
                });
                console.log("✅ Data Loaded & Missing Parts Filled (Hybrid Logic).");
            }

            window.directorJson = json;

            if (this.conveyor) this.conveyor.loadData();
            if (window.TimelineRendererInstance) window.TimelineRendererInstance.fitTimeline(); // render 대신 fitTimeline 호출하여 자동 줌

        } catch (e) {
            console.error(e);
            alert("JSON Load Error: " + e.message);
        }
    }

    async saveDirectorState() {
        if (!this.currentProjectId || !window.directorJson) return;

        try {
            await db.stage_data.put({
                pid: this.currentProjectId, stage: 's2', type: 'json',
                current: JSON.stringify(window.directorJson, null, 2),
                updatedAt: new Date().toISOString()
            });
            console.log("💾 Director State Saved to DB.");
            if (window.Toast) window.Toast.show("Director State Saved");
        } catch (e) {
            console.error("Save Failed:", e);
            alert("저장 실패: " + e.message);
        }
    }
}