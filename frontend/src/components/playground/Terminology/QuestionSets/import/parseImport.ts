/**
 * Question Import Parsers
 * Supports CSV and JSON import for Question Sets
 */

export interface ImportValidationError {
  rowIndex?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParsedQuestion {
  system: string;
  code: string;
  display: string;
  description?: string;
  answerType: 'string-enum';
  enumConfig: {
    allowedValues: string[];
    allowMultiple: boolean;
    multipleValueSeparator?: ',' | '|' | ';';
  };
  isLocked: boolean;
}

export interface ImportResult {
  questions: ParsedQuestion[];
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

/**
 * Parse CSV file content
 * Expected header: system,code,display,description,allowed_values,allow_multiple,separator
 */
export function parseCsvQuestions(csvContent: string): ImportResult {
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationError[] = [];
  const questions: ParsedQuestion[] = [];

  // Split into lines and trim
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length === 0) {
    errors.push({
      message: 'CSV file is empty',
      severity: 'error',
    });
    return { questions, errors, warnings };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['system', 'code', 'display', 'allowed_values'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

  if (missingHeaders.length > 0) {
    errors.push({
      message: `Missing required CSV headers: ${missingHeaders.join(', ')}`,
      severity: 'error',
    });
    return { questions, errors, warnings };
  }

  // Get column indices
  const getIndex = (name: string) => headers.indexOf(name);
  const systemIdx = getIndex('system');
  const codeIdx = getIndex('code');
  const displayIdx = getIndex('display');
  const descriptionIdx = getIndex('description');
  const allowedValuesIdx = getIndex('allowed_values');
  const allowMultipleIdx = getIndex('allow_multiple');
  const separatorIdx = getIndex('separator');

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowIndex = i + 1; // 1-based for user display

    // Simple CSV parsing (handles basic cases, not full RFC 4180)
    const columns = line.split(',').map(col => col.trim());

    // Validate required fields
    const system = columns[systemIdx] || '';
    const code = columns[codeIdx] || '';
    const display = columns[displayIdx] || '';
    const description = descriptionIdx >= 0 ? columns[descriptionIdx] : undefined;
    const allowedValuesStr = columns[allowedValuesIdx] || '';

    if (!system) {
      errors.push({
        rowIndex,
        field: 'system',
        message: 'system is required',
        severity: 'error',
      });
      continue;
    }

    if (!code) {
      errors.push({
        rowIndex,
        field: 'code',
        message: 'code is required',
        severity: 'error',
      });
      continue;
    }

    if (!display) {
      errors.push({
        rowIndex,
        field: 'display',
        message: 'display is required',
        severity: 'error',
      });
      continue;
    }

    if (!allowedValuesStr) {
      errors.push({
        rowIndex,
        field: 'allowed_values',
        message: 'allowed_values is required',
        severity: 'error',
      });
      continue;
    }

    // Parse allowed values (detect delimiter: comma, pipe, or semicolon)
    let delimiter = ',';
    if (allowedValuesStr.includes('|')) delimiter = '|';
    else if (allowedValuesStr.includes(';')) delimiter = ';';

    const allowedValues = allowedValuesStr
      .split(delimiter)
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (allowedValues.length === 0) {
      errors.push({
        rowIndex,
        field: 'allowed_values',
        message: 'allowed_values must contain at least one value',
        severity: 'error',
      });
      continue;
    }

    // Check for duplicate values (case-insensitive)
    const lowerValues = allowedValues.map(v => v.toLowerCase());
    const uniqueValues = new Set(lowerValues);
    if (uniqueValues.size !== allowedValues.length) {
      errors.push({
        rowIndex,
        field: 'allowed_values',
        message: 'allowed_values contains duplicate values (case-insensitive)',
        severity: 'error',
      });
      continue;
    }

    // Parse allow_multiple
    const allowMultipleStr = allowMultipleIdx >= 0 ? columns[allowMultipleIdx]?.toLowerCase() : 'false';
    const allowMultiple = allowMultipleStr === 'true' || allowMultipleStr === '1';

    // Parse separator
    let separator: ',' | '|' | ';' | undefined;
    if (allowMultiple) {
      const separatorStr = separatorIdx >= 0 ? columns[separatorIdx] : '';
      if (separatorStr === ',' || separatorStr === '|' || separatorStr === ';') {
        separator = separatorStr;
      } else {
        separator = ','; // Default
      }
    }

    // Create question
    questions.push({
      system,
      code,
      display,
      description: description && description.length > 0 ? description : undefined,
      answerType: 'string-enum',
      enumConfig: {
        allowedValues,
        allowMultiple,
        multipleValueSeparator: separator,
      },
      isLocked: true,
    });
  }

  return { questions, errors, warnings };
}

/**
 * Parse JSON file content
 * Expected format: { format: "pss-question-import", version: "1.0", questions: [...] }
 */
export function parseJsonQuestions(jsonContent: string): ImportResult {
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationError[] = [];
  const questions: ParsedQuestion[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    errors.push({
      message: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`,
      severity: 'error',
    });
    return { questions, errors, warnings };
  }

  // Validate root structure
  if (parsed.format !== 'pss-question-import') {
    errors.push({
      message: 'Invalid format: expected "pss-question-import"',
      severity: 'error',
    });
    return { questions, errors, warnings };
  }

  if (parsed.version !== '1.0') {
    warnings.push({
      message: `Unsupported version: ${parsed.version}. Expected "1.0"`,
      severity: 'warning',
    });
  }

  if (!Array.isArray(parsed.questions)) {
    errors.push({
      message: 'Missing or invalid "questions" array',
      severity: 'error',
    });
    return { questions, errors, warnings };
  }

  // Parse each question
  parsed.questions.forEach((q: any, index: number) => {
    const rowIndex = index + 1;

    // Validate required fields
    if (!q.system || typeof q.system !== 'string') {
      errors.push({
        rowIndex,
        field: 'system',
        message: 'system is required and must be a string',
        severity: 'error',
      });
      return;
    }

    if (!q.code || typeof q.code !== 'string') {
      errors.push({
        rowIndex,
        field: 'code',
        message: 'code is required and must be a string',
        severity: 'error',
      });
      return;
    }

    if (!q.display || typeof q.display !== 'string') {
      errors.push({
        rowIndex,
        field: 'display',
        message: 'display is required and must be a string',
        severity: 'error',
      });
      return;
    }

    // Validate answer structure
    if (!q.answer || typeof q.answer !== 'object') {
      errors.push({
        rowIndex,
        field: 'answer',
        message: 'answer is required and must be an object',
        severity: 'error',
      });
      return;
    }

    if (q.answer.type !== 'string-enum') {
      errors.push({
        rowIndex,
        field: 'answer.type',
        message: 'answer.type must be "string-enum"',
        severity: 'error',
      });
      return;
    }

    if (!Array.isArray(q.answer.values) || q.answer.values.length === 0) {
      errors.push({
        rowIndex,
        field: 'answer.values',
        message: 'answer.values must be a non-empty array',
        severity: 'error',
      });
      return;
    }

    // Check for duplicate values (case-insensitive)
    const lowerValues = q.answer.values.map((v: any) => String(v).toLowerCase());
    const uniqueValues = new Set(lowerValues);
    if (uniqueValues.size !== q.answer.values.length) {
      errors.push({
        rowIndex,
        field: 'answer.values',
        message: 'answer.values contains duplicate values (case-insensitive)',
        severity: 'error',
      });
      return;
    }

    // Validate separator if allowMultiple is true
    const allowMultiple = q.answer.allowMultiple === true;
    let separator: ',' | '|' | ';' | undefined;

    if (allowMultiple) {
      if (q.answer.separator === ',' || q.answer.separator === '|' || q.answer.separator === ';') {
        separator = q.answer.separator;
      } else {
        separator = ','; // Default
      }
    }

    // Create question
    questions.push({
      system: q.system,
      code: q.code,
      display: q.display,
      description: q.description,
      answerType: 'string-enum',
      enumConfig: {
        allowedValues: q.answer.values.map(String),
        allowMultiple,
        multipleValueSeparator: separator,
      },
      isLocked: true,
    });
  });

  return { questions, errors, warnings };
}
