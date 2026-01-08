/**
 * Validation source categories
 * 
 * Indicates which validation subsystem produced the issue:
 * - StructureDefinition: Profile constraints, cardinality, data types
 * - FHIRPath: Business rules defined in FHIRPath DSL
 * - Reference: Resource reference validation
 * - Syntax: JSON structure, FHIR syntax compliance
 */
export type ValidationSource = 
  | 'StructureDefinition' 
  | 'FHIRPath' 
  | 'Reference' 
  | 'Syntax';
