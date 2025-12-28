/**
 * CodeSystem Export Utilities
 * Phase 1: Code + Display ONLY
 * 
 * Supports:
 * - JSON export (lean CodeSet structure)
 * - CSV export (code, display only)
 */

import type { CodeSystem } from '../types/terminology';
import { conceptsToCSV } from './csvParser';

/**
 * Export CodeSystem as lean JSON (Phase 1: code + display only)
 * Creates downloadable JSON file
 */
export function exportCodeSystemAsJson(codeSystem: CodeSystem): void {
  // Build Phase 1 lean JSON structure
  const leanJson = {
    url: codeSystem.url,
    name: codeSystem.name,
    concepts: codeSystem.concept.map(c => ({
      code: c.code,
      display: c.display,
    })),
  };

  // Convert to JSON string
  const jsonString = JSON.stringify(leanJson, null, 2);

  // Generate filename from CodeSystem name
  const filename = `${sanitizeFilename(codeSystem.name || 'CodeSet')}.json`;

  // Trigger download
  downloadFile(jsonString, filename, 'application/json');
}

/**
 * Export CodeSystem as CSV (Phase 1: code + display only)
 */
export function exportCodeSystemAsCsv(codeSystem: CodeSystem): void {
  // Phase 1: Flat structure only, no hierarchy
  const csvContent = conceptsToCSV(codeSystem.concept, false);

  // Generate filename
  const filename = `${sanitizeFilename(codeSystem.name || 'CodeSet')}.csv`;

  // Trigger download
  downloadFile(csvContent, filename, 'text/csv');
}

// ===== HELPER FUNCTIONS =====

/**
 * Sanitize filename (remove special characters)
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Remove consecutive dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

/**
 * Trigger browser file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  // Create blob
  const blob = new Blob([content], { type: mimeType });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get export filename for CodeSystem
 */
export function getExportFilename(codeSystem: CodeSystem, format: 'json' | 'csv'): string {
  const baseName = sanitizeFilename(codeSystem.name || 'CodeSet');
  return `${baseName}.${format}`;
}

/**
 * Get summary of exportable data (Phase 1: code + display only)
 */
export function getExportSummary(codeSystem: CodeSystem): {
  conceptCount: number;
} {
  return {
    conceptCount: codeSystem.concept.length,
  };
}
