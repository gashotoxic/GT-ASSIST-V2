/**
 * Search Results Card
 * Displays search sources with favicons and links in a compact, beautiful format
 */

import React, { useState } from 'react';
import { ExternalLink, Globe, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { SearchSource } from '../types';

interface SearchResultsCardProps {
    sources: SearchSource[];
    searchTime?: number;
    isCollapsible?: boolean;
    defaultExpanded?: boolean;
}

export const SearchResultsCard: React.FC<SearchResultsCardProps> = ({
    sources,
    searchTime,
    isCollapsible = true,
    defaultExpanded = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (sources.length === 0) return null;

    return (
        <div className="mb-3 overflow-hidden rounded-xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 backdrop-blur-sm">
            {/* Header */}
            <button
                onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${isCollapsible ? 'hover:bg-white/10 cursor-pointer' : ''
                    } transition-colors`}
                disabled={!isCollapsible}
            >
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Search className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {sources.length} Source{sources.length !== 1 ? 's' : ''} Found
                        </span>
                        {searchTime && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                ({searchTime < 1000 ? `${searchTime}ms` : `${(searchTime / 1000).toFixed(1)}s`})
                            </span>
                        )}
                    </div>
                </div>
                {isCollapsible && (
                    <div className="text-gray-400">
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </div>
                )}
            </button>

            {/* Sources List */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    {sources.map((source) => (
                        <a
                            key={source.index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/5 transition-colors group"
                        >
                            {/* Citation Number */}
                            <span className="shrink-0 w-5 h-5 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                                {source.index}
                            </span>

                            {/* Favicon */}
                            <div className="shrink-0 w-5 h-5 rounded overflow-hidden bg-white dark:bg-slate-700 flex items-center justify-center">
                                {source.favicon ? (
                                    <img
                                        src={source.favicon}
                                        alt=""
                                        className="w-4 h-4 object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <Globe className="w-3 h-3 text-gray-400" />
                                )}
                            </div>

                            {/* Title & Domain */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-primary transition-colors">
                                    {source.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono opacity-80">
                                    {source.url}
                                </p>
                            </div>

                            {/* External Link Icon */}
                            <ExternalLink className="shrink-0 w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    ))}
                </div>
            )}

            {/* Collapsed Mini Preview */}
            {!isExpanded && isCollapsible && (
                <div className="flex items-center gap-1 px-4 pb-2.5 -mt-1">
                    {sources.slice(0, 4).map((source) => (
                        <div
                            key={source.index}
                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm border border-white/50 dark:border-white/10"
                            title={source.title}
                        >
                            {source.favicon ? (
                                <img
                                    src={source.favicon}
                                    alt=""
                                    className="w-4 h-4 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <Globe className="w-3 h-3 text-gray-400" />
                            )}
                        </div>
                    ))}
                    {sources.length > 4 && (
                        <span className="text-xs text-gray-500 ml-1">+{sources.length - 4}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchResultsCard;
