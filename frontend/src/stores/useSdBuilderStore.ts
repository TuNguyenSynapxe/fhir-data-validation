/**
 * SD Builder Global State Store
 * 
 * Zustand store for managing SD Builder session state.
 * 
 * Rules:
 * - Never mutate design directly
 * - Always replace design with server response
 * - Mark dirty on any command
 * - Clear dirty after export
 */

import { create } from 'zustand';
import * as sdBuilderApi from '../api/sdBuilderApi';
import type { VisibilityMode } from '../types/treeNode';

// ============================================================================
// Store State Interface
// ============================================================================

interface SdBuilderState {
  // Session state
  sessionId: string | null;
  design: sdBuilderApi.ResourceDesignState | null;
  validation: sdBuilderApi.ValidationResult | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;

  // Tree UI state
  expandedPaths: Set<string>;
  selectedPath: string | null;
  visibilityMode: VisibilityMode;
  isCardinalityModeEnabled: boolean;

  // Actions
  startSession: (request: sdBuilderApi.StartSessionRequest) => Promise<void>;
  applyCommand: (command: sdBuilderApi.SdCommand) => Promise<void>;
  validate: () => Promise<void>;
  exportSd: (metadata: sdBuilderApi.SdMetadata) => Promise<unknown>;
  clearSession: () => void;
  
  // Tree actions
  toggleExpand: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectNode: (path: string | null) => void;
  setVisibilityMode: (mode: VisibilityMode) => void;
  toggleCardinalityMode: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSdBuilderStore = create<SdBuilderState>((set, get) => ({
  // Initial state
  sessionId: null,
  design: null,
  validation: null,
  dirty: false,
  loading: false,
  error: null,

  // Tree UI state
  expandedPaths: new Set<string>(),
  selectedPath: null,
  visibilityMode: 'Full',
  isCardinalityModeEnabled: false,

  /**
   * Start a new SD Builder session
   * - Initializes design state from backend
   * - Clears any previous session
   * - Resets dirty flag
   * - Expands all nodes by default
   */
  startSession: async (request: sdBuilderApi.StartSessionRequest) => {
    set({ loading: true, error: null });

    try {
      const response = await sdBuilderApi.startSession(request);

      // Expand all nodes by default
      const allPaths = new Set(response.design.elements.map(e => e.path));

      set({
        sessionId: response.sessionId,
        design: response.design,
        validation: null,
        dirty: false,
        loading: false,
        error: null,
        expandedPaths: allPaths,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start session';

      set({
        loading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * Apply a command to the design state
   * - Sends command to backend
   * - Replaces design with server response (no mutation)
   * - Marks session as dirty
   * - Clears validation (must re-validate after change)
   */
  applyCommand: async (command: sdBuilderApi.SdCommand) => {
    const { sessionId } = get();

    if (!sessionId) {
      throw new Error('No active session');
    }

    // Don't show loading for quick cardinality changes
    const isQuickCommand = command.commandType === 'SetCardinalityOverride';
    
    if (!isQuickCommand) {
      set({ loading: true, error: null });
    }

    try {
      const response = await sdBuilderApi.sendCommand(sessionId, command);

      set({
        design: response.design,
        dirty: true,
        validation: null, // Clear validation after change
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to apply command';

      set({
        loading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * Validate the current session state
   * - Sends validation request to backend
   * - Stores validation result
   * - Does not mark dirty
   */
  validate: async () => {
    const { sessionId } = get();

    if (!sessionId) {
      throw new Error('No active session');
    }

    set({ loading: true, error: null });

    try {
      const response = await sdBuilderApi.validateSession(sessionId);

      set({
        validation: response.validation,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to validate session';

      set({
        loading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * Export the session as a StructureDefinition
   * - Sends export request with metadata
   * - Clears dirty flag on success
   * - Returns opaque StructureDefinition JSON
   */
  exportSd: async (metadata: sdBuilderApi.SdMetadata) => {
    const { sessionId } = get();

    if (!sessionId) {
      throw new Error('No active session');
    }

    set({ loading: true, error: null });

    try {
      const response = await sdBuilderApi.exportStructureDefinition(
        sessionId,
        metadata
      );

      set({
        dirty: false, // Clear dirty flag after successful export
        loading: false,
        error: null,
      });

      return response.structureDefinition;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to export';

      set({
        loading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * Clear the current session
   * - Resets all state to initial values
   */
  clearSession: () => {
    set({
      sessionId: null,
      design: null,
      validation: null,
      dirty: false,
      loading: false,
      error: null,
      expandedPaths: new Set<string>(),
      selectedPath: null,
      visibilityMode: 'Full',
      isCardinalityModeEnabled: false,
    });
  },

  /**
   * Toggle expansion state of a tree node
   */
  toggleExpand: (path: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedPaths);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedPaths: newExpanded };
    });
  },

  /**
   * Expand all tree nodes
   */
  expandAll: () => {
    const { design } = get();
    if (!design) return;

    const allPaths = new Set(design.elements.map(e => e.path));
    set({ expandedPaths: allPaths });
  },

  /**
   * Collapse all tree nodes
   */
  collapseAll: () => {
    set({ expandedPaths: new Set<string>() });
  },

  /**
   * Select a tree node
   */
  selectNode: (path: string | null) => {
    set({ selectedPath: path });
  },

  /**
   * Set visibility mode (Minimal/Full/Expert)
   */
  setVisibilityMode: (mode: VisibilityMode) => {
    set({ visibilityMode: mode });
  },

  /**
   * Toggle Cardinality Mode (leaf-only cardinality editing)
   */
  toggleCardinalityMode: () => {
    set((state) => ({ isCardinalityModeEnabled: !state.isCardinalityModeEnabled }));
  },
}));
