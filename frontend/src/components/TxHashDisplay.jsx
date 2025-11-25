export default function TxHashDisplay({ txHash, label = "Transaction Hash", explorerUrl }) {
    if (!txHash) return null;

    const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
    const url = explorerUrl || `https://etherscan.io/tx/${txHash}`;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
            <div className="flex items-center justify-between">
                <code className="text-sm text-gray-900 font-mono">{shortHash}</code>
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigator.clipboard.writeText(txHash)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        title="Copy full hash"
                    >
                        📋 Copy
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        🔗 View
                    </a>
                </div>
            </div>
        </div>
    );
}
