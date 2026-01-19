// public/js/modules/GitManager.js
export class GitManager {
    constructor() {
        console.log("✅ GitManager initialized");
    }

    renderForm(key, container) {
        if (!container) return;
        const keyDisplay = Array.isArray(key) ? key.join(' / ') : (key || 'No Key');

        container.innerHTML = `
            <div style="text-align:center; padding:20px; color:#666;">
                <i class="fab fa-github" style="font-size:30px; margin-bottom:10px;"></i>
                <p>GitHub Sync is ready.</p>
                <div style="font-size:11px; margin-top:5px; padding: 4px; background: #222; border-radius: 4px; display: inline-block;">
                   Target: <span style="color: #4cd137;">${keyDisplay}</span>
                </div>
            </div>
        `;
    }
}