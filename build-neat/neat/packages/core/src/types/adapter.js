/**
 * Neat Framework - HTTP Adapter Types (Framework Agnostic HTTP Layer)
 *
 * This module provides adapter interfaces for different HTTP frameworks,
 * enabling the Neat framework to work with Fastify, Express, or other servers.
 *
 * Key TypeScript Excellence Features:
 * - Generic adapter interfaces with proper abstraction
 * - Type-safe adapter configuration
 * - Framework-agnostic route registration
 * - Compile-time adapter validation
 *
 * Runtime Behavior: Adapters provide a unified interface for different HTTP servers,
 * allowing the framework to be transport-agnostic.
 *
 * Pain Points Addressed: Eliminates tight coupling to specific HTTP frameworks,
 * allowing developers to choose their preferred server implementation.
 */
// ========================================
// ADAPTER REGISTRY
// ========================================
/**
 * Registry for managing HTTP adapters.
 */
export class HttpAdapterRegistry {
    adapters = new Map();
    /**
     * Register an adapter.
     */
    register(adapter) {
        if (this.adapters.has(adapter.name)) {
            throw new Error(`Adapter already registered: ${adapter.name}`);
        }
        this.adapters.set(adapter.name, adapter);
    }
    /**
     * Get adapter by name.
     */
    get(name) {
        return this.adapters.get(name);
    }
    /**
     * Get default adapter (Fastify).
     */
    getDefault() {
        return this.adapters.get('fastify') || this.adapters.get('express');
    }
    /**
     * Get all registered adapters.
     */
    getAll() {
        return Array.from(this.adapters.values());
    }
    /**
     * Remove adapter by name.
     */
    remove(name) {
        return this.adapters.delete(name);
    }
    /**
     * Clear all adapters.
     */
    clear() {
        this.adapters.clear();
    }
}
// ========================================
// ADAPTER VALIDATION
// ========================================
/**
 * Validate adapter configuration.
 */
export function validateAdapterConfig(config) {
    if (config.port < 1 || config.port > 65535) {
        return {
            success: false,
            error: new Error(`Invalid port: ${config.port}. Must be between 1 and 65535.`),
        };
    }
    if (config.timeout && config.timeout < 0) {
        return {
            success: false,
            error: new Error(`Invalid timeout: ${config.timeout}. Must be non-negative.`),
        };
    }
    if (config.maxConnections && config.maxConnections < 1) {
        return {
            success: false,
            error: new Error(`Invalid maxConnections: ${config.maxConnections}. Must be at least 1.`),
        };
    }
    return { success: true, data: undefined };
}
/**
 * Check if adapter is compatible with current environment.
 */
export function isAdapterCompatible(adapter, nodeVersion) {
    // Basic compatibility checks
    const currentVersion = nodeVersion || process.version;
    // Add framework-specific compatibility checks here
    if (adapter.name === 'fastify' && !currentVersion.startsWith('v14') && !currentVersion.startsWith('v16') && !currentVersion.startsWith('v18') && !currentVersion.startsWith('v20')) {
        return {
            success: false,
            error: new Error(`Fastify adapter requires Node.js 14+. Current version: ${currentVersion}`),
        };
    }
    return { success: true, data: undefined };
}
//# sourceMappingURL=adapter.js.map