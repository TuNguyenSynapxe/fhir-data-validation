import { useState } from 'react';
import type { ValidationResult } from '../model/ValidationResult';
import type { ValidationIssue } from '../model/ValidationIssue';
import {
  AmbiguityBanner,
  ValidationSummary,
  ValidationIssueRow,
  ValidationIssueDetails,
} from '../components';
import styles from './ValidationResultsView.module.css';

interface ValidationResultsViewProps {
  result: ValidationResult;
}

export function ValidationResultsView({ result }: ValidationResultsViewProps) {
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);

  return (
    <div className={styles.container}>
      {/* ALWAYS FIRST: Ambiguity Banner */}
      <AmbiguityBanner issues={result.issues} policyMode={result.summary.policyMode} />

      {/* Summary */}
      <div className={styles.summary}>
        <ValidationSummary result={result} />
      </div>

      {/* Issues List */}
      <div className={styles.issuesList}>
        <h2 className={styles.issuesTitle}>Validation Issues</h2>
        {result.issues.length === 0 ? (
          <p className={styles.noIssues}>No validation issues to display.</p>
        ) : (
          <div className={styles.issuesContainer}>
            {result.issues.map((issue, index) => (
              <ValidationIssueRow
                key={`${issue.path}-${issue.errorCode}-${index}`}
                issue={issue}
                onSelect={setSelectedIssue}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details Panel (only when selected) */}
      {selectedIssue && (
        <div className={styles.detailsPanel}>
          <div className={styles.detailsHeader}>
            <h2 className={styles.detailsTitle}>Issue Details</h2>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedIssue(null)}
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <ValidationIssueDetails issue={selectedIssue} />
        </div>
      )}
    </div>
  );
}
