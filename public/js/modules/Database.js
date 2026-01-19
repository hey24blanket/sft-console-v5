// public/js/modules/Database.js
const Dexie = window.Dexie;

class Database extends Dexie {
    constructor() {
        super("SFT_Console_DB_v6");

        // v1 ~ v3 History (유지)
        this.version(1).stores({ projects: '++id, title, updatedAt', stage_data: '[pid+stage+type], pid, updatedAt' });
        this.version(2).stores({
            projects: '++id, title, updatedAt', stage_data: '[pid+stage+type], pid, updatedAt',
            global_settings: 'id', system_prompts: 'id', version_history: '++id, [target_type+target_id], label, timestamp'
        });
        this.version(3).stores({
            projects: '++id, title, updatedAt', stage_data: '[pid+stage+type], pid, updatedAt',
            global_settings: 'id', system_prompts: 'id', version_history: '++id, [target_type+target_id], label, timestamp',
            ai_plans: '++id, [project_id+scene_id], scene_type, version, created_at'
        });

        // ★ v4 (New: 딥러닝 확장 기초 공사)
        // ai_plans 테이블에 'scene_tag' 인덱스 추가 (추후 "유사한 씬 찾기" 기능에 사용)
        // 참고: vector, evaluation 같은 객체 데이터는 별도 인덱스 정의 없이도 저장 가능합니다.
        this.version(4).stores({
            projects: '++id, title, updatedAt',
            stage_data: '[pid+stage+type], pid, updatedAt',
            global_settings: 'id',
            system_prompts: 'id',
            version_history: '++id, [target_type+target_id], label, timestamp',
            ai_plans: '++id, [project_id+scene_id], scene_type, version, created_at, scene_tag'
        });

        this.stage_data = this.table("stage_data");
        this.projects = this.table("projects");
        this.global_settings = this.table("global_settings");
        this.system_prompts = this.table("system_prompts");
        this.version_history = this.table("version_history");
        this.ai_plans = this.table("ai_plans");
    }

    async open() {
        await super.open();
        try {
            const config = await this.global_settings.get('main_config');
            if (!config) await this.global_settings.put({ id: 'main_config', updatedAt: Date.now() });
        } catch (e) { console.warn("DB Defaults skipped"); }
        console.log("✅ DB Connected (Schema v4: Vector Ready)");
    }
}

export const db = new Database();