import { useState } from 'react';
import type { ValidationResult } from '../model/ValidationResult';
import type { ValidationIssue } from '../model/ValidationIssue';
import {
  AmbiguityBanner,
  ValidationSummary,
  ValidationIssueRow,
  ValidationIssueDetails,
} from '../components';
import { useValidationResult } from '../api';
import styles from './ValidationResultsView.module.css';

interface ValidationResultsViewProps {
  projectId: string | null;
}

export function ValidationResultsView({ projectId }: ValidationResultsViewProps) {
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const { result, loading, error } = useValidationResult(projectId);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading validation results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2 className={styles.errorTitle}>Unable to Load Validation Results</h2>
          <p className={styles.errorMessage}>{error.message}</p>
          <p className={styles.errorNote}>
            The validation could not be retrieved from the server. This does NOT mean the data is valid.
          </p>
        </div>
      </div>
    );
  }

  // No result state (no projectId or initial state)
  if (!result) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No validation results available.</p>
        </div>
      </div>
    );
  }

  // Success state - render full validation UI

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
