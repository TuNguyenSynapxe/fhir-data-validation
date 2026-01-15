/**
 * Terminology Store
 * 
 * Zustand store for ValueSet search and preview state.
 * 
 * DESIGN PRINCIPLES:
 * - No coupling to SD Builder store
 * - No FHIR logic
 * - No side effects outside API calls
 * - Search is explicit (not auto-triggered)
 * - Preview is read-only
 */

import { create } from 'zustand';
import type {
  ValueSetSummaryDto,
  ValueSetCodeDto,
  ValueSetPreviewDto,
  TerminologyLayer,
} from '../api/terminologyApi';
import {
  searchValueSets,
  getValueSetDetails,
  previewValueSetCodes,
} from '../api/terminologyApi';

/**
 * Terminology store state
 */
interface TerminologyState {
  // Search state
  searchQuery: string;
  searchResults: ValueSetSummaryDto[];
  searchLoading: boolean;
  searchError: string | null;

  // Selected ValueSet state
  selectedValueSet: ValueSetSummaryDto | null;
  detailsLoading: boolean;
  detailsError: string | null;

  // Preview codes state
  previewCodes: ValueSetCodeDto[];
  previewLoading: boolean;
  previewError: string | null;
  previewTotalCodes: number;

  // Actions
  search: (query: string, layer?: TerminologyLayer) => Promise<void>;
  selectValueSet: (canonicalUrl: string) => Promise<void>;
  loadPreviewCodes: (canonicalUrl: string, maxItems?: number) => Promise<void>;
  clearSelection: () => void;
  clearSearch: () => void;
  setSearchQuery: (query: string) => void;
}

/**
 * Create terminology store
 */
export const useTerminologyStore = create<TerminologyState>((set, get) => ({
  // Initial state
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  searchError: null,

  selectedValueSet: null,
  detailsLoading: false,
  detailsError: null,

  previewCodes: [],
  previewLoading: false,
  previewError: null,
  previewTotalCodes: 0,

  // Actions
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  search: async (query: string, layer?: TerminologyLayer) => {
    set({
      searchLoading: true,
      searchError: null,
      searchQuery: query,
    });

    try {
      const results = await searchValueSets(query, layer);
      set({
        searchResults: results,
        searchLoading: false,
      });
    } catch (error) {
      set({
        searchResults: [],
        searchLoading: false,
        searchError: error instanceof Error ? error.message : 'Search failed',
      });
    }
  },

  selectValueSet: async (canonicalUrl: string) => {
    set({
      detailsLoading: true,
      detailsError: null,
      selectedValueSet: null,
      previewCodes: [],
      previewTotalCodes: 0,
    });

    try {
      const details = await getValueSetDetails(canonicalUrl);
      set({
        selectedValueSet: details,
        detailsLoading: false,
      });
    } catch (error) {
      set({
        detailsLoading: false,
        detailsError: error instanceof Error ? error.message : 'Failed to load details',
      });
    }
  },

  loadPreviewCodes: async (canonicalUrl: string, maxItems = 100) => {
    set({
      previewLoading: true,
      previewError: null,
    });

    try {
      const preview: ValueSetPreviewDto = await previewValueSetCodes(canonicalUrl, maxItems);
      set({
        previewCodes: preview.codes,
        previewTotalCodes: preview.codes.length,
        previewLoading: false,
      });
    } catch (error) {
      set({
        previewCodes: [],
        previewTotalCodes: 0,
        previewLoading: false,
        previewError: error instanceof Error ? error.message : 'Failed to load preview',
      });
    }
  },

  clearSelection: () => {
    set({
      selectedValueSet: null,
      detailsError: null,
      previewCodes: [],
      previewTotalCodes: 0,
      previewError: null,
    });
  },

  clearSearch: () => {
    set({
      searchQuery: '',
      searchResults: [],
      searchError: null,
      selectedValueSet: null,
      detailsError: null,
      previewCodes: [],
      previewTotalCodes: 0,
      previewError: null,
    });
  },
}));
