/**
 * Supporting UI Components for Terminology Management
 * Phase 3B: Stateless layout components
 */

import React from 'react';

/**
 * EmptyState - Display when a panel has no content
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  subMessage?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, message, subMessage, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <p className="text-lg font-medium mb-2">{message}</p>
      {subMessage && <p className="text-sm mb-4">{subMessage}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * LoadingState - Display while fetching data
 */
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  );
}

/**
 * NavigationBreadcrumb - Display navigation path
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavigationBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function NavigationBreadcrumb({ items }: NavigationBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-400">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-blue-600 hover:underline"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/**
 * PanelHeader - Consistent header for each column panel
 */
interface PanelHeaderProps {
  title: React.ReactNode;
  badge?: {
    label: string;
    variant?: 'default' | 'primary' | 'warning' | 'error';
  };
  actions?: React.ReactNode;
}

export function PanelHeader({ title, badge, actions }: PanelHeaderProps) {
  const badgeColors = {
    default: 'bg-gray-200 text-gray-700',
    primary: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {badge && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              badgeColors[badge.variant || 'default']
            }`}
          >
            {badge.label}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}

/**
 * FormField - Consistent form field layout
 */
interface FormFieldProps {
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, help, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {help && !error && <p className="text-sm text-gray-500 mt-1">{help}</p>}
    </div>
  );
}
