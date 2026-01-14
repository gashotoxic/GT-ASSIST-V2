import React, { useState, useEffect, useCallback } from 'react';
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
        }
    };

    const handleImageCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunImageTour(false);
            localStorage.setItem('has_seen_image_tour', 'true');
        }
    };

    const handleEditCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunEditTour(false);
            localStorage.setItem('has_seen_edit_tour', 'true');
        }
    };

    const handleVideoCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunVideoTour(false);
            localStorage.setItem('has_seen_video_tour', 'true');
        }
    };

    // Chat Tour: 3 steps
    const chatSteps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Welcome to GashoChat! 👋</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Your AI assistant for chat and creative content.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#tour-settings-trigger',
            content: 'Change AI model & view your profile.',
            placement: 'right',
        },
        {
            target: '#tour-media-nav',
            content: 'Click here to generate images and videos.',
            placement: 'bottom',
        },
    ];

    // Image Tour: 3 steps
    const imageSteps: Step[] = [
        {
            target: '#tour-image-model',
            content: 'Select an image model (Qwen, FLUX, etc.).',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: '#tour-image-prompt',
            content: 'Describe what you want to create.',
            placement: 'right',
        },
        {
            target: '#tour-image-generate',
            content: 'Click Generate to create your image!',
            placement: 'right',
        },
    ];

    // Edit Tour: 3 steps
    const editSteps: Step[] = [
        {
            target: '#tour-edit-input-image',
            content: 'Upload an image to transform.',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: '#tour-edit-instruction',
            content: 'Describe your edit (e.g., "Make it sunset").',
            placement: 'right',
        },
        {
            target: '#tour-edit-apply',
            content: 'Click Apply to see the magic!',
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
            content: 'Describe the motion you want.',
            placement: 'right',
        },
        {
            target: '#tour-video-generate',
            content: 'Click Animate to bring it to life!',
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
                floaterProps={{ disableAnimation: true }}
            />
        </>
    );
};
