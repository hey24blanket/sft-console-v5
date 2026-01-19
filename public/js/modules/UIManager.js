// public/js/modules/UIManager.js
export class UIManager {
    constructor() {
        this.overlay = null;
    }
    // UniversalDataManager가 역할을 대체했으므로, 여기서는 껍데기만 유지하여 에러 방지
    // 또는 구형 코드와의 호환성을 위해 메서드를 연결합니다.
    openPromptEditor(title, type, initialValue, projectId) {
        if (window.UniversalData) {
            // type 예: "s1-prompt" -> ['1', 's1', 'prompt'] 변환 필요
            const parts = title.split('-'); // 대시보드에서 보낸 title 활용 (예: s1-prompt)
            if (parts.length >= 2) {
                // UniversalData.open('stage_data', [projectId, parts[0], parts[1]], title);
                // 하지만 Dashboard의 버튼은 's1', 'prompt' 식으로 인자를 보냄
                // main.js의 openEditor 헬퍼 함수가 이미 UniversalData를 호출하도록 수정되었음.
                // 따라서 이 클래스는 호환성 유지용 빈 껍데기입니다.
            }
        }
    }
}