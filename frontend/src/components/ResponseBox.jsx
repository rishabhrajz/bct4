import { useState } from 'react';

export default function ResponseBox({ response, className = '' }) {
    const [showFull, setShowFull] = useState(false);

    if (!response) return null;

    const isSuccess = response.ok || response.success;
    const data = response.data || response;

    return (
        <div className={`rounded-lg border-2 p-4 ${isSuccess ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} ${className}`}>
            <div className="flex items-start justify-between mb-2">
                <h3 className={`font-semibold ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                    {isSuccess ? '✅ Success' : '❌ Error'}
                </h3>
                <button
                    onClick={() => setShowFull(!showFull)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                    {showFull ? 'Hide Details' : 'Show Details'}
                </button>
            </div>

            {!showFull && data.message && (
                <p className="text-sm text-gray-700">{data.message}</p>
            )}

            {showFull && (
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-96">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}

            {!isSuccess && data.verification && (
                <div className="mt-3 text-sm">
                    <p className="font-medium text-red-700">Verification Details:</p>
                    <pre className="bg-white p-2 rounded text-xs mt-1 overflow-x-auto">
                        {JSON.stringify(data.verification, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
