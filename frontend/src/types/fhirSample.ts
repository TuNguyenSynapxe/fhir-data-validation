export interface FhirSampleMetadata {
  id: string;
  resourceType: string;
  version: string;
  display: string;
  description?: string;
}

export type SampleSource = 'HL7' | 'Custom';

export function getSampleSource(sample: FhirSampleMetadata): SampleSource {
  // Infer source from filename prefix
  return sample.id.startsWith('hl7-') ? 'HL7' : 'Custom';
}
