import React from "react";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected([e.target.files[0]]);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <input 
        type="file" 
        onChange={handleChange} 
        accept="video/*" 
        title="Select Video File"
        placeholder="Select Video File"
      />
    </div>
  );
};
