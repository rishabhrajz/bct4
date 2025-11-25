import React, { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';

export function WalletConnect() {
    const {
        account,
        chainId,
        isConnected,
        isLoading,
        error,
        connect,
        disconnect,
        switchToHardhatNetwork,
        getBalance,
        isMetaMaskInstalled,
    } = useWallet();

    const [balance, setBalance] = useState(null);

    useEffect(() => {
        if (isConnected && account) {
            getBalance().then(setBalance);
        }
    }, [isConnected, account, getBalance]);

    // Check if on Hardhat network
    const isHardhatNetwork = chainId === '0x7A69' || chainId === '0x7a69';

    if (!isMetaMaskInstalled) {
        return (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">⚠️ MetaMask Not Installed</h3>
                <p className="text-red-700 text-sm mb-3">
                    Please install MetaMask to use this application.
                </p>
                <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded"
                >
                    Install MetaMask
                </a>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                <h3 className="text-blue-800 font-semibold mb-2">🦊 Connect Your Wallet</h3>
                <p className="text-blue-700 text-sm mb-3">
                    Connect your MetaMask wallet to continue
                </p>
                <button
                    onClick={connect}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded disabled:opacity-50"
                >
                    {isLoading ? 'Connecting...' : 'Connect MetaMask'}
                </button>
                {error && (
                    <p className="text-red-600 text-sm mt-2">Error: {error}</p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="text-green-800 font-semibold flex items-center gap-2 mb-2">
                        ✅ Wallet Connected
                    </h3>
                    <div className="text-sm text-green-700 space-y-1">
                        <p>
                            <span className="font-medium">Address:</span>{' '}
                            <code className="bg-white px-2 py-1 rounded text-xs">
                                {account?.slice(0, 6)}...{account?.slice(-4)}
                            </code>
                        </p>
                        {balance !== null && (
                            <p>
                                <span className="font-medium">Balance:</span> {balance.toFixed(4)} ETH
                            </p>
                        )}
                        <p>
                            <span className="font-medium">Network:</span>{' '}
                            {isHardhatNetwork ? (
                                <span className="text-green-600 font-semibold">Hardhat Local ✓</span>
                            ) : (
                                <span className="text-orange-600 font-semibold">
                                    Wrong Network (Chain ID: {chainId})
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <button
                    onClick={disconnect}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                    Disconnect
                </button>
            </div>

            {!isHardhatNetwork && (
                <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-orange-700 text-sm mb-2">
                        ⚠️ Please switch to Hardhat Local network
                    </p>
                    <button
                        onClick={switchToHardhatNetwork}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded"
                    >
                        Switch to Hardhat Network
                    </button>
                </div>
            )}
        </div>
    );
}
