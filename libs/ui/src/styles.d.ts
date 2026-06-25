// CSS Module ambient declarations so the lib typechecks without vite/client
// (consumers' bundlers resolve the actual classes at build time).
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
declare module '*.css'
