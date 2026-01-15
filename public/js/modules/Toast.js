export class Toast {
    static init() {
        if (document.getElementById('toast-container')) return;

        const div = document.createElement('div');
        div.id = 'toast-container';
        div.className = 'toast-box';
        div.innerHTML = `
            <i class="fas fa-check-circle toast-icon"></i>
            <span id="toast-message">Notification</span>
        `;
        document.body.appendChild(div);
    }

    static show(message, duration = 2000) {
        this.init();
        const container = document.getElementById('toast-container');
        const msgEl = document.getElementById('toast-message');

        if (msgEl) msgEl.innerText = message;
        if (container) {
            container.classList.add('show');
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                container.classList.remove('show');
            }, duration);
        }
    }
}