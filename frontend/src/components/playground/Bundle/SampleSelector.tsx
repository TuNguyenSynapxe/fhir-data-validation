import React, { useState, useEffect } from 'react';
import { FileJson, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import type { FhirSampleMetadata } from '../../../types/fhirSample';
import { getSampleSource } from '../../../types/fhirSample';
import { SampleSourceBadge } from './SampleSourceBadge';

interface SampleSelectorProps {
  version?: string;
  resourceType?: string;
  onSampleLoad: (sampleJson: string, metadata: FhirSampleMetadata) => void;
  className?: string;
}

const RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Encounter',
  'Organization',
  'Location',
  'Practitioner',
  'PractitionerRole',
  'Condition',
  'Procedure',
  'MedicationRequest',
];

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  version = 'R4',
  resourceType: initialResourceType,
  onSampleLoad,
  className = '',
}) => {
  const [resourceType, setResourceType] = useState<string>(initialResourceType || 'Patient');
  const [samples, setSamples] = useState<FhirSampleMetadata[]>([]);
  const [selectedSample, setSelectedSample] = useState<FhirSampleMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Fetch samples when resource type changes
  useEffect(() => {
    fetchSamples();
  }, [resourceType, version]);

  const fetchSamples = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/fhir/samples?version=${version}&resourceType=${resourceType}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch samples: ${response.statusText}`);
      }
      const data: FhirSampleMetadata[] = await response.json();
      setSamples(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load samples');
      setSamples([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async (sample: FhirSampleMetadata) => {
    setIsLoadingSample(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/fhir/samples/${version}/${sample.resourceType}/${sample.id}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load sample: ${response.statusText}`);
      }
      const json = await response.text();
      setSelectedSample(sample);
      onSampleLoad(json, sample);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample');
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Resource Type Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-700">Resource Type</label>
        <div className="relative">
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
            disabled={isLoading}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Sample Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-700">
          Sample ({samples.length} available)
        </label>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-medium">Error loading samples</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        ) : samples.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            <FileJson className="w-5 h-5 mr-2" />
            No samples available
          </div>
        ) : (
          <div className="border border-gray-300 rounded-md max-h-96 overflow-y-auto">
            {samples.map((sample) => {
              const source = getSampleSource(sample);
              const isSelected = selectedSample?.id === sample.id;
              
              return (
                <button
                  key={sample.id}
                  onClick={() => handleLoadSample(sample)}
                  disabled={isLoadingSample}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''
                  } ${isLoadingSample ? 'cursor-wait opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`truncate ${isSelected ? 'font-medium text-blue-900' : 'text-gray-900'}`}>
                        {sample.display || sample.id}
                      </span>
                      <SampleSourceBadge source={source} />
                    </div>
                    {sample.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{sample.description}</p>
                    )}
                  </div>
                  
                  {isLoadingSample && selectedSample?.id === sample.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Sample Info */}
      {selectedSample && (
        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <FileJson className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 flex-1 min-w-0">
            <p className="font-medium">Loaded: {selectedSample.display || selectedSample.id}</p>
            <p className="mt-1 text-gray-600">
              Source: {getSampleSource(selectedSample) === 'HL7' ? 'HL7 FHIR R4 Specification' : 'Project Sample'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
