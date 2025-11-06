// components/PreviewPanel.tsx
import React, { useEffect, useRef } from 'react';

interface PreviewPanelProps {
  show: boolean;
  onClose: () => void;
  htmlContent: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ show, onClose, htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (show && htmlContent) {
      if (blobUrl.current) {
        URL.revokeObjectURL(blobUrl.current);
      }
      const blob = new Blob([htmlContent], { type: 'text/html' });
      blobUrl.current = URL.createObjectURL(blob);
      if (iframeRef.current) {
        iframeRef.current.src = blobUrl.current;
      }
    } else if (!show && blobUrl.current) {
      URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = null;
      if (iframeRef.current) {
        iframeRef.current.src = ''; // Clear iframe content
      }
    }

    return () => {
      if (blobUrl.current) {
        URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = null;
      }
    };
  }, [show, htmlContent]);

  if (!show) return null;

  return (
    <div id="preview-panel" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-white border-2 border-accent-color rounded-md z-[1000] flex flex-col shadow-2xl
      sm:w-[95%] sm:h-[85%]">
      <div id="preview-header" className="bg-header-bg text-[#f0f0e0] px-3 py-2 flex justify-between items-center border-b border-accent-color">
        <span>Quantum Preview</span>
        <button id="close-preview" onClick={onClose} className="bg-transparent border-none text-[#f0f0e0] text-xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center">×</button>
      </div>
      <iframe ref={iframeRef} id="preview-content" className="w-full h-full border-none bg-white"></iframe>
    </div>
  );
};

export default PreviewPanel;
