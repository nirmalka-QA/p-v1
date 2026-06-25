// Standalone entry. Async import keeps Module Federation's shared-init contract
// happy (same pattern as the host). In composed mode the host imports the
// exposed ./ProjectApp directly and this file is never used.
import('./bootstrap.standalone')
