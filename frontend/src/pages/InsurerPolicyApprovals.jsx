import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const API_BASE = 'http://localhost:4000';

export function InsurerPolicyApprovals() {
    const queryClient = useQueryClient();
    const [rejectionModal, setRejectionModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Fetch pending policies
    const { data: pendingPolicies, isLoading } = useQuery({
        queryKey: ['pending-policies'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/policy/pending`);
            if (!res.ok) throw new Error('Failed to fetch pending policies');
            const data = await res.json();
            return data.policies;
        },
        refetchInterval: 5000,
    });

    // Approve policy mutation
    const approveMutation = useMutation({
        mutationFn: async (policyId) => {
            const res = await fetch(`${API_BASE}/policy/approve/${policyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurerAddress: '0xInsurer',
                }),
            });
            if (!res.ok) throw new Error('Failed to approve policy');
            return res.json();
        },
        onSuccess: () => {
            toast.success('✅ Policy approved! Premium released from escrow.');
            queryClient.invalidateQueries({ queryKey: ['pending-policies'] });
        },
        onError: (error) => {
            toast.error(`Failed to approve: ${error.message}`);
        },
    });

    // Reject policy mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ policyId, reason }) => {
            const res = await fetch(`${API_BASE}/policy/reject/${policyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason,
                    insurerAddress: '0xInsurer',
                    refundTxHash: '0x-pending-refund', // TODO: Get actual refund tx
                }),
            });
            if (!res.ok) throw new Error('Failed to reject policy');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Policy rejected. Premium refunded to patient.');
            setRejectionModal(null);
            setRejectionReason('');
            queryClient.invalidateQueries({ queryKey: ['pending-policies'] });
        },
        onError: (error) => {
            toast.error(`Failed to reject: ${error.message}`);
        },
    });

    const handleApprove = (policyId) => {
        if (window.confirm('Approve this policy and release premium from escrow?')) {
            approveMutation.mutate(policyId);
        }
    };

    const submitRejection = () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        rejectMutation.mutate({
            policyId: rejectionModal.id,
            reason: rejectionReason,
        });
    };

    const formatAmount = (weiAmount) => {
        return (parseInt(weiAmount) / 1e18).toFixed(4);
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Policy Approvals</h1>
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">📋 Policy Approvals</h1>

            {(!pendingPolicies || pendingPolicies.length === 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">No pending policy approvals</p>
                </div>
            )}

            <div className="grid gap-6">
                {pendingPolicies?.map((policy) => (
                    <div
                        key={policy.id}
                        className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Policy Request #{policy.onchainPolicyId || policy.id}
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                    <div>
                                        <p>
                                            <span className="font-medium">Patient:</span>{' '}
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                {policy.beneficiaryAddress}
                                            </code>
                                        </p>
                                        <p className="mt-1">
                                            <span className="font-medium">Coverage:</span>{' '}
                                            <span className="font-semibold text-blue-600">
                                                {formatAmount(policy.coverageAmount)} ETH
                                            </span>
                                        </p>
                                        <p className="mt-1">
                                            <span className="font-medium">Tier:</span>{' '}
                                            <span className="font-semibold">{policy.tier}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p>
                                            <span className="font-medium">Premium (in escrow):</span>{' '}
                                            <span className="font-semibold text-green-600">
                                                {policy.premiumPaid ? formatAmount(policy.premiumPaid) : '0.0'} ETH
                                            </span>
                                        </p>
                                        <p className="mt-1">
                                            <span className="font-medium">Period:</span>{' '}
                                            {new Date(policy.startEpoch * 1000).toLocaleDateString()} -{' '}
                                            {new Date(policy.endEpoch * 1000).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {policy.kycDocCid && (
                                    <p className="text-sm">
                                        <a
                                            href={`https://gateway.pinata.cloud/ipfs/${policy.kycDocCid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            📄 View KYC Document
                                        </a>
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    Submitted: {new Date(policy.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex gap-2 ml-4">
                                <button
                                    onClick={() => handleApprove(policy.id)}
                                    disabled={approveMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
                                >
                                    ✅ Approve & Activate
                                </button>
                                <button
                                    onClick={() => setRejectionModal(policy)}
                                    disabled={rejectMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
                                >
                                    ❌ Reject & Refund
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rejection Modal */}
            {rejectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-2">
                            Reject Policy #{rejectionModal.onchainPolicyId || rejectionModal.id}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Premium of {rejectionModal.premiumPaid ? formatAmount(rejectionModal.premiumPaid) : '0'} ETH will be refunded to patient
                        </p>
                        <textarea
                            className="w-full border border-gray-300 rounded p-3 mb-4"
                            rows="4"
                            placeholder="Enter rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={submitRejection}
                                disabled={rejectMutation.isPending}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium"
                            >
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => {
                                    setRejectionModal(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default InsurerPolicyApprovals;
