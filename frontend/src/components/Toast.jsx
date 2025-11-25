import { useState } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
    if (!message) return null;

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    };

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 max-w-md`}>
                <span className="text-2xl">{icons[type]}</span>
                <p className="flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200 font-bold text-xl"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export function useToast() {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const ToastComponent = toast ? (
        <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
        />
    ) : null;

    return { showToast, ToastComponent };
}
