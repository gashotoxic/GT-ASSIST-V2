import React, { useState, useEffect, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface OnboardingTourProps {
    currentView: string;
    setCurrentView: (view: any) => void;
    openSidebar: () => void;
    theme: 'light' | 'dark';
    isSignedIn: boolean;
    activeMediaTab?: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ currentView, setCurrentView, openSidebar, theme, isSignedIn, activeMediaTab }) => {
    const [runChatTour, setRunChatTour] = useState(false);
    const [runImageTour, setRunImageTour] = useState(false);
    const [runEditTour, setRunEditTour] = useState(false);
    const [runVideoTour, setRunVideoTour] = useState(false);
    const [tourBanner, setTourBanner] = useState<{ isOpen: boolean; tour: 'chat' | 'image' | 'edit' | 'video' | null }>({
        isOpen: false,
        tour: null,
    });
    const bannerTimerRef = useRef<number | null>(null);

    const hideBanner = useCallback(() => {
        setTourBanner({ isOpen: false, tour: null });
        if (bannerTimerRef.current) {
            window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
    }, []);

    const showBanner = useCallback((tour: 'chat' | 'image' | 'edit' | 'video') => {
        setTourBanner({ isOpen: true, tour });
        if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = window.setTimeout(() => {
            setTourBanner({ isOpen: false, tour: null });
            bannerTimerRef.current = null;
        }, 7000);
    }, []);

    const triggerTour = useCallback((tour: 'chat' | 'image' | 'edit' | 'video') => {
        setRunChatTour(false);
        setRunImageTour(false);
        setRunEditTour(false);
        setRunVideoTour(false);

        window.setTimeout(() => {
            if (tour === 'chat') setRunChatTour(true);
            if (tour === 'image') setRunImageTour(true);
            if (tour === 'edit') setRunEditTour(true);
            if (tour === 'video') setRunVideoTour(true);
        }, 60);
    }, []);

    const triggerCurrentTour = useCallback(() => {
        if (!isSignedIn) return;

        if (currentView !== 'chat' && currentView !== 'media') {
            setCurrentView('chat');
            triggerTour('chat');
            return;
        }

        if (currentView === 'media') {
            const mediaTour: 'image' | 'edit' | 'video' = activeMediaTab === 'edit' ? 'edit' : activeMediaTab === 'video' ? 'video' : 'image';
            triggerTour(mediaTour);
            return;
        }

        triggerTour('chat');
    }, [activeMediaTab, currentView, isSignedIn, setCurrentView, triggerTour]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail as { tour?: 'chat' | 'image' | 'edit' | 'video' | 'current' } | undefined;
            if (detail?.tour && detail.tour !== 'current') {
                triggerTour(detail.tour);
                return;
            }
            triggerCurrentTour();
        };
        window.addEventListener('start-tour', handler as EventListener);
        return () => window.removeEventListener('start-tour', handler as EventListener);
    }, [triggerCurrentTour, triggerTour]);

    // Chat Tour - runs on first login
    useEffect(() => {
        if (isSignedIn && currentView === 'chat') {
            const hasSeenChat = localStorage.getItem('has_seen_chat_tour');
            if (!hasSeenChat) {
                setTimeout(() => setRunChatTour(true), 300);
            }
        }
    }, [isSignedIn]);

    // Image Tour - runs when on media view with image tab
    useEffect(() => {
        if (isSignedIn && currentView === 'media' && activeMediaTab === 'image') {
            const hasSeenImage = localStorage.getItem('has_seen_image_tour');
            if (!hasSeenImage) {
                setTimeout(() => setRunImageTour(true), 600);
            }
        }
    }, [isSignedIn, currentView, activeMediaTab]);

    // Edit Tour - runs when switching to edit tab
    useEffect(() => {
        if (isSignedIn && currentView === 'media' && activeMediaTab === 'edit') {
            const hasSeenEdit = localStorage.getItem('has_seen_edit_tour');
            if (!hasSeenEdit) {
                setTimeout(() => setRunEditTour(true), 400);
            }
        }
    }, [isSignedIn, currentView, activeMediaTab]);

    // Video Tour - runs when switching to video tab
    useEffect(() => {
        if (isSignedIn && currentView === 'media' && activeMediaTab === 'video') {
            const hasSeenVideo = localStorage.getItem('has_seen_video_tour');
            if (!hasSeenVideo) {
                setTimeout(() => setRunVideoTour(true), 400);
            }
        }
    }, [isSignedIn, currentView, activeMediaTab]);

    const handleChatCallback = (data: CallBackProps) => {
        const { status, index, type, action } = data;

        // Open sidebar for step 2 (settings trigger)
        if (index === 1 && type === 'step:before') {
            openSidebar();
        }

        // Close sidebar before step 3 (media nav) so it's visible
        if (index === 2 && type === 'step:before') {
            // Dispatch event to close sidebar
            window.dispatchEvent(new CustomEvent('close-sidebar'));
        }

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunChatTour(false);
            localStorage.setItem('has_seen_chat_tour', 'true');
            window.dispatchEvent(new CustomEvent('close-sidebar'));
            if (status === STATUS.SKIPPED || action === 'close') {
                showBanner('chat');
            }
        }
    };

    const handleImageCallback = (data: CallBackProps) => {
        const { status, action } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunImageTour(false);
            localStorage.setItem('has_seen_image_tour', 'true');
            if (status === STATUS.SKIPPED || action === 'close') {
                showBanner('image');
            }
        }
    };

    const handleEditCallback = (data: CallBackProps) => {
        const { status, action } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunEditTour(false);
            localStorage.setItem('has_seen_edit_tour', 'true');
            if (status === STATUS.SKIPPED || action === 'close') {
                showBanner('edit');
            }
        }
    };

    const handleVideoCallback = (data: CallBackProps) => {
        const { status, action } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunVideoTour(false);
            localStorage.setItem('has_seen_video_tour', 'true');
            if (status === STATUS.SKIPPED || action === 'close') {
                showBanner('video');
            }
        }
    };

    // Chat Tour: 3 steps
    const chatSteps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Welcome to GashoChat</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Here’s a quick tour to help you find the important buttons.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#tour-settings-trigger',
            content: 'Open settings to change your model, theme, and account options.',
            placement: 'right',
        },
        {
            target: '#tour-media-nav',
            content: 'Go to Media to generate images, edit photos, and animate videos.',
            placement: 'bottom',
        },
    ];

    // Image Tour: 3 steps
    const imageSteps: Step[] = [
        {
            target: '#tour-image-model',
            content: 'Pick an image model (different models have different styles).',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: '#tour-image-prompt',
            content: 'Describe what you want to create (be specific for best results).',
            placement: 'right',
        },
        {
            target: '#tour-image-generate',
            content: 'Tap Generate and your image will appear on the right.',
            placement: 'right',
        },
    ];

    // Edit Tour: 3 steps
    const editSteps: Step[] = [
        {
            target: '#tour-edit-input-image',
            content: 'Upload an image you want to change.',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: '#tour-edit-instruction',
            content: 'Describe the change (example: “make it sunset”).',
            placement: 'right',
        },
        {
            target: '#tour-edit-apply',
            content: 'Tap Apply to generate the edited version.',
            placement: 'right',
        },
    ];

    // Video Tour: 3 steps
    const videoSteps: Step[] = [
        {
            target: '#tour-video-mode-selector',
            content: 'Choose Image-to-Video or Text-to-Video.',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: '#tour-video-prompt',
            content: 'Describe the motion you want (camera + action).',
            placement: 'right',
        },
        {
            target: '#tour-video-generate',
            content: 'Tap Animate to generate your video preview.',
            placement: 'right',
        },
    ];

    const commonStyles = {
        options: {
            primaryColor: '#10b981',
            textColor: theme === 'dark' ? '#f8fafc' : '#1e293b',
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.90)' : 'rgba(255, 255, 255, 0.90)',
            arrowColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.90)' : 'rgba(255, 255, 255, 0.90)',
            overlayColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 10000,
        },
        tooltip: {
            borderRadius: '24px',
            padding: '24px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        },
        buttonNext: {
            backgroundColor: '#10b981',
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            border: 'none',
        },
        buttonBack: {
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            marginRight: '10px',
            fontWeight: 500,
        },
        buttonSkip: {
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            fontWeight: 500,
            fontSize: '14px',
        }
    };

    const commonLocale = {
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Not now',
    };

    const bannerMessage =
        tourBanner.tour === 'image'
            ? 'Guide closed. Want to try the Image guide again?'
            : tourBanner.tour === 'edit'
              ? 'Guide closed. Want to try the Edit guide again?'
              : tourBanner.tour === 'video'
                ? 'Guide closed. Want to try the Video guide again?'
                : 'Guide closed. Want to try the Chat guide again?';

    return (
        <>
            <Joyride
                steps={chatSteps}
                run={runChatTour}
                continuous
                showProgress
                showSkipButton
                callback={handleChatCallback}
                styles={commonStyles}
                locale={commonLocale}
                floaterProps={{ disableAnimation: true }}
            />
            <Joyride
                steps={imageSteps}
                run={runImageTour}
                continuous
                showProgress
                showSkipButton
                callback={handleImageCallback}
                styles={commonStyles}
                locale={commonLocale}
                floaterProps={{ disableAnimation: true }}
            />
            <Joyride
                steps={editSteps}
                run={runEditTour}
                continuous
                showProgress
                showSkipButton
                callback={handleEditCallback}
                styles={commonStyles}
                locale={commonLocale}
                floaterProps={{ disableAnimation: true }}
            />
            <Joyride
                steps={videoSteps}
                run={runVideoTour}
                continuous
                showProgress
                showSkipButton
                callback={handleVideoCallback}
                styles={commonStyles}
                locale={commonLocale}
                floaterProps={{ disableAnimation: true }}
            />
            {tourBanner.isOpen && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] w-[min(560px,calc(100vw-24px))]">
                    <div className="rounded-2xl bg-white/20 dark:bg-slate-900/30 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {bannerMessage}
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                                You can also restart anytime from the Guide button in Settings.
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => {
                                    const tour = tourBanner.tour || 'chat';
                                    hideBanner();
                                    triggerTour(tour);
                                }}
                                className="h-9 px-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#16a085] transition-colors"
                            >
                                Restart
                            </button>
                            <button
                                onClick={hideBanner}
                                className="h-9 px-3 rounded-xl bg-white/20 dark:bg-white/10 border border-white/40 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold hover:bg-white/30 dark:hover:bg-white/15 transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
