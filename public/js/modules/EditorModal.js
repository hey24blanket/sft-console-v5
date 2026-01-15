import { db } from './Database.js';

export class EditorModal {
    constructor(projectManager) {
        this.pm = projectManager;
        this.modal = document.getElementById('editor-modal');
        this.textarea = document.getElementById('modal-textarea');
        this.titleEl = document.getElementById('modal-title');

        // 전역 접근 허용 (HTML onclick="openEditor()" 대응)
        window.EditorModal = this;
    }

    async open(stage, type) {
        if (!window.currPid) return alert("프로젝트를 먼저 생성하고 선택해주세요.");

        this.currentContext = { stage, type };
        this.titleEl.innerText = `Edit: ${stage} / ${type}`;

        // DB 로드
        const key = [window.currPid, stage, type];
        const data = await db.stage_data.get(key);
        this.textarea.value = data ? data.current : "";

        // 모달 보이기 (CSS 클래스 + 스타일 강제)
        this.modal.classList.add('open');
        this.modal.style.display = 'flex';
    }

    close() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('open');
    }

    async save() {
        if (!this.currentContext) return;
        const { stage, type } = this.currentContext;
        const content = this.textarea.value;

        // DB 저장 로직
        const key = [window.currPid, stage, type];
        let record = await db.stage_data.get(key) || { pid: window.currPid, stage, type, history: [] };

        record.current = content;
        record.updatedAt = Date.now();
        await db.stage_data.put(record);

        // UI 갱신 요청
        if (this.pm) this.pm.updateDashboardStatus();
        this.close();
    }
}