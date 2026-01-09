import React from 'react';
import type { ValidationIssue } from '../../model/ValidationIssue';
import { explainAmbiguity } from '../../explainers/explainAmbiguity';
import { explainPolicy } from '../../explainers/explainPolicy';
import styles from './AmbiguityBanner.module.css';

export interface AmbiguityBannerProps {
  issues: ValidationIssue[];
  policyMode: 'strict' | 'permissive';
}

/**
 * AmbiguityBanner
 * 
 * First-class warning for ambiguous validation.
 * 
 * Shows when ANY issue has violationReason (ambiguity explanation).
 * 
 * CRITICAL Rules:
 * - Cannot be dismissed
 * - Cannot be collapsed
 * - Must visually dominate the page
 * - Must explicitly state "does NOT mean the data is valid"
 * 
 * Ambiguity means validation could not be completed deterministically.
 * It does NOT mean the data is valid - it means we cannot confirm validity.
 */
export function AmbiguityBanner({ issues, policyMode }: AmbiguityBannerProps): React.ReactElement | null {
  // Find all ambiguous issues
  const ambiguousIssues = issues.filter(issue => issue.details?.violationReason);

  if (ambiguousIssues.length === 0) {
    return null;
  }

  // Get unique violation reasons
  const violationReasons = Array.from(
    new Set(
      ambiguousIssues
        .map(issue => issue.details?.violationReason)
        .filter((reason): reason is string => !!reason)
    )
  );

  const policyExplanation = explainPolicy({ policyMode } as any);

  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <div className={styles.header}>
        <span className={styles.icon}>⚠️</span>
        <h2 className={styles.title}>AMBIGUITY DETECTED</h2>
      </div>

      <div className={styles.mainWarning}>
        This validation could not be completed deterministically.
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Reasons:</h3>
        <ul className={styles.reasonsList}>
          {violationReasons.map((reason, index) => (
            <li key={index} className={styles.reasonItem}>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.criticalWarning}>
        ⚠️ This does NOT mean the data is valid.
        <br />
        It means we cannot confirm validity.
      </div>

      <div className={styles.policySection}>
        <strong>Policy Impact:</strong> {policyExplanation}
      </div>

      <div className={styles.linkSection}>
        <a href="/validation/capabilities" className={styles.link}>
          Learn more about what we validate →
        </a>
      </div>
    </div>
  );
}
