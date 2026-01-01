
import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, X, Pencil, Check, PanelLeftClose, ChevronLeft, GitBranch } from 'lucide-react';
import { ChatSession } from '../types';
import { Button } from './UI';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    activeSessionId: string;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string, e: React.MouseEvent) => void;
    onRenameSession: (id: string, newTitle: string) => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
    onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onRenameSession,
    theme,
    toggleTheme,
    onOpenSettings
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);

    const startEditing = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        e.preventDefault();
        setEditingId(session.id);
        setEditTitle(session.title);
    };

    const saveEditing = (e?: React.FormEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (editingId && editTitle.trim()) {
            onRenameSession(editingId, editTitle.trim());
        }
        setEditingId(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div className={`
        fixed lg:relative inset-y-0 left-0 z-[70] h-full
        flex flex-col flex-shrink-0
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
        border-r border-white/20 dark:border-white/5
        shadow-2xl lg:shadow-none
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 lg:w-80 opacity-100' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'}
      `}>
                {/* Inner Wrapper */}
                <div className="w-80 h-full flex flex-col min-w-[20rem]">

                    {/* Header */}
                    <div className="px-5 py-5 flex items-center justify-between shrink-0">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
                            History
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5">{sessions.length}</span>
                        </h2>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden lg:flex w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                                onClick={onClose}
                                title="Collapse Sidebar"
                            >
                                <PanelLeftClose className="w-4 h-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden w-8 h-8 rounded-full"
                                onClick={onClose}
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </Button>
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <div className="px-4 pb-4 shrink-0">
                        <Button
                            onClick={() => {
                                onNewChat();
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className="w-full justify-center py-6 shadow-lg shadow-primary/20 rounded-2xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-110 transition-all border border-white/20"
                        >
                            <Plus className="w-4 h-4 mr-2 text-white" />
                            <span className="font-semibold text-white">New Chat</span>
                        </Button>
                    </div>

                    {/* Session List */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
                        {sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3 opacity-60">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-dashed border-gray-300 dark:border-white/10">
                                    <MessageSquare className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => {
                                        if (editingId !== session.id) {
                                            onSelectSession(session.id);
                                            if (window.innerWidth < 1024) onClose();
                                        }
                                    }}
                                    className={`
                    group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border
                    ${activeSessionId === session.id
                                            ? 'bg-[#1abc9c] text-white border-transparent shadow-lg shadow-primary/30' // Solid Primary
                                            : 'border-transparent hover:bg-gray-100/80 dark:hover:bg-white/5'
                                        }
                    `}
                                >
                                    <div className={`
                        shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300
                        ${activeSessionId === session.id
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                        }
                    `}>
                                        {session.isBranch ? <GitBranch className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                        {editingId === session.id ? (
                                            <form onSubmit={saveEditing} className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onBlur={() => saveEditing()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="w-full text-sm bg-white dark:bg-black/50 rounded px-2 py-1 border border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm text-black dark:text-white"
                                                    autoFocus
                                                />
                                                <button type="submit" className="p-1 text-green-500 hover:text-green-600 bg-green-50 dark:bg-green-900/30 rounded ring-1 ring-green-500/20">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            </form>
                                        ) : (
                                            <>
                                                <div className={`font-semibold truncate text-sm leading-tight ${activeSessionId === session.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {session.title || 'New Conversation'}
                                                </div>
                                                <div className={`text-[10px] truncate flex items-center gap-1.5 ${activeSessionId === session.id ? 'text-white/80' : 'text-gray-400'}`}>
                                                    <span>{new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    <span className={`w-0.5 h-0.5 rounded-full ${activeSessionId === session.id ? 'bg-white/60' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                                                    <span>{new Date(session.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Actions (visible on hover or if active) */}
                                    {editingId !== session.id && (
                                        <div className={`flex items-center gap-1 absolute right-2 ${activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-200 ${activeSessionId === session.id ? 'bg-white/20' : 'bg-white/90 dark:bg-slate-900/90'} backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-transparent`}>
                                            <button
                                                onClick={(e) => startEditing(e, session)}
                                                className={`p-1.5 rounded-md transition-colors ${activeSessionId === session.id ? 'text-white hover:bg-white/20' : 'text-gray-400 hover:text-primary hover:bg-primary/10'}`}
                                                title="Rename"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => onDeleteSession(session.id, e)}
                                                className={`p-1.5 rounded-md transition-colors ${activeSessionId === session.id ? 'text-white hover:bg-red-500/50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                                                title="Delete chat"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Sidebar Footer - Settings/Theme for Mobile */}
                    {(toggleTheme || onOpenSettings) && (
                        <div className="lg:hidden p-4 border-t border-white/20 dark:border-white/5 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 gap-4 shrink-0">
                            <button
                                onClick={toggleTheme}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10"
                            >
                                {theme === 'dark' ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Light Mode</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Dark Mode</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
