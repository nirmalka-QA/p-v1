// Standalone entry — async boundary for Module Federation (shared singletons
// init before use). In composed mode the host imports the exposed ./ProjectApp
// directly and this file is never used.
import('./bootstrap.standalone')
