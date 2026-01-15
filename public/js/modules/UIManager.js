export class UIManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.views = document.querySelectorAll('.view-section');
    }

    initTabs() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.target; // dashboard, director, conveyor
                this.switchTab(targetId);
            });
        });
    }

    switchTab(targetId) {
        // 1. 탭 버튼 Active 상태 갱신
        this.tabs.forEach(t => {
            if (t.dataset.target === targetId) t.classList.add('active');
            else t.classList.remove('active');
        });

        // 2. 뷰 섹션 표시/숨김
        this.views.forEach(v => {
            // id="view-dashboard", "view-director" 형식
            if (v.id === `view-${targetId}`) {
                v.classList.add('active');
                v.style.display = 'flex'; // CSS Flex 레이아웃 유지
            } else {
                v.classList.remove('active');
                v.style.display = 'none';
            }
        });

        // 3. 뷰별 특수 로직 (Director 진입 시 타임라인 리사이즈)
        if (targetId === 'director' && window.fitTimeline) {
            setTimeout(() => window.fitTimeline(), 100);
        }
    }
}