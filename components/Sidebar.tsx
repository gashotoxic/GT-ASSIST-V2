
import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, X, Pencil, Check, PanelLeftClose, ChevronLeft, GitBranch, Zap, ChevronRight, Sliders, Settings } from 'lucide-react';
import { ChatSession } from '../types';
import { Button } from './UI';
import { useCredits } from '../context/CreditContext';
import { useUser } from '@clerk/clerk-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onOpen?: () => void;
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
    onOpen,
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
                className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div className={`
        fixed md:relative inset-y-0 left-0 z-[70] h-full
        flex flex-col flex-shrink-0
        bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-2xl
        border-r border-white/20 dark:border-white/5
        shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:shadow-none
        transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
        ${isOpen ? 'translate-x-0 md:w-[21rem] opacity-100' : '-translate-x-full md:translate-x-0 md:w-16 opacity-100'}
      `}>
                {isOpen ? (
                <div className="w-[min(21rem,78vw)] max-[450px]:w-[78vw] md:w-full h-full flex flex-col min-w-0">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                                <img src="/brand/mark.png" alt="Brand" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[13px] font-black tracking-tight text-slate-800 dark:text-white whitespace-nowrap">
                                    Gasho<span className="text-primary italic">Chat</span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                                    <span>History</span>
                                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/10">
                                        {sessions.length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden md:flex w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-all duration-200"
                                onClick={onClose}
                                title="Collapse Sidebar"
                            >
                                <PanelLeftClose className="w-4 h-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
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
                                if (window.innerWidth < 768) onClose();
                            }}
                            className="w-full justify-center py-6 shadow-xl shadow-primary/25 rounded-2xl bg-gradient-to-r from-primary to-teal-500 hover:brightness-110 active:scale-[0.98] transition-all duration-300 border border-white/20 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <Plus className="w-5 h-5 mr-2 text-white relative z-10" />
                            <span className="font-bold text-white relative z-10 tracking-wide">New Chat</span>
                        </Button>
                    </div>

                    {/* Session List */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 custom-scrollbar">
                        {sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center space-y-4 opacity-60">
                                <div className="w-16 h-16 rounded-[2rem] bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-50 duration-500">
                                    <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No conversations yet.</p>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => {
                                        if (editingId !== session.id) {
                                            onSelectSession(session.id);
                                            if (window.innerWidth < 768) onClose();
                                        }
                                    }}
                                    className={`
                    group relative flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-300 border
                    ${activeSessionId === session.id
                                            ? 'bg-gradient-to-r from-[#1abc9c]/10 to-[#1abc9c]/5 dark:from-[#1abc9c]/20 dark:to-[#1abc9c]/10 border-primary/20 shadow-sm'
                                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                        }
                    `}
                                >
                                    <div className={`
                        shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm
                        ${activeSessionId === session.id
                                            ? 'bg-primary text-white shadow-primary/30 scale-100'
                                            : 'bg-white dark:bg-white/5 text-gray-400 group-hover:text-primary group-hover:bg-white dark:group-hover:bg-white/10 border border-gray-100 dark:border-white/5'
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
                                                    className="w-full text-sm bg-white dark:bg-black/50 rounded-lg px-2 py-1 border border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm text-black dark:text-white"
                                                    autoFocus
                                                />
                                                <button type="submit" className="p-2 text-green-500 hover:text-green-600 bg-green-50 dark:bg-green-900/30 rounded-full ring-1 ring-green-500/20">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            </form>
                                        ) : (
                                            <>
                                                <div className={`font-semibold truncate text-sm leading-tight transition-colors ${activeSessionId === session.id ? 'text-primary dark:text-primary-light' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                                                    {session.title || 'New Conversation'}
                                                </div>
                                                <div className={`text-[10px] truncate flex items-center gap-1.5 ${activeSessionId === session.id ? 'text-primary/70 dark:text-primary-light/70' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                    <span>{new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    <span className={`w-0.5 h-0.5 rounded-full ${activeSessionId === session.id ? 'bg-primary/50' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                                                    <span>{new Date(session.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Actions (visible on hover or if active) */}
                                    {editingId !== session.id && (
                                        <div className={`flex items-center gap-1 absolute right-2 ${activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-200 ${activeSessionId === session.id ? 'bg-white/80 dark:bg-slate-900/80' : 'bg-white/90 dark:bg-slate-900/90'} backdrop-blur-md rounded-xl p-1 shadow-sm border border-gray-100 dark:border-white/5`}>
                                            <button
                                                onClick={(e) => startEditing(e, session)}
                                                className={`p-1.5 rounded-md transition-colors ${activeSessionId === session.id ? 'text-primary hover:bg-primary/10' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                title="Rename"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => onDeleteSession(session.id, e)}
                                                className={`p-1.5 rounded-md transition-colors ${activeSessionId === session.id ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
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
                    <div id="tour-settings-trigger" className="p-4 border-t border-white/20 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">

                        <div className="flex items-center gap-2">
                            {toggleTheme && (
                                <button
                                    onClick={toggleTheme}
                                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all"
                                >
                                    {theme === 'dark' ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Light</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Dark</span>
                                        </div>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('start-tour', { detail: { tour: 'current' } }))}
                                className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:text-primary transition-all"
                                title="Guide"
                            >
                                <Zap className="w-4 h-4 text-gray-500" />
                            </button>

                            {onOpenSettings && (
                                <button
                                    onClick={onOpenSettings}
                                    className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:text-primary transition-all"
                                >
                                    <Settings className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                ) : (
                    <div className="hidden md:flex h-full w-16 flex-col items-center py-4">
                        <button
                            type="button"
                            onClick={() => onOpen?.()}
                            className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center hover:bg-primary/15 transition-colors"
                            title="Open sidebar"
                        >
                            <img src="/brand/mark.png" alt="Brand" className="w-full h-full object-cover" />
                        </button>

                        <div className="w-10 h-px bg-black/10 dark:bg-white/10 mt-3" />

                        <button
                            type="button"
                            onClick={() => onNewChat()}
                            className="h-11 w-11 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="New chat"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        <div className="flex-1" />

                        {onOpenSettings && (
                            <button
                                type="button"
                                onClick={() => onOpenSettings()}
                                className="h-11 w-11 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
