import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type RuleReviewStatus = 'OK' | 'WARNING' | 'BLOCKED';

interface RuleReviewBadgeProps {
  status: RuleReviewStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Phase 8: Governance status badge
 * Color-coded, icon-based, no text logic
 * Displays OK/WARNING/BLOCKED status from governance review
 */
export const RuleReviewBadge: React.FC<RuleReviewBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const config = {
    OK: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
      icon: CheckCircle2,
      label: 'OK',
    },
    WARNING: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      icon: AlertTriangle,
      label: 'WARNING',
    },
    BLOCKED: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: XCircle,
      label: 'BLOCKED',
    },
  };

  const { bgColor, textColor, borderColor, icon: Icon, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${bgColor} ${textColor} ${borderColor} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{label}</span>}
    </span>
  );
};
