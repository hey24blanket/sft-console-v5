// public/js/modules/Toast.js
export class Toast {
    static show(message, duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<i class="fas fa-check-circle" style="color:#2ecc71;"></i> <span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, duration);
    }
}
window.Toast = Toast;