/**
 * Knowledge Base Modal
 * Drag-and-drop document upload with management UI
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, FileText, Trash2, Loader2, CheckCircle, AlertCircle, Database, File, Brain } from 'lucide-react';
import { Button } from './UI';
import { KnowledgeBaseService, KnowledgeDocument, IngestionProgress } from '../services/knowledgeBase';
import { AppSettings } from '../types';
import { useAuthContext } from '../context/AuthContext';

interface KnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    userId: string;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
    isOpen,
    onClose,
    settings,
    userId,
}) => {
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<IngestionProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuthContext();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const knowledgeService = React.useMemo(
        () => new KnowledgeBaseService(settings),
        [settings]
    );

    // Load documents on mount
    useEffect(() => {
        if (isOpen && userId) {
            loadDocuments();
        }
    }, [isOpen, userId]);

    const loadDocuments = async () => {
        setIsLoading(true);
        setError(null);
        setError(null);
        try {
            const token = await getToken();
            const docs = await knowledgeService.getDocuments(userId, token || ''); // Fallback empty string if no token? Should handle auth better.
            setDocuments(docs);
        } catch (err) {
            setError('Failed to load documents');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === dropZoneRef.current) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await handleFileUpload(files[0]);
        }
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleFileUpload(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (file: File) => {
        // Validate file type
        const validTypes = ['txt', 'md', 'json', 'csv'];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        if (!validTypes.includes(ext)) {
            setError(`Unsupported file type. Supported: ${validTypes.join(', ')}`);
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Maximum size is 5MB.');
            return;
        }

        setError(null);
        setUploadProgress({ stage: 'reading', progress: 0, message: 'Starting...' });

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token missing");
            await knowledgeService.ingestDocument(file, userId, token, (progress) => {
                setUploadProgress(progress);
            });

            // Reload documents
            await loadDocuments();
            setUploadProgress(null);
        } catch (err) {
            setError((err as Error).message);
            setUploadProgress(null);
        }
    };

    const handleDelete = async (doc: KnowledgeDocument) => {
        if (!confirm(`Delete "${doc.filename}"? This cannot be undone.`)) {
            return;
        }

        try {
            const token = await getToken();
            if (token) await knowledgeService.deleteDocument(doc.id, token);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (err) {
            setError('Failed to delete document');
        }
    };

    if (!isOpen) return null;

    const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);
    const totalSize = documents.reduce((sum, d) => sum + d.file_size, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[80vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Base</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {documents.length} documents • {totalChunks} chunks
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Upload Zone */}
                    <div
                        ref={dropZoneRef}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${isDragging
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-gray-300 dark:border-white/20 hover:border-violet-400 dark:hover:border-violet-500'
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.md,.json,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {uploadProgress ? (
                            <div className="space-y-4">
                                <Loader2 className="w-10 h-10 mx-auto text-violet-500 animate-spin" />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {uploadProgress.message}
                                    </p>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Upload className={`w-10 h-10 mx-auto mb-4 transition-colors ${isDragging ? 'text-violet-500' : 'text-gray-400'
                                    }`} />
                                <p className="text-gray-600 dark:text-gray-300 mb-2">
                                    Drag & drop a file here, or{' '}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-violet-500 hover:text-violet-600 font-medium"
                                    >
                                        browse
                                    </button>
                                </p>
                                <p className="text-xs text-gray-400">
                                    Supports TXT, MD, JSON, CSV (max 5MB)
                                </p>
                            </>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Documents List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Your Documents
                        </h3>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No documents uploaded yet</p>
                                <p className="text-sm mt-1">Upload files to enable AI-powered search</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                                    >
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.status === 'ready'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                            : doc.status === 'error'
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                            }`}>
                                            {doc.status === 'ready' ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : doc.status === 'error' ? (
                                                <AlertCircle className="w-5 h-5" />
                                            ) : (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                {doc.filename}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks • {formatDate(doc.created_at)}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <button
                                            onClick={() => handleDelete(doc)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete document"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total storage: {formatFileSize(totalSize)}
                        </p>
                        <Button onClick={onClose}>Done</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBaseModal;
