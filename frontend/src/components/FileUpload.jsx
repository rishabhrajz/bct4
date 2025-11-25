import { useState, useRef } from 'react';

export default function FileUpload({ onFileSelect, accept = "*", label = "Upload File" }) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(null);
    const [fileName, setFileName] = useState('');
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        setFileName(file.name);

        // Show preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }

        if (onFileSelect) {
            onFileSelect(file);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="w-full">
            <label className="label">{label}</label>

            <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${dragActive
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-primary-400 bg-gray-50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={handleChange}
                />

                {preview ? (
                    <div className="space-y-2">
                        <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
                        <p className="text-sm text-gray-600">{fileName}</p>
                    </div>
                ) : fileName ? (
                    <div className="space-y-2">
                        <div className="text-4xl">📄</div>
                        <p className="text-sm font-medium text-gray-700">{fileName}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-4xl">📁</div>
                        <p className="text-gray-600">
                            Drop file here or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                            {accept === "image/*" ? "Images only" : "Any file type"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
