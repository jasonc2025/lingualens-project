import React, { useRef, useState, useEffect } from 'react';
import { Annotation } from '../types';
import { GripVertical } from 'lucide-react';

interface AnnotationOverlayProps {
  imageSrc: string;
  annotations: Annotation[];
  offsets: Record<number, { x: number; y: number }>;
  onOffsetChange: (index: number, offset: { x: number; y: number }) => void;
  onTextChange: (index: number, text: string) => void;
}

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({ 
  imageSrc, 
  annotations,
  offsets,
  onOffsetChange,
  onTextChange
}) => {
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Drag state tracking
  const [dragState, setDragState] = useState<{
    index: number;
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);

  // Edit state tracking
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (imgRef.current) {
        setContainerSize({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateSize);
    const img = imgRef.current;
    if (img && img.complete) updateSize();

    return () => window.removeEventListener('resize', updateSize);
  }, [imageSrc]);

  // Handle Global Drag Events
  useEffect(() => {
    if (!dragState || !containerSize) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dxPx = e.clientX - dragState.startX;
      const dyPx = e.clientY - dragState.startY;

      // Convert pixels to 0-1000 scale relative to image size
      const dxScale = (dxPx / containerSize.width) * 1000;
      const dyScale = (dyPx / containerSize.height) * 1000;

      const newOffset = {
        x: dragState.initialOffsetX + dxScale,
        y: dragState.initialOffsetY + dyScale
      };

      onOffsetChange(dragState.index, newOffset);
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, containerSize, onOffsetChange]);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    // If editing, don't start drag
    if (editingIndex === index) return;

    e.preventDefault(); // Prevent text selection
    e.stopPropagation();
    
    const currentOffset = offsets[index] || { x: 0, y: 0 };
    setDragState({
      index,
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: currentOffset.x,
      initialOffsetY: currentOffset.y
    });
  };

  return (
    <div className="relative inline-block w-full max-w-4xl overflow-hidden rounded-lg shadow-lg border border-slate-200 bg-slate-50 select-none">
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Analyzed Content"
        className="w-full h-auto block pointer-events-none"
        onLoad={() => {
            if (imgRef.current) {
                setContainerSize({
                    width: imgRef.current.clientWidth,
                    height: imgRef.current.clientHeight
                });
            }
        }}
      />
      
      {containerSize && annotations.map((ann, idx) => {
        // box_2d is [ymin, xmin, ymax, xmax] in 0-1000 scale
        const [ymin, xmin, ymax, xmax] = ann.box_2d;
        
        const isIdentical = ann.original.trim() === ann.translation.trim();

        // Calculate percentages for the box
        const top = ymin / 10;
        const left = xmin / 10;
        const height = (ymax - ymin) / 10;
        const width = (xmax - xmin) / 10;

        // Base Positioning Logic
        const isNearBottom = ymax > 850;
        const verticalStyle = isNearBottom 
            ? { bottom: '100%', marginBottom: '4px' } 
            : { top: '100%', marginTop: '4px' };
            
        // Horizontal Alignment Logic
        let baseTransformX = "-50%";
        let leftPos = "50%";
        
        if (xmin < 100) {
            baseTransformX = "0%";
            leftPos = "0%";
        } else if (xmax > 900) {
            baseTransformX = "0%";
            leftPos = "auto"; 
        }

        const rightPos = (xmax > 900 && xmin >= 100) ? "0%" : "auto";

        // Dynamic Font Size
        const fontSize = Math.max(12, Math.min(containerSize.width * 0.02, 16));

        // User Custom Offset (converted from 1000-scale back to pixels for rendering)
        const userOffset = offsets[idx] || { x: 0, y: 0 };
        const pixelOffsetX = (userOffset.x / 1000) * containerSize.width;
        const pixelOffsetY = (userOffset.y / 1000) * containerSize.height;

        const isEditing = editingIndex === idx;

        return (
          <div
            key={idx}
            className="absolute border-2 border-blue-500/40 hover:border-blue-500/80 transition-colors rounded-sm group"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              height: `${height}%`,
              boxShadow: '0 0 4px rgba(59, 130, 246, 0.2)',
            }}
          >
            {/* Translated Text Label */}
            {!isIdentical && (
                <div 
                    onMouseDown={(e) => handleMouseDown(e, idx)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingIndex(idx);
                    }}
                    className={`
                        absolute z-10 whitespace-nowrap bg-slate-900 text-white px-2 py-1 rounded shadow-md font-medium 
                        flex items-center gap-1 active:scale-105 transition-transform 
                        ${isEditing ? 'cursor-text ring-2 ring-blue-400' : 'cursor-move active:bg-blue-600'}
                        ${dragState?.index === idx ? 'z-50 ring-2 ring-white' : ''}
                    `}
                    style={{
                        ...verticalStyle,
                        left: leftPos,
                        right: rightPos,
                        fontSize: `${fontSize}px`,
                        maxWidth: isEditing ? 'none' : '300px',
                        overflow: isEditing ? 'visible' : 'hidden',
                        textOverflow: 'ellipsis',
                        // Combine alignment transform with user drag transform
                        transform: `translateX(${baseTransformX}) translate(${pixelOffsetX}px, ${pixelOffsetY}px)`
                    }}
                    title="Drag to move, Double-click to edit"
                >   
                    <GripVertical size={fontSize} className={`opacity-50 -ml-1 ${isEditing ? 'hidden' : ''}`} />
                    
                    {isEditing ? (
                        <input
                            type="text"
                            autoFocus
                            value={ann.translation}
                            onChange={(e) => onTextChange(idx, e.target.value)}
                            onBlur={() => setEditingIndex(null)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingIndex(null);
                                e.stopPropagation(); // Prevent triggering other listeners
                            }}
                            onMouseDown={(e) => e.stopPropagation()} // Allow text selection without dragging
                            className="bg-transparent text-white focus:outline-none min-w-[60px] p-0 m-0 border-none h-auto leading-none"
                            style={{ 
                                width: `${Math.max(ann.translation.length + 1, 4)}ch`,
                                fontSize: 'inherit',
                                lineHeight: 'inherit'
                            }}
                        />
                    ) : (
                        ann.translation
                    )}
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};