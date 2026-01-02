// CRUD Toolkit - Índice de Exports
// Copie este arquivo para src/lib/crud/index.ts em cada sistema

// Hooks
export { useCRUD } from '@/hooks/useCRUD';
export { useSavedFilters } from '@/hooks/useSavedFilters';
export { useFulltextSearch } from '@/hooks/useFulltextSearch';
export { useDebouncedValue } from '@/hooks/useDebouncedValue';
export { useVersioning } from '@/hooks/useVersioning';
export { useDuplicate } from '@/hooks/useDuplicate';
export { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
export { useBulkActions } from '@/hooks/useBulkActions';
export { useSoftDelete } from '@/hooks/useSoftDelete';

// Components
export { DataImporter } from '@/components/DataImporter';
export { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
export { AdvancedFilters } from '@/components/AdvancedFilters';
export { SearchInput } from '@/components/SearchInput';
export { BulkActionsBar, defaultBulkActions } from '@/components/BulkActionsBar';
export { DuplicateButton } from '@/components/DuplicateButton';
export { VersionHistory } from '@/components/VersionHistory';
export { Pagination, PaginationCompact, usePagination } from '@/components/Pagination';
export { EntityListWrapper } from '@/components/EntityListWrapper';
export { DataTableSelectable } from '@/components/DataTableSelectable';
export { EmptyState } from '@/components/EmptyState';
export { ConfirmDialog } from '@/components/ConfirmDialog';
export { StatusBadge } from '@/components/StatusBadge';
export { LoadingOverlay } from '@/components/LoadingOverlay';

// Utilities
export { importCSV, generateCSVTemplate } from '@/lib/csvImporter';
export { importExcel, exportToExcel } from '@/lib/excelImporter';
export * from '@/lib/brazilValidators';

// Types
export type { FilterValue, FilterConfig } from '@/components/AdvancedFilters';
export type { Column } from '@/components/DataTableSelectable';
