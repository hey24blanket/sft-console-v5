// public/js/main.js
import { db } from './modules/Database.js';
import { ProjectManager } from './modules/ProjectManager.js';
import { UIManager } from './modules/UIManager.js';
import { UniversalDataManager } from './modules/UniversalDataManager.js';
import { GitManager } from './modules/GitManager.js';
import { ConveyorRenderer } from './modules/ConveyorRenderer.js';
import { Inspector } from './modules/Inspector.js';
import { TimelineRenderer } from './modules/TimelineRenderer.js';
import { AiResultModal } from './modules/AiResultModal.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 SFT Console V5.0 Booting...");

    try {
        await db.open();

        // 1. 핵심 모듈 초기화
        const gitMgr = new GitManager();
        const uniDataMgr = new UniversalDataManager();
        const uiMgr = new UIManager();

        window.GitManagerInstance = gitMgr;
        window.UniversalData = uniDataMgr;
        window.UIManagerInstance = uiMgr;

        // 2. 뷰 렌더러 및 매니저 초기화
        const conveyor = new ConveyorRenderer();
        window.ConveyorInstance = conveyor;

        // 인스펙터 (저장 시 ProjectManager 저장 트리거)
        const inspector = new Inspector(async () => {
            if (window.ProjectMgrInstance) await window.ProjectMgrInstance.saveDirectorState();
            // 인스펙터 저장 시 타임라인도 갱신 (제목 변경 등 반영)
            if (window.TimelineRendererInstance) window.TimelineRendererInstance.render();
        });
        window.InspectorInstance = inspector;

        const projectMgr = new ProjectManager(conveyor, inspector);
        window.ProjectMgrInstance = projectMgr;

        // ★ [FIX] AI 모달 초기화 및 전역 할당 (이 부분이 빠져서 오류 발생했음)
        const aiModal = new AiResultModal(projectMgr);
        window.AiResultModalInstance = aiModal;

        // 타임라인 렌더러
        const timeline = new TimelineRenderer(inspector, aiModal);
        window.TimelineRendererInstance = timeline;

        // 3. 버튼 이벤트 연결
        // (1) New Project
        const btnNew = document.getElementById('btn-new-project');
        if (btnNew) {
            const newBtn = btnNew.cloneNode(true);
            btnNew.parentNode.replaceChild(newBtn, btnNew);
            newBtn.addEventListener('click', () => projectMgr.createNewProject());
        }

        // (2) Settings 버튼
        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) {
            const newSetBtn = btnSettings.cloneNode(true);
            btnSettings.parentNode.replaceChild(newSetBtn, btnSettings);
            newSetBtn.addEventListener('click', () => {
                uniDataMgr.open('global_settings', 'main_config', 'Global Settings');
            });
        }

        // (3) Save Local
        const btnSaveLocal = document.getElementById('btn-save-local');
        if (btnSaveLocal) {
            btnSaveLocal.addEventListener('click', () => alert("로컬 저장 기능은 준비 중입니다."));
        }

        // 4. 초기 데이터 로드
        console.log("📂 Loading Project List...");
        await projectMgr.loadProjectList();

        // 5. 탭 전환 로직
        const tabs = document.querySelectorAll('.tab-btn');
        const sections = document.querySelectorAll('.view-section');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));

                tab.classList.add('active');
                const targetId = `view-${tab.dataset.target}`;
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.classList.add('active');

                // 탭별 리프레시
                if (tab.dataset.target === 'conveyor') conveyor.loadData();
                if (tab.dataset.target === 'director') {
                    setTimeout(() => timeline.fitTimeline(), 100);
                }
            });
        });

        console.log("✅ Boot Complete.");

    } catch (err) {
        console.error("🔥 FATAL ERROR:", err);
        alert("초기화 중 오류 발생: " + err.message);
    }
});