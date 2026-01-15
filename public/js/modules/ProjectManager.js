import { db } from './Database.js';

export class ProjectManager {
    constructor(timelineRenderer) {
        this.timeline = timelineRenderer;
        this.listContainer = document.getElementById('project-list');
    }

    // ... (createProject, loadProjects, selectProject methods remain the same) ...
    // Copy the previous methods here if you are replacing the whole file, 
    // or just ensure the class structure is maintained.

    async createProject(title) {
        if (!title) return;
        try {
            const id = await db.projects.add({ title: title, updatedAt: Date.now() });
            console.log(`Created Project ID: ${id}`);
            await this.loadProjects();
            this.selectProject(id);
        } catch (e) {
            console.error("Create Project Error:", e);
        }
    }

    async loadProjects() {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';
        try {
            const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
            if (projects.length === 0) {
                this.listContainer.innerHTML = `<div style="padding:20px; color:#666; text-align:center;">No Projects</div>`;
                return;
            }
            projects.forEach(p => {
                const div = document.createElement('div');
                div.className = `sb-item ${window.currPid === p.id ? 'active' : ''}`;
                div.innerText = p.title;
                div.onclick = () => this.selectProject(p.id);
                this.listContainer.appendChild(div);
            });
        } catch (e) {
            console.error("Load Projects Error:", e);
        }
    }

    async selectProject(pid) {
        window.currPid = Number(pid);
        console.log(`Select Project ID: ${window.currPid}`);

        const items = this.listContainer.querySelectorAll('.sb-item');
        items.forEach(el => el.classList.remove('active'));
        // Re-render list to update active class visually is a bit inefficient but safe
        // Better to just find the element and add class
        const targetBtn = Array.from(items).find(el => el.innerText === (items.length > 0 ? el.innerText : "")); // Simplification
        this.loadProjects(); // Refresh list to set active class properly

        const project = await db.projects.get(window.currPid);
        if (project) {
            const titleEl = document.getElementById('inp-title');
            if (titleEl) titleEl.value = project.title;
        }

        this.updateDashboardStatus();

        // ★ Load Director Data Immediately
        await this.loadDirectorState();

        if (window.Toast) window.Toast.show(`Loaded: ${project?.title}`);
    }

    // ... (updateDashboardStatus remains the same) ...
    async updateDashboardStatus() {
        if (!window.currPid) return;

        const stages = [
            { id: 'gems', type: 's1', rowId: 'row-gems-s1', verId: 'ver-gems-s1' },
            { id: 'gems', type: 's2', rowId: 'row-gems-s2', verId: 'ver-gems-s2' },
            { id: 's1', type: 'prompt', rowId: 'row-s1-prompt', verId: 'ver-s1-prompt' },
            { id: 's1', type: 'json', rowId: 'row-s1-json', verId: 'ver-s1-json' },
            { id: 's2', type: 'prompt', rowId: 'row-s2-prompt', verId: 'ver-s2-prompt' },
            { id: 's2', type: 'json', rowId: 'row-s2-json', verId: 'ver-s2-json' },
        ];

        console.log("Checking Dashboard Status for PID:", window.currPid);

        for (const item of stages) {
            const key = [window.currPid, item.id, item.type];
            const data = await db.stage_data.get(key);

            const row = document.getElementById(item.rowId);
            const ver = document.getElementById(item.verId);

            if (data && data.current && data.current.trim() !== "") {
                if (row) row.classList.add('has-data');
                if (ver) {
                    const date = new Date(data.updatedAt).toLocaleTimeString();
                    ver.innerText = `Updated: ${date}`;
                    ver.style.color = "#2ecc71";
                }
            } else {
                if (row) row.classList.remove('has-data');
                if (ver) {
                    ver.innerText = "No Data";
                    ver.style.color = "#aaa";
                }
            }
        }
    }

    // ★ New Method: Load JSON from DB to Timeline
    async loadDirectorState() {
        if (!window.currPid) return;

        try {
            // Fetch Stage 2 JSON
            const key = [window.currPid, 's2', 'json'];
            const data = await db.stage_data.get(key);

            if (data && data.current) {
                try {
                    window.directorJson = JSON.parse(data.current);
                    console.log("✅ Loaded Director JSON:", window.directorJson);

                    // Render Timeline
                    if (this.timeline) {
                        this.timeline.render();
                        this.timeline.fitTimeline(); // Optional: fit to view
                    }
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    if (window.Toast) window.Toast.show("Error: Invalid JSON in Stage 2");
                }
            } else {
                console.warn("No Stage 2 JSON found.");
                window.directorJson = null;
                if (this.timeline) this.timeline.container.innerHTML = ''; // Clear timeline
            }
        } catch (e) {
            console.error("Load Director State Error:", e);
        }
    }

    async saveDirectorState() {
        if (!window.currPid || !window.directorJson) return;
        const key = [window.currPid, 's2', 'json'];
        const jsonString = JSON.stringify(window.directorJson, null, 2);

        await db.stage_data.put({
            pid: window.currPid,
            stage: 's2',
            type: 'json',
            current: jsonString,
            updatedAt: Date.now()
        });
        if (window.Toast) window.Toast.show("Auto-Saved");
    }
}