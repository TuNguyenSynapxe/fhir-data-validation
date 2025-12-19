/**
 * Schema Eligibility Filtering for Rule Authoring
 * 
 * This module provides the single source of truth for determining
 * which FHIR schema nodes are eligible for rule creation.
 * 
 * Rules attach to meaning, not serialization details.
 * 
 * CRITICAL RULES:
 * - Primitive internals (.value, .extension, .id on primitives) are NOT eligible
 * - System fields (id, meta, implicitRules, language) are NOT eligible
 * - Root nodes are NOT eligible
 * - All other semantic nodes ARE eligible
 * 
 * This applies to ALL rule types: Required, Length, Terminology
 */

/**
 * FHIR primitive types that have internal structure
 * These types have .value, .extension, .id children that should NOT receive rules
 * 
 * Note: Backend returns capitalized type names (e.g., "String", "Code", "FhirBoolean")
 */
const PRIMITIVE_TYPES = [
  // Lowercase (standard FHIR names)
  'boolean',
  'integer',
  'decimal',
  'string',
  'uri',
  'url',
  'canonical',
  'code',
  'date',
  'dateTime',
  'instant',
  'time',
  'positiveInt',
  'unsignedInt',
  'id',
  'markdown',
  'base64Binary',
  'oid',
  'uuid',
  // Capitalized (backend variations)
  'Boolean',
  'Integer',
  'Decimal',
  'String',
  'Uri',
  'Url',
  'Canonical',
  'Code',
  'Date',
  'DateTime',
  'Instant',
  'Time',
  'PositiveInt',
  'UnsignedInt',
  'Id',
  'Markdown',
  'Base64Binary',
  'Oid',
  'Uuid',
  // Backend-specific names
  'FhirBoolean',
  'FhirString',
  'FhirUri',
  'FhirUrl',
  'FhirDecimal',
  'FhirInteger',
  'FhirDate',
  'FhirDateTime',
  'FhirInstant',
  'FhirTime',
  'FhirId',
];

/**
 * System-level fields that should never receive business rules
 */
const SYSTEM_FIELDS = ['id', 'meta', 'implicitRules', 'language'];

/**
 * Primitive internal field names that should never receive rules
 */
const PRIMITIVE_INTERNALS = ['value', 'extension', 'id'];

/**
 * Schema element structure (matches FhirSchemaTreeRenderer's SchemaElement)
 */
export interface SchemaElement {
  path: string;
  name: string;
  type: string[];         // Array of types (for choice types)
  cardinality: string;
  children?: SchemaElement[];
  
  // Eligibility metadata
  isPrimitive?: boolean;
  parentElement?: SchemaElement;
}

/**
 * Determine if a schema node is a FHIR primitive type
 * Handles both single type strings and type arrays
 */
export function isPrimitiveType(type: string | string[]): boolean {
  if (Array.isArray(type)) {
    // For choice types, check if the primary type is primitive
    return type.length > 0 && PRIMITIVE_TYPES.includes(type[0]);
  }
  return PRIMITIVE_TYPES.includes(type);
}

/**
 * Determine if a schema element is eligible for rule creation
 * 
 * This is the single source of truth for rule eligibility.
 * ALL rule types (Required, Length, Terminology) must use this function.
 * 
 * @param element - The schema element to check
 * @param parent - The parent schema element (if any)
 * @returns true if rules can be attached to this node
 */
export function isRuleEligibleNode(
  element: SchemaElement,
  parent?: SchemaElement | null
): boolean {
  const name = element.name;

  // 1. Exclude root nodes (no parent)
  if (!parent) {
    return false;
  }

  // 2. Exclude system-level fields
  if (SYSTEM_FIELDS.includes(name)) {
    return false;
  }

  // 3. Exclude primitive internals when parent is a primitive
  if (parent && parent.isPrimitive === true) {
    if (PRIMITIVE_INTERNALS.includes(name)) {
      return false;
    }
  }

  // 4. Exclude .extension on primitive types explicitly
  if (name === 'extension' && parent && parent.isPrimitive === true) {
    return false;
  }

  // 5. Otherwise, this is a semantic node eligible for rules
  return true;
}



/**
 * Determine if a node is a primitive internal field
 * 
 * These are FHIR specification internals that should be hidden by default
 * but can be revealed for power users.
 * 
 * @param element - The schema element to check
 * @param parent - The parent schema element
 * @returns true if this is a primitive internal field
 */
export function isPrimitiveInternalNode(
  element: SchemaElement,
  parent?: SchemaElement | null
): boolean {
  if (!parent) return false;

  return (
    parent.isPrimitive === true &&
    PRIMITIVE_INTERNALS.includes(element.name)
  );
}

/**
 * Determine if a node is an extension field
 * 
 * Extensions are advanced FHIR mechanisms for custom data beyond base spec.
 * They should be hidden by default but can be revealed for advanced users.
 * 
 * @param element - The schema element to check
 * @returns true if this is an extension node
 */
export function isExtensionNode(element: SchemaElement): boolean {
  return (
    element.name === 'extension' ||
    element.name === 'modifierExtension'
  );
}

/**
 * Get a human-readable explanation for why a node is ineligible
 * 
 * Useful for tooltips or error messages
 */
export function getIneligibilityReason(
  element: SchemaElement,
  parent?: SchemaElement | null
): string | null {
  if (!parent) {
    return 'Rules cannot be applied to root resource nodes';
  }

  if (SYSTEM_FIELDS.includes(element.name)) {
    return 'Rules cannot be applied to system-level fields (id, meta, etc.)';
  }

  if (parent && parent.isPrimitive === true) {
    if (PRIMITIVE_INTERNALS.includes(element.name)) {
      return 'Rules cannot be applied to primitive internal fields (value, extension, id)';
    }
  }

  if (element.name === 'extension' && parent && parent.isPrimitive === true) {
    return 'Rules cannot be applied to primitive extension fields';
  }

  return null; // Element is eligible
}
