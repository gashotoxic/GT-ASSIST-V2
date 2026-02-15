import React from 'react';
import { ArrowRight, Camera, Download, Film, Play, Scissors } from 'lucide-react';
import { Button } from '../UI';

type GenType = 'image' | 'edit' | 'video';

export const MediaFooterActions: React.FC<{
  activeTab: GenType;
  generatedImageUrl: string | null;
  editedImageUrl: string | null;
  generatedVideoUrl: string | null;
  transferToEdit: (imageUrl: string) => void;
  transferToVideo: (imageUrl: string) => void;
  handleCaptureCurrentFrame: () => void;
  handleExtendVideo: () => void;
  handleUsePreviewVideoForLipSync: () => void;
}> = ({
  activeTab,
  generatedImageUrl,
  editedImageUrl,
  generatedVideoUrl,
  transferToEdit,
  transferToVideo,
  handleCaptureCurrentFrame,
  handleExtendVideo,
  handleUsePreviewVideoForLipSync,
}) => {
  return (
    <div className="mt-6 flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center justify-end gap-2 xs:gap-3 pb-8 lg:pb-0">
      {activeTab === 'image' && generatedImageUrl && (
        <>
          <Button variant="glass" onClick={() => transferToEdit(generatedImageUrl)}>
            <Scissors className="w-4 h-4 mr-2 text-purple-500" /> Magic Edit
          </Button>
          <Button variant="glass" onClick={() => transferToVideo(generatedImageUrl)}>
            <Film className="w-4 h-4 mr-2 text-blue-500" /> Animate
          </Button>
          <a className="w-full xs:w-auto" href={generatedImageUrl} download={`generated-image-${Date.now()}.png`}>
            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        </>
      )}

      {activeTab === 'edit' && editedImageUrl && (
        <>
          <Button variant="glass" onClick={() => transferToVideo(editedImageUrl)}>
            <Film className="w-4 h-4 mr-2 text-blue-500" /> Animate
          </Button>
          <a className="w-full xs:w-auto" href={editedImageUrl} download={`edited-image-${Date.now()}.png`}>
            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        </>
      )}

      {activeTab === 'video' && generatedVideoUrl && (
        <>
          <Button variant="glass" onClick={handleCaptureCurrentFrame}>
            <Camera className="w-4 h-4 mr-2 text-primary" /> Capture Frame
          </Button>
          <Button variant="glass" onClick={() => handleExtendVideo()}>
            <ArrowRight className="w-4 h-4 mr-2 text-green-500" /> Extend Video (Last Frame)
          </Button>
          <Button variant="glass" onClick={handleUsePreviewVideoForLipSync}>
            <Play className="w-4 h-4 mr-2 text-blue-500" /> Lip Sync
          </Button>
          <a className="w-full xs:w-auto" href={generatedVideoUrl} download={`generated-video-${Date.now()}.mp4`}>
            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        </>
      )}
    </div>
  );
};

