import React from 'react';
import type { ValidationIssue } from '../../model/ValidationIssue';
import { explainError } from '../../explainers/explainError';
import { explainAmbiguity } from '../../explainers/explainAmbiguity';
import styles from './ValidationIssueDetails.module.css';

export interface ValidationIssueDetailsProps {
  issue: ValidationIssue;
}

/**
 * ValidationIssueDetails
 * 
 * Full explanation of a single validation issue.
 * 
 * Uses Phase 5.1 explainers to generate human-readable explanations.
 * 
 * Sections:
 * 1. What Failed
 * 2. Why It Failed
 * 3. Context (if present)
 * 4. Policy Impact (if applicable)
 * 5. Ambiguity Warning (if applicable)
 * 
 * CRITICAL: All explanations come from explainers - NO string building in JSX.
 */
export function ValidationIssueDetails({ issue }: ValidationIssueDetailsProps): JSX.Element {
  const explanation = explainError(issue);
  const ambiguityExplanation = explainAmbiguity(issue);

  return (
    <div className={styles.container}>
      {/* Ambiguity Warning (if applicable) */}
      {ambiguityExplanation && (
        <div className={styles.ambiguitySection}>
          <div className={styles.ambiguityHeader}>
            ⚠️ {ambiguityExplanation.what}
          </div>
          <div className={styles.ambiguityContent}>
            {ambiguityExplanation.context}
          </div>
          {ambiguityExplanation.policy && (
            <div className={styles.ambiguityPolicy}>
              {ambiguityExplanation.policy}
            </div>
          )}
        </div>
      )}

      {/* What Failed */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>What Failed</h3>
        <div className={styles.sectionContent}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Error Code:</span>
            <span className={styles.fieldValue}>{issue.errorCode}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Description:</span>
            <span className={styles.fieldValue}>{explanation.what}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Path:</span>
            <span className={styles.fieldValueMono}>{issue.path}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Source:</span>
            <span className={styles.fieldValue}>{issue.source}</span>
          </div>
        </div>
      </div>

      {/* Why It Failed */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Why It Failed</h3>
        <div className={styles.sectionContent}>
          <p className={styles.explanation}>{explanation.why}</p>
        </div>
      </div>

      {/* Context (if present) */}
      {explanation.context && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Context</h3>
          <div className={styles.sectionContent}>
            <pre className={styles.contextPre}>{explanation.context}</pre>
          </div>
        </div>
      )}

      {/* Policy Impact (if applicable) */}
      {explanation.policy && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Policy Impact</h3>
          <div className={styles.sectionContent}>
            <p className={styles.explanation}>{explanation.policy}</p>
          </div>
        </div>
      )}

      {/* Links (if present) */}
      {explanation.links && explanation.links.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Related Documentation</h3>
          <div className={styles.sectionContent}>
            <ul className={styles.linksList}>
              {explanation.links.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
