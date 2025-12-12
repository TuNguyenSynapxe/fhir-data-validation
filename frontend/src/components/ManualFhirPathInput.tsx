import React from 'react';

interface ManualFhirPathInputProps {
  value: string;
  onChange: (value: string) => void;
}

const ManualFhirPathInput: React.FC<ManualFhirPathInputProps> = ({ value, onChange }) => {
  return (
    <div className="w-full">
      <label htmlFor="fhirpath-input" className="block text-sm font-medium text-gray-700 mb-2">
        Enter FHIRPath Expression
      </label>
      <textarea
        id="fhirpath-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. name.family"
        rows={6}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y"
      />
      <p className="text-xs text-gray-500 mt-2">
        Type your FHIRPath expression directly. Validation will be performed when you save.
      </p>
    </div>
  );
};

export default ManualFhirPathInput;
