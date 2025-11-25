import { useState } from 'react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';
import ResponseBox from '../components/ResponseBox';

function UploadPatientDoc() {
    const [file, setFile] = useState(null);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileSelect = (selectedFile) => {
        setFile(selectedFile);
        setResponse(null);
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Please select a file first');
            return;
        }

        setLoading(true);
        setResponse(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await axios.post('/api/file/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResponse({ success: true, data: res.data });
        } catch (error) {
            setResponse({ success: false, error: error.response?.data || error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>📄 Upload Patient Document</h2>
            <p style={{ marginBottom: '24px', color: '#666' }}>
                Upload patient medical records or supporting documents to IPFS
            </p>

            <FileUpload onFileSelect={handleFileSelect} label="Patient Document" />

            {file && (
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <p><strong>Selected file:</strong> {file.name}</p>
                    <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                </div>
            )}

            <button
                onClick={handleUpload}
                className="btn btn-primary"
                disabled={loading || !file}
            >
                {loading ? 'Uploading to IPFS...' : 'Upload to IPFS'}
            </button>

            {response && <ResponseBox response={response} />}
        </div>
    );
}

export default UploadPatientDoc;
