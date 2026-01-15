import { db } from './modules/Database.js';
import { ProjectManager } from './modules/ProjectManager.js';
import { UIManager } from './modules/UIManager.js';
import { TimelineRenderer } from './modules/TimelineRenderer.js';
import { Inspector } from './modules/Inspector.js';
import { EditorModal } from './modules/EditorModal.js';
import { ConveyorRenderer } from './modules/ConveyorRenderer.js';
import { AiResultModal } from './modules/AiResultModal.js';
import { UniversalDataManager } from './modules/UniversalDataManager.js';
import { Toast } from './modules/Toast.js'; // Toast 추가

// 전역 변수
window.currPid = null;
window.directorJson = null;
window.InspectorInstance = null;
window.UniversalData = null;
window.ProjectMgrInstance = null;
window.Toast = Toast; // 전역 등록

console.log("▶ main.js loaded successfully.");

document.addEventListener('DOMContentLoaded', async () => {
    console.log("▶ DOM Content Loaded.");

    // 1. [+ New Project] 버튼 강제 연결 (최우선)
    const btnNewProject = document.getElementById('btn-new-project');
    if (btnNewProject) {
        const newBtn = btnNewProject.cloneNode(true);
        btnNewProject.parentNode.replaceChild(newBtn, btnNewProject);

        newBtn.addEventListener('click', async () => {
            if (!window.ProjectMgrInstance) return alert("시스템 로딩 중...");
            const title = prompt("새 프로젝트 이름을 입력하세요:", "New Project");
            if (title) await window.ProjectMgrInstance.createProject(title);
        });
    }

    // ★ [Step 3 추가] Settings 버튼 연결
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            if (!window.UniversalData) return alert("매니저 로딩 중...");
            // 'global_settings' 테이블의 'main_config' 아이디를 엽니다.
            window.UniversalData.open('global_settings', 'main_config', 'System Settings (JSON)');
        });
    }

    // 2. 시스템 초기화
    try {
        await db.open();
        console.log("✅ DB Connected.");

        const uiMgr = new UIManager();
        const conveyor = new ConveyorRenderer();
        const projectMgr = new ProjectManager(null);
        window.ProjectMgrInstance = projectMgr;

        const editorModal = new EditorModal(projectMgr);
        const aiModal = new AiResultModal(projectMgr);
        const udm = new UniversalDataManager(projectMgr);
        window.UniversalData = udm;

        if (!window.EditorModal) window.EditorModal = editorModal;

        const handleSaveChain = async () => {
            if (typeof timeline !== 'undefined') timeline.render();
            await projectMgr.saveDirectorState();
        };
        const inspector = new Inspector(handleSaveChain);
        window.InspectorInstance = inspector;

        const timeline = new TimelineRenderer(inspector, aiModal);
        projectMgr.timeline = timeline;

        uiMgr.initTabs();

        // 컨베이어 탭 클릭 시 데이터 리로드
        const conveyorTab = document.querySelector('[data-target="conveyor"]');
        if (conveyorTab) {
            conveyorTab.addEventListener('click', () => conveyor.loadData());
        }

        window.fitTimeline = () => timeline.fitTimeline();

        await projectMgr.loadProjects();
        console.log("✅ System Initialization Complete.");

    } catch (err) {
        console.error("❌ Init Error:", err);
        alert(`초기화 오류: ${err.message}`);
    }
});