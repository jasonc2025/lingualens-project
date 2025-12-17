import React, { useRef, useState } from 'react';
import { Upload, FileImage, AlertCircle } from 'lucide-react';

interface UploaderProps {
  onFileSelect: (base64: string, fileType: string) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Currently only image files (JPG, PNG, WEBP) are supported for the best experience.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:image/xxx;base64, prefix for the API (though generateContent can handle full strings often, it's safer to strip for some libs, but google-genai handles data urls usually if passed correctly. 
      // Actually @google/genai expects raw base64 string for inlineData.
      const rawBase64 = base64.split(',')[1]; 
      onFileSelect(rawBase64, file.type);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div 
        className={`
            relative w-full max-w-2xl mx-auto h-64 rounded-xl border-2 border-dashed 
            transition-all duration-300 ease-in-out flex flex-col items-center justify-center p-6 text-center
            ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:border-slate-400"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        multiple={false} 
        accept="image/*"
        onChange={handleChange}
      />
      
      <div className="bg-blue-100 p-4 rounded-full mb-4">
        <Upload className="w-8 h-8 text-blue-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 mb-1">
        Upload an Image
      </h3>
      <p className="text-slate-500 mb-6 text-sm">
        Drag and drop your image here, or click to browse.
      </p>
      
      <button 
        onClick={onButtonClick}
        className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        Select File
      </button>

      <div className="absolute bottom-4 flex items-center gap-2 text-xs text-slate-400">
        <FileImage size={14} />
        <span>Supports JPG, PNG, WEBP</span>
      </div>
    </div>
  );
};