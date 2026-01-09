import React from 'react';
import type { ValidationResult } from '../../model/ValidationResult';
import { getPolicyLabel } from '../../explainers/explainPolicy';
import styles from './ValidationSummary.module.css';

export interface ValidationSummaryProps {
  result: ValidationResult;
}

/**
 * ValidationSummary
 * 
 * Displays high-level validation outcome at a glance.
 * 
 * Shows:
 * - Error/warning/info counts
 * - Policy mode
 * - Ambiguity indicator (if present)
 * 
 * Does NOT show:
 * - Pass/fail verdict (validation passing ≠ clinically correct)
 * - Green checkmarks (no false confidence)
 * - "Success" language
 */
export function ValidationSummary({ result }: ValidationSummaryProps): JSX.Element {
  const { summary } = result;
  const { totalErrors, totalWarnings, totalInfo, hasAmbiguity, policyMode } = summary;

  return (
    <div className={styles.container}>
      {hasAmbiguity && (
        <div className={styles.ambiguityWarning}>
          ⚠️ Validation completed with ambiguity
        </div>
      )}
      
      <div className={styles.header}>
        <span className={styles.policyBadge}>
          Policy: {getPolicyLabel(policyMode)}
        </span>
      </div>

      <div className={styles.counts}>
        {totalErrors > 0 && (
          <div className={styles.countItem}>
            <span className={styles.errorIcon}>🔴</span>
            <span className={styles.countValue}>{totalErrors}</span>
            <span className={styles.countLabel}>Error{totalErrors !== 1 ? 's' : ''}</span>
          </div>
        )}

        {totalWarnings > 0 && (
          <div className={styles.countItem}>
            <span className={styles.warningIcon}>🟡</span>
            <span className={styles.countValue}>{totalWarnings}</span>
            <span className={styles.countLabel}>Warning{totalWarnings !== 1 ? 's' : ''}</span>
          </div>
        )}

        {totalInfo > 0 && (
          <div className={styles.countItem}>
            <span className={styles.infoIcon}>🔵</span>
            <span className={styles.countValue}>{totalInfo}</span>
            <span className={styles.countLabel}>Info</span>
          </div>
        )}

        {totalErrors === 0 && totalWarnings === 0 && totalInfo === 0 && (
          <div className={styles.noIssues}>
            No validation issues detected
          </div>
        )}
      </div>

      {hasAmbiguity && (
        <div className={styles.ambiguityNote}>
          Some constraints could not be verified deterministically
        </div>
      )}
    </div>
  );
}
