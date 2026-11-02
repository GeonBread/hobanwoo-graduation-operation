// Test-only preload: keep the native science gun in its 1.0 s firing window.
// The existing clone-count test expects emitted shots and otherwise varies with
// process startup time during the gun's 0.2 s rest window. No application imports this file.
Object.defineProperty(performance, 'now', {value: () => 500, configurable: true});
