/**
 * CSV Parser for CodeSystem Import
 * Phase 4B: Terminology Import
 * 
 * Supports:
 * - Flat CSV (simple list of codes)
 * - Hierarchical CSV (with parentCode column)
 * 
 * Required columns: code, display
 * Optional columns: definition, parentCode
 */

import type { CodeSystemConcept } from '../types/terminology';

export interface CSVParseResult {
  success: boolean;
  concepts?: CodeSystemConcept[];
  errors?: string[];
  warnings?: string[];
}

/**
 * Parse CSV content into CodeSystem concepts
 * Auto-detects flat vs hierarchical structure
 */
export function parseCSV(csvContent: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse CSV into rows
  const rows = parseCSVRows(csvContent);
  
  if (rows.length === 0) {
    return {
      success: false,
      errors: ['CSV file is empty'],
    };
  }

  // Extract headers and validate
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const validationResult = validateHeaders(headers);
  
  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors,
    };
  }

  // Build column index map
  const columnMap = buildColumnMap(headers);

  // Parse data rows into concepts
  const flatConcepts: Array<{
    code: string;
    display?: string;
    definition?: string;
    parentCode?: string;
    rowNumber: number;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    // Skip empty rows
    if (row.every(cell => !cell.trim())) {
      continue;
    }

    // Extract values
    const code = row[columnMap.code]?.trim();
    const display = row[columnMap.display]?.trim();
    const definition = columnMap.definition !== undefined 
      ? row[columnMap.definition]?.trim() 
      : undefined;
    const parentCode = columnMap.parentCode !== undefined
      ? row[columnMap.parentCode]?.trim()
      : undefined;

    // Validate required fields
    if (!code) {
      errors.push(`Row ${rowNumber}: Missing required 'code' field`);
      continue;
    }

    if (!display) {
      warnings.push(`Row ${rowNumber}: Missing 'display' field for code '${code}'`);
    }

    flatConcepts.push({
      code,
      display,
      definition,
      parentCode,
      rowNumber,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  // Check for duplicate codes
  const codeCounts = new Map<string, number[]>();
  flatConcepts.forEach(concept => {
    const existing = codeCounts.get(concept.code) || [];
    existing.push(concept.rowNumber);
    codeCounts.set(concept.code, existing);
  });

  codeCounts.forEach((rows, code) => {
    if (rows.length > 1) {
      errors.push(`Duplicate code '${code}' found on rows: ${rows.join(', ')}`);
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  // Build hierarchy if parentCode column exists
  const isHierarchical = columnMap.parentCode !== undefined;
  const concepts = isHierarchical
    ? buildHierarchy(flatConcepts, warnings)
    : flatConcepts.map(c => ({
        code: c.code,
        display: c.display,
        definition: c.definition,
      }));

  return {
    success: true,
    concepts,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Parse CSV string into rows (handles quoted fields with commas)
 */
function parseCSVRows(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        row.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    row.push(currentField);
    rows.push(row);
  }

  return rows;
}

/**
 * Validate CSV headers
 */
function validateHeaders(headers: string[]): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Check for required columns
  if (!headers.includes('code')) {
    errors.push("Missing required column: 'code'");
  }

  if (!headers.includes('display')) {
    errors.push("Missing required column: 'display'");
  }

  // Check for unknown columns
  const validColumns = ['code', 'display', 'definition', 'parentcode', 'parent'];
  const unknownColumns = headers.filter(h => !validColumns.includes(h));
  
  if (unknownColumns.length > 0) {
    // Just warn, don't error
    console.warn(`Unknown columns will be ignored: ${unknownColumns.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Build column index map from headers
 */
function buildColumnMap(headers: string[]): {
  code: number;
  display: number;
  definition?: number;
  parentCode?: number;
} {
  const map: any = {
    code: headers.indexOf('code'),
    display: headers.indexOf('display'),
  };

  const definitionIndex = headers.indexOf('definition');
  if (definitionIndex !== -1) {
    map.definition = definitionIndex;
  }

  // Support both 'parentCode' and 'parent'
  let parentIndex = headers.indexOf('parentcode');
  if (parentIndex === -1) {
    parentIndex = headers.indexOf('parent');
  }
  if (parentIndex !== -1) {
    map.parentCode = parentIndex;
  }

  return map;
}

/**
 * Build hierarchical structure from flat list with parentCode
 */
function buildHierarchy(
  flatConcepts: Array<{
    code: string;
    display?: string;
    definition?: string;
    parentCode?: string;
    rowNumber: number;
  }>,
  warnings: string[]
): CodeSystemConcept[] {
  // Build concept map
  const conceptMap = new Map<string, CodeSystemConcept>();
  
  flatConcepts.forEach(flat => {
    conceptMap.set(flat.code, {
      code: flat.code,
      display: flat.display,
      definition: flat.definition,
    });
  });

  // Build parent-child relationships
  const rootConcepts: CodeSystemConcept[] = [];
  
  flatConcepts.forEach(flat => {
    const concept = conceptMap.get(flat.code)!;

    if (!flat.parentCode) {
      // Root level concept
      rootConcepts.push(concept);
    } else {
      // Child concept - find parent
      const parent = conceptMap.get(flat.parentCode);
      
      if (!parent) {
        warnings.push(
          `Row ${flat.rowNumber}: Parent code '${flat.parentCode}' not found for code '${flat.code}'. ` +
          `Treating as root-level concept.`
        );
        rootConcepts.push(concept);
      } else {
        // Add to parent's children
        if (!parent.concept) {
          parent.concept = [];
        }
        parent.concept.push(concept);
      }
    }
  });

  return rootConcepts;
}

/**
 * Convert concepts to CSV format
 * Useful for export functionality
 */
export function conceptsToCSV(concepts: CodeSystemConcept[], includeHierarchy = false): string {
  const rows: string[][] = [];

  // Header row
  const headers = includeHierarchy
    ? ['code', 'display', 'definition', 'parentCode']
    : ['code', 'display', 'definition'];
  rows.push(headers);

  // Flatten concepts
  function flattenConcept(concept: CodeSystemConcept, parentCode?: string) {
    const row = [
      escapeCSVField(concept.code),
      escapeCSVField(concept.display || ''),
      escapeCSVField(concept.definition || ''),
    ];

    if (includeHierarchy) {
      row.push(escapeCSVField(parentCode || ''));
    }

    rows.push(row);

    // Process children
    if (concept.concept) {
      concept.concept.forEach(child => flattenConcept(child, concept.code));
    }
  }

  concepts.forEach(concept => flattenConcept(concept));

  // Convert to CSV string
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Escape CSV field (add quotes if contains comma, quote, or newline)
 */
function escapeCSVField(value: string): string {
  if (!value) return '';
  
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}
