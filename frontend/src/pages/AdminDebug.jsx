import { useQuery } from '@tanstack/react-query';
import backend from '../api/backend';

export default function AdminDebug() {
    const { data: healthData } = useQuery({
        queryKey: ['health'],
        queryFn: backend.health,
    });

    const { data: providersData } = useQuery({
        queryKey: ['debug-providers'],
        queryFn: backend.debugProviders,
    });

    const { data: policiesData } = useQuery({
        queryKey: ['debug-policies'],
        queryFn: backend.debugPolicies,
    });

    const { data: claimsData } = useQuery({
        queryKey: ['debug-claims'],
        queryFn: backend.debugClaims,
    });

    const downloadJSON = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="card bg-yellow-50 border-yellow-200">
                <h1 className="text-3xl font-bold mb-2">⚙️ Admin Debug Panel</h1>
                <p className="text-yellow-800">Development only - View system internals and export data</p>
            </div>

            {/* Health Info */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">System Health</h2>
                    <button
                        onClick={() => downloadJSON(healthData, 'health')}
                        className="btn-secondary text-sm"
                    >
                        💾 Export
                    </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs border">
                    {JSON.stringify(healthData?.data, null, 2)}
                </pre>
            </div>

            {/* Providers */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        Providers <span className="text-sm text-gray-500">({providersData?.data?.count || 0})</span>
                    </h2>
                    <button
                        onClick={() => downloadJSON(providersData?.data, 'providers')}
                        className="btn-secondary text-sm"
                    >
                        💾 Export
                    </button>
                </div>
                {providersData?.ok ? (
                    <div className="space-y-3">
                        {providersData.data.providers?.map((p) => (
                            <div key={p.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="grid md:grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="font-semibold">ID:</span> {p.id}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Name:</span> {p.name}
                                    </div>
                                    <div className="md:col-span-2">
                                        <span className="font-semibold">DID:</span>
                                        <code className="text-xs ml-2">{p.providerDid}</code>
                                    </div>
                                    <div className="md:col-span-2">
                                        <span className="font-semibold">VC CID:</span>
                                        <code className="text-xs ml-2">{p.vcCid}</code>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No providers found</p>
                )}
            </div>

            {/* Policies */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        Policies <span className="text-sm text-gray-500">({policiesData?.data?.count || 0})</span>
                    </h2>
                    <button
                        onClick={() => downloadJSON(policiesData?.data, 'policies')}
                        className="btn-secondary text-sm"
                    >
                        💾 Export
                    </button>
                </div>
                {policiesData?.ok ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left">On-Chain ID</th>
                                    <th className="px-4 py-2 text-left">Provider ID</th>
                                    <th className="px-4 py-2 text-left">Beneficiary</th>
                                    <th className="px-4 py-2 text-left">Coverage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {policiesData.data.policies?.map((p) => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{p.onchainPolicyId}</td>
                                        <td className="px-4 py-2">{p.providerId}</td>
                                        <td className="px-4 py-2">
                                            <code className="text-xs">{p.beneficiaryAddress.slice(0, 10)}...</code>
                                        </td>
                                        <td className="px-4 py-2 font-mono">{p.coverageAmount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">No policies found</p>
                )}
            </div>

            {/* Claims */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        Claims <span className="text-sm text-gray-500">({claimsData?.data?.count || 0})</span>
                    </h2>
                    <button
                        onClick={() => downloadJSON(claimsData?.data, 'claims')}
                        className="btn-secondary text-sm"
                    >
                        💾 Export
                    </button>
                </div>
                {claimsData?.ok ? (
                    <div className="space-y-3">
                        {claimsData.data.claims?.map((c) => (
                            <div key={c.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="grid md:grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <span className="font-semibold">Claim ID:</span> {c.id}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Policy ID:</span> {c.policyId}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Status:</span>
                                        <span className="ml-2 font-medium">{c.status}</span>
                                    </div>
                                    <div className="md:col-span-2">
                                        <span className="font-semibold">Patient:</span>
                                        <code className="text-xs ml-2">{c.patientAddress}</code>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Amount:</span> {c.amount}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No claims found</p>
                )}
            </div>
        </div>
    );
}
