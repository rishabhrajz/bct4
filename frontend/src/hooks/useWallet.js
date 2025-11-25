import { useState, useEffect, useCallback } from 'react';

/**
 * useWallet Hook
 * Manages MetaMask wallet connection and network state
 */
export function useWallet() {
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if MetaMask is installed
    const isMetaMaskInstalled = () => {
        return typeof window.ethereum !== 'undefined';
    };

    // Connect to MetaMask
    const connect = useCallback(async () => {
        if (!isMetaMaskInstalled()) {
            setError('MetaMask is not installed. Please install MetaMask to continue.');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (accounts.length > 0) {
                setAccount(accounts[0]);
                setIsConnected(true);

                // Get chain ID
                const chain = await window.ethereum.request({
                    method: 'eth_chainId',
                });
                setChainId(chain);

                console.log('✅ Connected to MetaMask:', accounts[0]);
            }
        } catch (err) {
            console.error('MetaMask connection error:', err);
            setError(err.message || 'Failed to connect to MetaMask');
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setAccount(null);
        setIsConnected(false);
        setChainId(null);
        console.log('Disconnected from MetaMask');
    }, []);

    // Switch to Hardhat local network
    const switchToHardhatNetwork = useCallback(async () => {
        if (!isMetaMaskInstalled()) {
            setError('MetaMask is not installed');
            return;
        }

        try {
            // Hardhat network details
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7A69' }], // 31337 in hex
            });
        } catch (switchError) {
            // Network doesn't exist, try to add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: '0x7A69',
                                chainName: 'Hardhat Local',
                                nativeCurrency: {
                                    name: 'Ether',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                                rpcUrls: ['http://127.0.0.1:8545'],
                            },
                        ],
                    });
                } catch (addError) {
                    console.error('Failed to add Hardhat network:', addError);
                    setError('Failed to add Hardhat network to MetaMask');
                }
            } else {
                console.error('Failed to switch network:', switchError);
                setError('Failed to switch to Hardhat network');
            }
        }
    }, []);

    // Get balance
    const getBalance = useCallback(async () => {
        if (!account || !isMetaMaskInstalled()) return null;

        try {
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [account, 'latest'],
            });

            // Convert from wei to ETH
            return parseInt(balance, 16) / 1e18;
        } catch (err) {
            console.error('Error getting balance:', err);
            return null;
        }
    }, [account]);

    // Listen for account changes
    useEffect(() => {
        if (!isMetaMaskInstalled()) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                // User disconnected
                disconnect();
            } else {
                setAccount(accounts[0]);
                console.log('Account changed:', accounts[0]);
            }
        };

        const handleChainChanged = (chainId) => {
            setChainId(chainId);
            console.log('Network changed:', chainId);
            // Reload to avoid state inconsistencies
            window.location.reload();
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // Cleanup
        return () => {
            if (window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, [disconnect]);

    // Auto-connect on mount if previously connected
    useEffect(() => {
        const checkConnection = async () => {
            if (!isMetaMaskInstalled()) return;

            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts',
                });

                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    setIsConnected(true);

                    const chain = await window.ethereum.request({
                        method: 'eth_chainId',
                    });
                    setChainId(chain);
                }
            } catch (err) {
                console.error('Auto-connect error:', err);
            }
        };

        checkConnection();
    }, []);

    return {
        account,
        chainId,
        isConnected,
        isLoading,
        error,
        connect,
        disconnect,
        switchToHardhatNetwork,
        getBalance,
        isMetaMaskInstalled: isMetaMaskInstalled(),
    };
}
