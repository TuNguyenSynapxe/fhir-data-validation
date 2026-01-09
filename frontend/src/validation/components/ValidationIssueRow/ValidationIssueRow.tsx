import React from 'react';
import type { ValidationIssue } from '../../model/ValidationIssue';
import styles from './ValidationIssueRow.module.css';

export interface ValidationIssueRowProps {
  issue: ValidationIssue;
  onSelect?: (issue: ValidationIssue) => void;
}

/**
 * ValidationIssueRow
 * 
 * One-line summary of a validation issue.
 * 
 * Displays:
 * - Severity icon
 * - Error code (machine-readable)
 * - Short message
 * - Path (FHIRPath location)
 * - Source (validation category)
 * 
 * Interactions:
 * - Click to select/expand (delegated to parent)
 */
export function ValidationIssueRow({ issue, onSelect }: ValidationIssueRowProps): JSX.Element {
  const { severity, errorCode, message, path, source } = issue;

  const getSeverityIcon = () => {
    switch (severity) {
      case 'error':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getSeverityClass = () => {
    switch (severity) {
      case 'error':
        return styles.severityError;
      case 'warning':
        return styles.severityWarning;
      case 'info':
        return styles.severityInfo;
      default:
        return '';
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(issue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`${styles.container} ${getSeverityClass()} ${onSelect ? styles.clickable : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className={styles.severityIcon}>
        {getSeverityIcon()}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.errorCode}>{errorCode}</span>
          <span className={styles.source}>{source}</span>
        </div>

        <div className={styles.message}>
          {message}
        </div>

        <div className={styles.path}>
          {path}
        </div>
      </div>
    </div>
  );
}
