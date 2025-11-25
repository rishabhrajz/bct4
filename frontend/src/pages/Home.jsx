import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import backend from '../api/backend';

export default function Home() {
    const { data: healthData, isLoading } = useQuery({
        queryKey: ['health'],
        queryFn: backend.health,
    });

    const health = healthData?.data;

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="card bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                <h1 className="text-4xl font-bold mb-4">🏥 ProjectY</h1>
                <p className="text-xl opacity-90 mb-6">
                    Decentralized Healthcare Insurance using DIDs & Verifiable Credentials
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link to="/provider" className="btn-secondary bg-white text-primary-700 hover:bg-gray-100">
                        👨‍⚕️ Provider Onboard
                    </Link>
                    <Link to="/patient" className="btn-secondary bg-white text-primary-700 hover:bg-gray-100">
                        👤 Patient Dashboard
                    </Link>
                    <Link to="/claim" className="btn-secondary bg-white text-primary-700 hover:bg-gray-100">
                        💊 Submit Claim
                    </Link>
                    <Link to="/insurer" className="btn-secondary bg-white text-primary-700 hover:bg-gray-100">
                        🏛️ Insurer Dashboard
                    </Link>
                </div>
            </div>

            {/* System Status */}
            <div className="card">
                <h2 className="text-2xl font-bold mb-4">System Status</h2>

                {isLoading ? (
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                        <span>Checking backend status...</span>
                    </div>
                ) : health ? (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="font-semibold">Backend Online</span>
                        </div>

                        {health.services && (
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                {/* Veramo */}
                                {health.services.veramo && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-blue-900 mb-2">🔐 Veramo (DID/VC)</h3>
                                        <p className="text-sm text-blue-700">Issuer DID: {health.services.veramo.issuerDid?.slice(0, 30)}...</p>
                                    </div>
                                )}

                                {/* Contracts */}
                                {health.services.contracts && (
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-purple-900 mb-2">⛓️ Smart Contracts</h3>
                                        <div className="text-xs space-y-1 text-purple-700">
                                            <p>Identity: {health.services.contracts.identityRegistry?.slice(0, 10)}...</p>
                                            <p>Policy: {health.services.contracts.policyContract?.slice(0, 10)}...</p>
                                            <p>Claim: {health.services.contracts.claimContract?.slice(0, 10)}...</p>
                                        </div>
                                    </div>
                                )}

                                {/* IPFS */}
                                {health.services.ipfs && (
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-green-900 mb-2">📁 IPFS (Pinata)</h3>
                                        <p className="text-sm text-green-700">Provider: {health.services.ipfs.provider}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-red-600">
                        ❌ Backend not responding. Make sure it's running on http://localhost:4000
                    </div>
                )}
            </div>

            {/* Demo Flow */}
            <div className="card">
                <h2 className="text-2xl font-bold mb-4">📋 Demo Flow</h2>
                <div className="space-y-3 text-gray-700">
                    <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
                        <div>
                            <p className="font-semibold">Onboard Provider</p>
                            <p className="text-sm text-gray-600">Create provider DID, upload license, issue VC</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
                        <div>
                            <p className="font-semibold">Create Patient DID</p>
                            <p className="text-sm text-gray-600">Generate patient identity</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">3</span>
                        <div>
                            <p className="font-semibold">Issue Policy</p>
                            <p className="text-sm text-gray-600">Create insurance policy on-chain with VC</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">4</span>
                        <div>
                            <p className="font-semibold">Upload Patient Documents</p>
                            <p className="text-sm text-gray-600">Pin medical records to IPFS</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">5</span>
                        <div>
                            <p className="font-semibold">Submit Claim</p>
                            <p className="text-sm text-gray-600">Verify provider VC and submit on-chain</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">6</span>
                        <div>
                            <p className="font-semibold">Insurer Actions</p>
                            <p className="text-sm text-gray-600">Review, approve, and process claims</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="card">
                    <div className="text-3xl mb-3">🔐</div>
                    <h3 className="font-bold text-lg mb-2">Decentralized Identity</h3>
                    <p className="text-sm text-gray-600">DIDs and VCs powered by Veramo</p>
                </div>

                <div className="card">
                    <div className="text-3xl mb-3">⛓️</div>
                    <h3 className="font-bold text-lg mb-2">On-Chain Integrity</h3>
                    <p className="text-sm text-gray-600">Policies and claims on Ethereum</p>
                </div>

                <div className="card">
                    <div className="text-3xl mb-3">📁</div>
                    <h3 className="font-bold text-lg mb-2">IPFS Storage</h3>
                    <p className="text-sm text-gray-600">Decentralized document storage</p>
                </div>
            </div>
        </div>
    );
}
