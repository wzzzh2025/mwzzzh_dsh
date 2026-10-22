/**
 * Memory-protocol settings row, node half. Empty by design: the browser half
 * owns the control, discovered from the `dsh.client` declaration. Writes go
 * through the Host `memory-protocol` settings namespace.
 */

/** Host plugin body — no host-side behaviour for this surface plugin. */
export function apply(): void {}
