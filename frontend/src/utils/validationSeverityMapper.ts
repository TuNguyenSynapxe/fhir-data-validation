/**
 * Validation Severity to UI Mapping
 * 
 * Maps validation findings to UI presentation based on SOURCE and ENFORCEMENT,
 * NOT purely on backend severity labels.
 * 
 * This ensures:
 * - Blocking issues (Firely, Project Rules) → RED error styling
 * - Advisory issues (Lint, SpecHint) → AMBER/BLUE info styling
 * 
 * Even if backend severity = "error", advisory sources are never shown as blocking.
 */

export interface UiPresentation {
  icon: 'error' | 'warning' | 'info';
  color: 'red' | 'amber' | 'blue' | 'gray';
  label: string;
  isBlocking: boolean;
  displaySeverity: 'error' | 'warning' | 'info'; // UI-overridden severity
}

export interface ValidationFinding {
  source: string;
  severity: string;
  errorCode?: string;
  message: string;
}

/**
 * Advisory sources that NEVER produce blocking errors
 */
const ADVISORY_SOURCES = new Set([
  'LINT',
  'Lint',
  'lint',
  'SPECHINT',
  'SpecHint',
  'SPEC_HINT',
  'HL7_SPEC_HINT',
  'HL7Advisory',
  'HL7_ADVISORY'
]);

/**
 * Blocking sources that produce validation failures
 */
const BLOCKING_SOURCES = new Set([
  'FHIR',
  'Firely',
  'Business',
  'BUSINESS',
  'CodeMaster',
  'CODEMASTER',
  'Reference',
  'REFERENCE'
]);

/**
 * Maps a validation finding to UI presentation.
 * 
 * Decision logic:
 * 1. If source is LINT or SPECHINT → always advisory (amber/blue)
 * 2. If source is FHIR/Business/CodeMaster/Reference → blocking (red)
 * 3. Severity text is overridden based on source
 */
export function mapFindingToUiPresentation(finding: ValidationFinding): UiPresentation {
  const sourceNormalized = finding.source.toUpperCase();
  const severityNormalized = (finding.severity || 'error').toLowerCase();
  
  // LINT findings → Amber warning style (NEVER blocking)
  if (ADVISORY_SOURCES.has(finding.source) || sourceNormalized.includes('LINT')) {
    return {
      icon: 'warning',
      color: 'amber',
      label: 'Quality Finding',
      isBlocking: false,
      displaySeverity: 'warning'
    };
  }
  
  // SPECHINT findings → Blue info style (NEVER blocking)
  if (sourceNormalized.includes('SPEC') || sourceNormalized.includes('HL7')) {
    return {
      icon: 'info',
      color: 'blue',
      label: 'HL7 Advisory',
      isBlocking: false,
      displaySeverity: 'info'
    };
  }
  
  // Blocking sources → Red error style
  if (BLOCKING_SOURCES.has(finding.source)) {
    // Even within blocking sources, respect severity for warnings
    if (severityNormalized === 'warning') {
      return {
        icon: 'warning',
        color: 'amber',
        label: 'Validation Warning',
        isBlocking: false,
        displaySeverity: 'warning'
      };
    }
    
    if (severityNormalized === 'info') {
      return {
        icon: 'info',
        color: 'blue',
        label: 'Validation Info',
        isBlocking: false,
        displaySeverity: 'info'
      };
    }
    
    // Default blocking error
    return {
      icon: 'error',
      color: 'red',
      label: 'Blocking Issue',
      isBlocking: true,
      displaySeverity: 'error'
    };
  }
  
  // Unknown source → treat as warning
  return {
    icon: 'warning',
    color: 'amber',
    label: 'Validation Finding',
    isBlocking: false,
    displaySeverity: 'warning'
  };
}

/**
 * Get icon component name based on UI icon type
 */
export function getIconComponent(icon: 'error' | 'warning' | 'info'): string {
  switch (icon) {
    case 'error':
      return 'AlertCircle';
    case 'warning':
      return 'AlertTriangle';
    case 'info':
      return 'Info';
  }
}

/**
 * Get Tailwind color classes based on UI color
 */
export function getColorClasses(color: 'red' | 'amber' | 'blue' | 'gray'): {
  text: string;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  switch (color) {
    case 'red':
      return {
        text: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
        badgeBorder: 'border-red-300'
      };
    case 'amber':
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-300'
      };
    case 'blue':
      return {
        text: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-800',
        badgeBorder: 'border-blue-300'
      };
    case 'gray':
      return {
        text: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-800',
        badgeBorder: 'border-gray-300'
      };
  }
}

/**
 * Check if a finding should count as a blocking error
 * (for validation summary counts)
 */
export function isBlockingError(finding: ValidationFinding): boolean {
  const presentation = mapFindingToUiPresentation(finding);
  return presentation.isBlocking;
}

/**
 * Filter findings by blocking status
 */
export function filterBlockingErrors(findings: ValidationFinding[]): ValidationFinding[] {
  return findings.filter(isBlockingError);
}

/**
 * Filter findings by advisory status
 */
export function filterAdvisoryFindings(findings: ValidationFinding[]): ValidationFinding[] {
  return findings.filter(f => !isBlockingError(f));
}
