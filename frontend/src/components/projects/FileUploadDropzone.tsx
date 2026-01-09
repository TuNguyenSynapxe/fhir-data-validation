import { useCallback, useState } from 'react';
import { Upload, X, FileArchive, AlertCircle } from 'lucide-react';

interface FileUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export default function FileUploadDropzone({
  onFileSelect,
  accept = '.zip',
  maxSizeMB = 50,
  disabled = false,
}: FileUploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.zip')) {
        return 'Only ZIP files are allowed';
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      return null;
    },
    [maxSizeBytes, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;

      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-colors duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload size={32} className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                Drop ZIP file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                FHIR R5 Simplifier Package (.zip)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Maximum file size: {maxSizeMB}MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 justify-center">
            <FileArchive size={24} className="text-gray-600" />
            <div className="text-left flex-1 max-w-md">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-red-600 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
