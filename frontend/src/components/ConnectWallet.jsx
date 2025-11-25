import { useState } from 'react';
import { ethers } from 'ethers';

function ConnectWallet() {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert('MetaMask is not installed!');
            return;
        }

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            setAccount(accounts[0]);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet');
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
    };

    return (
        <div style={{ marginBottom: '16px' }}>
            {account ? (
                <div>
                    <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
                    <button onClick={disconnectWallet} className="btn" style={{ background: '#ef4444' }}>
                        Disconnect
                    </button>
                </div>
            ) : (
                <button onClick={connectWallet} className="btn btn-primary" disabled={loading}>
                    {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
                </button>
            )}
        </div>
    );
}

export default ConnectWallet;
