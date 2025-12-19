import React from 'react';

/**
 * IndexRefinementInput - Numeric input for index refinement mode
 * 
 * Allows user to specify array index (default: 0)
 * No validation - accepts any integer
 */
interface IndexRefinementInputProps {
  value: number;
  onChange: (value: number) => void;
}

const IndexRefinementInput: React.FC<IndexRefinementInputProps> = ({
  value,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-300 rounded-md">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Array Index:
      </label>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min="0"
        step="1"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter index (e.g., 0, 1, 2)"
      />
      <p className="mt-1 text-xs text-gray-500">
        Specify which array element to select (0-based indexing)
      </p>
    </div>
  );
};

export default IndexRefinementInput;
