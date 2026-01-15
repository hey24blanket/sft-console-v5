import Dexie from 'https://esm.sh/dexie@3.2.4';

class Database extends Dexie {
    constructor() {
        super("SFT_Console_DB_v6");

        // 스키마 정의 (버전 업그레이드)
        this.version(1).stores({
            projects: '++id, title, updatedAt',
            stage_data: '[pid+stage+type], pid, updatedAt'
        });

        // ★ Version 2: 설정 및 히스토리 관리 테이블 추가
        this.version(2).stores({
            projects: '++id, title, updatedAt',
            stage_data: '[pid+stage+type], pid, updatedAt',

            // 전역 설정 (AI Key, Github Token 등) -> id='config' 하나만 씀
            global_settings: 'id',

            // 시스템 프롬프트 관리 (Master, Style 등)
            system_prompts: 'id',

            // ★ 모든 데이터의 버전 기록 (Foreign Key 개념 사용)
            // [target_type+target_id] 로 쿼리해서 특정 데이터의 역사를 가져옴
            version_history: '++id, [target_type+target_id], label, timestamp'
        });

        this.stage_data = this.table("stage_data");
        this.projects = this.table("projects");
        this.global_settings = this.table("global_settings");
        this.system_prompts = this.table("system_prompts");
        this.version_history = this.table("version_history");
    }

    async open() {
        await super.open();
        await this.initDefaults(); // 기본값 세팅
        console.log("✅ DB Opened & Schema Updated");
    }

    // 초기 데이터 세팅 (설정값이 없을 경우)
    async initDefaults() {
        const config = await this.global_settings.get('main_config');
        if (!config) {
            await this.global_settings.put({
                id: 'main_config',
                ai_config: {
                    provider: 'openai',
                    model: 'gpt-4o',
                    api_key: '' // 사용자 입력 필요
                },
                github_config: {
                    repo_owner: '',
                    repo_name: '',
                    branch: 'main'
                },
                ui_config: {
                    theme: 'dark'
                },
                updatedAt: Date.now()
            });
            console.log("⚙️ Default Settings Created.");
        }

        // 기본 프롬프트 세팅 (파일이 없을 때를 대비한 DB 초기값)
        const masterPrompt = await this.system_prompts.get('master');
        if (!masterPrompt) {
            await this.system_prompts.put({
                id: 'master',
                content: "Anti-Gravity Master Prompt Default...",
                updatedAt: Date.now()
            });
        }
    }
}

export const db = new Database();