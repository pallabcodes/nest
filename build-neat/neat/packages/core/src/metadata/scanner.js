/**
 * Neat Framework - Metadata Scanner (Decorator Metadata Reading)
 *
 * This module provides god-moded TypeScript metadata scanning capabilities
 * for reading decorator metadata from classes, methods, and properties.
 *
 * Key TypeScript Excellence Features:
 * - Generic metadata scanning with type safety
 * - Conditional types for metadata inference
 * - Template literal types for metadata keys
 * - Advanced reflection patterns
 * - Type-safe metadata access with exhaustive checking
 *
 * Runtime Behavior: Uses reflect-metadata library to read decorator metadata
 * with zero runtime overhead for type checking.
 *
 * Framework Integration: Essential foundation for all decorator-based functionality
 * including dependency injection, routing, and strategy patterns.
 *
 * Pain Points Addressed: Eliminates unsafe metadata access patterns common in
 * other frameworks, providing compile-time guarantees for metadata operations.
 *
 * Research: Inspired by NestJS metadata scanner but with stronger typing and
 * more advanced TypeScript patterns.
 */
import 'reflect-metadata';
import { globSync } from 'glob';
import { METADATA_KEYS } from './keys.js';
import { getScannerConfig, shouldScanTypeScript, shouldScanJavaScript, getCachedScanResults, setCachedScanResults } from './config.js';
// ========================================
// METADATA SCANNER CLASS
// ========================================
/**
 * God-moded TypeScript metadata scanner with comprehensive type safety.
 *
 * Provides type-safe access to decorator metadata with compile-time guarantees.
 * Uses advanced TypeScript patterns for metadata inference and validation.
 */
export class MetadataScanner {
    /**
     * Scan class metadata with type safety.
     */
    scanClass(target) {
        const injectable = this.getMetadata(METADATA_KEYS.INJECTABLE, target);
        const controller = this.getMetadata(METADATA_KEYS.CONTROLLER, target);
        const module = this.getMetadata(METADATA_KEYS.MODULE, target);
        const strategies = this.getMetadata(METADATA_KEYS.STRATEGY_KEY, target);
        const onInit = this.getMetadata(METADATA_KEYS.ON_INIT, target);
        const onDestroy = this.getMetadata(METADATA_KEYS.ON_DESTROY, target);
        return {
            ...(injectable !== undefined && { injectable }),
            ...(controller && { controller }),
            ...(module && { module }),
            ...(strategies && { strategies }),
            lifecycle: {
                ...(onInit && { onInit }),
                ...(onDestroy && { onDestroy }),
            },
        };
    }
    /**
     * Scan method metadata for a specific method.
     */
    scanMethod(target, methodName) {
        const methodTarget = target.prototype;
        const propertyKey = methodName;
        const routes = this.getMetadata(METADATA_KEYS.ROUTE, methodTarget, propertyKey);
        const middlewares = this.getMetadata(METADATA_KEYS.MIDDLEWARE, methodTarget, propertyKey);
        const guards = this.getMetadata(METADATA_KEYS.GUARD, methodTarget, propertyKey);
        const interceptors = this.getMetadata(METADATA_KEYS.INTERCEPTOR, methodTarget, propertyKey);
        return {
            ...(routes && { routes }),
            ...(middlewares && { middlewares }),
            ...(guards && { guards }),
            ...(interceptors && { interceptors }),
        };
    }
    /**
     * Scan all methods in a class for metadata.
     */
    scanClassMethods(target) {
        const methods = {};
        const prototype = target.prototype;
        // Get all method names from prototype
        const methodNames = Object.getOwnPropertyNames(prototype)
            .filter(name => {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
            return name !== 'constructor' && typeof descriptor?.value === 'function';
        });
        for (const methodName of methodNames) {
            methods[methodName] = this.scanMethod(target, methodName);
        }
        return methods;
    }
    /**
     * Scan property metadata for a specific property.
     */
    scanProperty(target, propertyKey) {
        const methodTarget = target.prototype;
        const inject = this.getMetadata(METADATA_KEYS.INJECT, methodTarget, propertyKey);
        const strategy = this.getMetadata(METADATA_KEYS.STRATEGY, methodTarget, propertyKey);
        return {
            ...(inject && { inject }),
            ...(strategy && { strategy }),
        };
    }
    /**
     * Scan all properties in a class for metadata.
     */
    scanClassProperties(_target) {
        // For now, we'll return empty - properties are typically scanned during injection
        // In a full implementation, we'd scan the prototype chain
        // The target parameter is reserved for future property scanning implementation
        return {};
    }
    /**
     * Generic metadata getter with type safety.
     */
    getMetadata(key, target, propertyKey) {
        try {
            return propertyKey !== undefined
                ? Reflect.getMetadata(key, target, propertyKey)
                : Reflect.getMetadata(key, target);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Generic metadata setter with type safety.
     */
    setMetadata(key, value, target, propertyKey) {
        if (propertyKey !== undefined) {
            Reflect.defineMetadata(key, value, target, propertyKey);
        }
        else {
            Reflect.defineMetadata(key, value, target);
        }
    }
    /**
     * Check if metadata exists.
     */
    hasMetadata(key, target, propertyKey) {
        return propertyKey !== undefined
            ? Reflect.hasMetadata(key, target, propertyKey)
            : Reflect.hasMetadata(key, target);
    }
    /**
     * Get all metadata keys for a target.
     */
    getMetadataKeys(target, propertyKey) {
        try {
            return propertyKey !== undefined
                ? Reflect.getMetadataKeys(target, propertyKey)
                : Reflect.getMetadataKeys(target);
        }
        catch {
            return [];
        }
    }
    /**
     * Clear metadata for a target.
     */
    clearMetadata(target, propertyKey) {
        const keys = this.getMetadataKeys(target, propertyKey);
        for (const key of keys) {
            if (propertyKey !== undefined) {
                Reflect.deleteMetadata(key, target, propertyKey);
            }
            else {
                Reflect.deleteMetadata(key, target);
            }
        }
    }
    /**
     * Scan for all entity classes decorated with @Entity
     */
    async scanForEntities() {
        return await scanForEntities();
    }
    /**
     * Scan for all schema classes decorated with @Schema
     */
    async scanForSchemas() {
        return await scanForSchemas();
    }
}
// ========================================
// METADATA RESULT TYPES
// ========================================
// ========================================
// UTILITY FUNCTIONS
// ========================================
/**
 * Create a metadata scanner instance.
 */
export function createMetadataScanner() {
    return new MetadataScanner();
}
/**
 * Check if a class is injectable.
 */
export function isInjectable(target) {
    const scanner = createMetadataScanner();
    return scanner.scanClass(target).injectable === true;
}
/**
 * Check if a class is a controller.
 */
export function isController(target) {
    const scanner = createMetadataScanner();
    return scanner.scanClass(target).controller !== undefined;
}
/**
 * Get controller prefix.
 */
export function getControllerPrefix(target) {
    const scanner = createMetadataScanner();
    return scanner.scanClass(target).controller?.prefix;
}
/**
 * Get injectable services from a module.
 */
export function getModuleProviders(target) {
    const scanner = createMetadataScanner();
    return scanner.scanClass(target).module?.providers ?? [];
}
/**
 * Get controllers from a module.
 */
export function getModuleControllers(target) {
    const scanner = createMetadataScanner();
    return scanner.scanClass(target).module?.controllers ?? [];
}
// ========================================
// AUTO-DISCOVERY METHODS
// ========================================
/**
 * Auto-discover all entity classes in the application
 * Scans for classes decorated with @Entity
 */
export async function scanForEntities() {
    const config = getScannerConfig();
    if (config.debug) {
        console.log('🔍 Scanning for @Entity decorated classes...');
        console.log('   Environment:', config.environment);
        console.log('   Strategy:', config.strategy);
    }
    // Check cache first
    const cacheKey = 'entities';
    const cached = getCachedScanResults('entities', cacheKey);
    if (cached) {
        if (config.debug) {
            console.log(`✅ Found ${cached.length} entity classes (from cache): ${cached.map(e => e.name).join(', ')}`);
        }
        return cached;
    }
    const entities = [];
    try {
        // Use configured directories
        for (const dir of config.directoryConfig.baseDirs) {
            const foundEntities = scanDirectoryForEntities(dir);
            entities.push(...foundEntities);
        }
        // Also check manually registered entities
        const manualEntities = getManuallyRegisteredEntities();
        entities.push(...manualEntities);
        // Remove duplicates
        const uniqueEntities = entities.filter((entity, index, arr) => arr.findIndex(e => e.name === entity.name) === index);
        if (config.debug) {
            console.log(`✅ Found ${uniqueEntities.length} entity classes: ${uniqueEntities.map(e => e.name).join(', ')}`);
        }
        // Cache results
        setCachedScanResults('entities', cacheKey, uniqueEntities);
        return uniqueEntities;
    }
    catch (error) {
        console.warn('⚠️  Auto-discovery failed, falling back to manual registration:', error);
        return getManuallyRegisteredEntities();
    }
}
/**
 * Auto-discover all service classes in the application
 * Scans for classes decorated with @Injectable
 */
export function scanForServices() {
    console.log('🔍 Scanning for @Injectable decorated classes...');
    const services = [];
    try {
        // Scan common directories for service files
        const scanDirs = [
            './src/services',
            './src/modules',
            './dist/services',
            './dist/modules',
            './packages/**/src/services',
            './packages/**/src/modules'
        ];
        for (const dir of scanDirs) {
            const foundServices = scanDirectoryForServices(dir);
            services.push(...foundServices);
        }
        console.log(`✅ Found ${services.length} service classes`);
        return services;
    }
    catch (error) {
        console.warn('⚠️  Service auto-discovery failed:', error);
        return [];
    }
}
/**
 * Auto-discover all controller classes in the application
 * Scans for classes decorated with @Controller
 */
export function scanForControllers() {
    console.log('🔍 Scanning for @Controller decorated classes...');
    const controllers = [];
    try {
        // Scan common directories for controller files
        const scanDirs = [
            './src/controllers',
            './src/modules',
            './dist/controllers',
            './dist/modules',
            './packages/**/src/controllers',
            './packages/**/src/modules'
        ];
        for (const dir of scanDirs) {
            const foundControllers = scanDirectoryForControllers(dir);
            controllers.push(...foundControllers);
        }
        console.log(`✅ Found ${controllers.length} controller classes`);
        return controllers;
    }
    catch (error) {
        console.warn('⚠️  Controller auto-discovery failed:', error);
        return [];
    }
}
// ========================================
// MONGOOSE SCHEMA DISCOVERY
// ========================================
/**
 * Auto-discover all Mongoose schema classes in the application
 * Scans for classes decorated with @Schema
 */
export async function scanForSchemas() {
    console.log('🔍 Scanning for @Schema decorated classes...');
    const schemas = [];
    try {
        // Scan common directories for schema files
        const scanDirs = [
            './src/schemas',
            './src/database/schemas',
            './src/models',
            './dist/schemas',
            './dist/database/schemas',
            './dist/models',
            './packages/**/src/schemas',
            './packages/**/src/database/schemas',
            './packages/**/src/models'
        ];
        for (const dir of scanDirs) {
            const foundSchemas = scanDirectoryForSchemas(dir);
            schemas.push(...foundSchemas);
        }
        // Also check manually registered schemas
        const manualSchemas = getManuallyRegisteredSchemas();
        schemas.push(...manualSchemas);
        // Remove duplicates
        const uniqueSchemas = schemas.filter((schema, index, arr) => arr.findIndex(s => s.name === schema.name) === index);
        console.log(`✅ Found ${uniqueSchemas.length} schema classes`);
        return uniqueSchemas;
    }
    catch (error) {
        console.warn('⚠️  Schema auto-discovery failed, falling back to manual registration:', error);
        return getManuallyRegisteredSchemas();
    }
}
// ========================================
// FILE SYSTEM SCANNING HELPERS
// ========================================
/**
 * Scan a directory for entity classes
 */
function scanDirectoryForEntities(dir) {
    const entities = [];
    const config = getScannerConfig();
    try {
        // Build file patterns based on configuration
        const patterns = [];
        if (shouldScanTypeScript() && config.fileOptions.includeTypeScript) {
            patterns.push(`${dir}/**/*.ts`);
            patterns.push(`${dir}/**/*.tsx`);
        }
        if (shouldScanJavaScript() && config.fileOptions.includeJavaScript) {
            patterns.push(`${dir}/**/*.js`);
        }
        if (config.fileOptions.includeDeclarations) {
            patterns.push(`${dir}/**/*.d.ts`);
        }
        const allFiles = [];
        for (const pattern of patterns) {
            try {
                const globOptions = {
                    ignore: config.directoryConfig.excludePatterns || ['**/node_modules/**'],
                    absolute: true
                };
                if (config.directoryConfig.maxDepth !== undefined) {
                    globOptions.maxDepth = config.directoryConfig.maxDepth;
                }
                const files = globSync(pattern, globOptions);
                allFiles.push(...files);
            }
            catch (error) {
                // Pattern failed, continue to next
                continue;
            }
        }
        // Remove duplicates and respect file limits
        const uniqueFiles = [...new Set(allFiles)];
        const maxFiles = config.fileOptions.maxFiles || 1000;
        const filesToScan = uniqueFiles.slice(0, maxFiles);
        if (config.debug && uniqueFiles.length > maxFiles) {
            console.log(`⚠️  Limited scanning to ${maxFiles} files (found ${uniqueFiles.length})`);
        }
        for (const file of filesToScan) {
            const foundEntities = scanFileForEntities(file);
            entities.push(...foundEntities);
        }
    }
    catch (error) {
        if (config.debug) {
            console.debug(`Directory ${dir} scanning failed:`, error);
        }
    }
    return entities;
}
/**
 * Scan a single file for entity classes
 */
function scanFileForEntities(filePath) {
    const entities = [];
    try {
        // Method 1: Try to require the compiled module (production)
        if (filePath.endsWith('.js')) {
            try {
                const module = require(filePath);
                for (const [key, value] of Object.entries(module)) {
                    if (isEntityClass(value)) {
                        entities.push(value);
                    }
                }
                return entities; // Success, return results
            }
            catch (error) {
                // Module loading failed, try other methods
            }
        }
        // Method 2: Parse TypeScript AST for decorators (development)
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            const astEntities = scanTypeScriptFileForEntities(filePath);
            entities.push(...astEntities);
        }
        // Method 3: Check for entity registration in the file
        // This handles manual registerEntity() calls
        const registeredEntities = scanFileForEntityRegistrations(filePath);
        entities.push(...registeredEntities);
    }
    catch (error) {
        console.debug(`File ${filePath} scanning failed:`, error);
    }
    return entities;
}
/**
 * Parse TypeScript file AST to find @Entity decorators
 */
function scanTypeScriptFileForEntities(filePath) {
    const entities = [];
    try {
        // Read the file content
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        // Simple regex-based decorator detection
        // This is a simplified approach - production would use TypeScript compiler API
        const entityRegex = /@Entity\([^)]*\)\s+(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = entityRegex.exec(content)) !== null) {
            const className = match[1];
            // Try to find the class in the module exports
            try {
                const modulePath = filePath.replace(/\.ts$/, '');
                const module = require(modulePath);
                if (module[className] && isEntityClass(module[className])) {
                    entities.push(module[className]);
                }
            }
            catch (error) {
                // Class not found in exports, skip
                continue;
            }
        }
    }
    catch (error) {
        console.debug(`AST parsing failed for ${filePath}:`, error);
    }
    return entities;
}
/**
 * Scan file for manual entity registrations
 */
function scanFileForEntityRegistrations(filePath) {
    const entities = [];
    try {
        // Look for registerEntity() calls in the file
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        // Find registerEntity calls
        const registerRegex = /registerEntity\(([^)]+)\)/g;
        let match;
        while ((match = registerRegex.exec(content)) !== null) {
            const entityRef = match[1].trim();
            // Try to resolve the entity reference
            try {
                const module = require(filePath.replace(/\.ts$/, '').replace(/\.js$/, ''));
                const entity = resolveEntityReference(entityRef, module);
                if (entity && isEntityClass(entity)) {
                    entities.push(entity);
                }
            }
            catch (error) {
                continue;
            }
        }
    }
    catch (error) {
        console.debug(`Entity registration scanning failed for ${filePath}:`, error);
    }
    return entities;
}
/**
 * Resolve entity reference from code
 */
function resolveEntityReference(ref, module) {
    // Handle simple cases like 'User', 'Post', etc.
    if (module[ref]) {
        return module[ref];
    }
    // Handle more complex references if needed
    return null;
}
/**
 * Scan a directory for service classes
 */
function scanDirectoryForServices(dir) {
    const services = [];
    try {
        const patterns = [
            `${dir}/**/*.ts`,
            `${dir}/**/*.js`,
            `${dir}/**/*.d.ts`
        ];
        const allFiles = [];
        for (const pattern of patterns) {
            try {
                const files = globSync(pattern, {
                    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
                    absolute: true
                });
                allFiles.push(...files);
            }
            catch (error) {
                continue;
            }
        }
        const uniqueFiles = [...new Set(allFiles)];
        for (const file of uniqueFiles) {
            const foundServices = scanFileForServices(file);
            services.push(...foundServices);
        }
    }
    catch (error) {
        console.debug(`Directory ${dir} service scanning failed:`, error);
    }
    return services;
}
/**
 * Scan a single file for service classes
 */
function scanFileForServices(filePath) {
    const services = [];
    try {
        // Method 1: Try to require the compiled module
        if (filePath.endsWith('.js')) {
            try {
                const module = require(filePath);
                for (const [key, value] of Object.entries(module)) {
                    if (isServiceClass(value)) {
                        services.push(value);
                    }
                }
                return services;
            }
            catch (error) {
                // Module loading failed, try other methods
            }
        }
        // Method 2: Parse TypeScript AST for @Injectable decorators
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            const astServices = scanTypeScriptFileForServices(filePath);
            services.push(...astServices);
        }
    }
    catch (error) {
        console.debug(`File ${filePath} service scanning failed:`, error);
    }
    return services;
}
/**
 * Parse TypeScript file for @Injectable decorators
 */
function scanTypeScriptFileForServices(filePath) {
    const services = [];
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        const injectableRegex = /@Injectable\([^)]*\)\s+(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = injectableRegex.exec(content)) !== null) {
            const className = match[1];
            try {
                const modulePath = filePath.replace(/\.ts$/, '');
                const module = require(modulePath);
                if (module[className] && isServiceClass(module[className])) {
                    services.push(module[className]);
                }
            }
            catch (error) {
                continue;
            }
        }
    }
    catch (error) {
        console.debug(`Service AST parsing failed for ${filePath}:`, error);
    }
    return services;
}
/**
 * Scan a directory for controller classes
 */
function scanDirectoryForControllers(dir) {
    const controllers = [];
    try {
        const patterns = [
            `${dir}/**/*.ts`,
            `${dir}/**/*.js`,
            `${dir}/**/*.d.ts`
        ];
        const allFiles = [];
        for (const pattern of patterns) {
            try {
                const files = globSync(pattern, {
                    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
                    absolute: true
                });
                allFiles.push(...files);
            }
            catch (error) {
                continue;
            }
        }
        const uniqueFiles = [...new Set(allFiles)];
        for (const file of uniqueFiles) {
            const foundControllers = scanFileForControllers(file);
            controllers.push(...foundControllers);
        }
    }
    catch (error) {
        console.debug(`Directory ${dir} controller scanning failed:`, error);
    }
    return controllers;
}
/**
 * Scan a single file for controller classes
 */
function scanFileForControllers(filePath) {
    const controllers = [];
    try {
        // Method 1: Try to require the compiled module
        if (filePath.endsWith('.js')) {
            try {
                const module = require(filePath);
                for (const [key, value] of Object.entries(module)) {
                    if (isControllerClass(value)) {
                        controllers.push(value);
                    }
                }
                return controllers;
            }
            catch (error) {
                // Module loading failed, try other methods
            }
        }
        // Method 2: Parse TypeScript AST for @Controller decorators
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            const astControllers = scanTypeScriptFileForControllers(filePath);
            controllers.push(...astControllers);
        }
    }
    catch (error) {
        console.debug(`File ${filePath} controller scanning failed:`, error);
    }
    return controllers;
}
/**
 * Parse TypeScript file for @Controller decorators
 */
function scanTypeScriptFileForControllers(filePath) {
    const controllers = [];
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        const controllerRegex = /@Controller\([^)]*\)\s+(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = controllerRegex.exec(content)) !== null) {
            const className = match[1];
            try {
                const modulePath = filePath.replace(/\.ts$/, '');
                const module = require(modulePath);
                if (module[className] && isControllerClass(module[className])) {
                    controllers.push(module[className]);
                }
            }
            catch (error) {
                continue;
            }
        }
    }
    catch (error) {
        console.debug(`Controller AST parsing failed for ${filePath}:`, error);
    }
    return controllers;
}
/**
 * Scan a directory for Mongoose schema classes
 */
function scanDirectoryForSchemas(dir) {
    const schemas = [];
    try {
        // Try multiple file patterns
        const patterns = [
            `${dir}/**/*.ts`,
            `${dir}/**/*.js`,
            `${dir}/**/*.d.ts`
        ];
        const allFiles = [];
        for (const pattern of patterns) {
            try {
                const files = globSync(pattern, {
                    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
                    absolute: true
                });
                allFiles.push(...files);
            }
            catch (error) {
                continue;
            }
        }
        const uniqueFiles = [...new Set(allFiles)];
        for (const file of uniqueFiles) {
            const foundSchemas = scanFileForSchemas(file);
            schemas.push(...foundSchemas);
        }
    }
    catch (error) {
        console.debug(`Directory ${dir} schema scanning failed:`, error);
    }
    return schemas;
}
/**
 * Scan a single file for Mongoose schema classes
 */
function scanFileForSchemas(filePath) {
    const schemas = [];
    try {
        // Method 1: Try to require the compiled module
        if (filePath.endsWith('.js')) {
            try {
                const module = require(filePath);
                for (const [key, value] of Object.entries(module)) {
                    if (typeof value === 'object' && value !== null && isSchemaClass(value)) {
                        const valueAsObject = value;
                        const definition = Reflect.getMetadata('mongoose:schema:definition', valueAsObject) || {};
                        if ('name' in valueAsObject) {
                            schemas.push({
                                name: valueAsObject.name,
                                definition: definition,
                                class: value
                            });
                        }
                    }
                }
                return schemas;
            }
            catch (error) {
                // Module loading failed, try other methods
            }
        }
        // Method 2: Parse TypeScript AST for @Schema decorators
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            const astSchemas = scanTypeScriptFileForSchemas(filePath);
            schemas.push(...astSchemas);
        }
        // Method 3: Check for schema registration in the file
        const registeredSchemas = scanFileForSchemaRegistrations(filePath);
        schemas.push(...registeredSchemas);
    }
    catch (error) {
        console.debug(`File ${filePath} schema scanning failed:`, error);
    }
    return schemas;
}
/**
 * Parse TypeScript file for @Schema decorators
 */
function scanTypeScriptFileForSchemas(filePath) {
    const schemas = [];
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        // Regex for @Schema decorator
        const schemaRegex = /@Schema\([^)]*\)\s+(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = schemaRegex.exec(content)) !== null) {
            const className = match[1];
            try {
                const modulePath = filePath.replace(/\.ts$/, '');
                const module = require(modulePath);
                if (module[className] && isSchemaClass(module[className])) {
                    const definition = Reflect.getMetadata('mongoose:schema:definition', module[className]) || {};
                    schemas.push({
                        name: className,
                        definition: definition,
                        class: module[className]
                    });
                }
            }
            catch (error) {
                continue;
            }
        }
    }
    catch (error) {
        console.debug(`Schema AST parsing failed for ${filePath}:`, error);
    }
    return schemas;
}
/**
 * Scan file for manual schema registrations
 */
function scanFileForSchemaRegistrations(filePath) {
    const schemas = [];
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        // Find registerSchema calls
        const registerRegex = /registerSchema\(([^)]+)\)/g;
        let match;
        while ((match = registerRegex.exec(content)) !== null) {
            const schemaRef = match[1].trim();
            try {
                const module = require(filePath.replace(/\.ts$/, '').replace(/\.js$/, ''));
                const schema = resolveSchemaReference(schemaRef, module);
                if (schema && isSchemaClass(schema)) {
                    const definition = Reflect.getMetadata('mongoose:schema:definition', schema) || {};
                    schemas.push({
                        name: schema.name,
                        definition: definition,
                        class: schema
                    });
                }
            }
            catch (error) {
                continue;
            }
        }
    }
    catch (error) {
        console.debug(`Schema registration scanning failed for ${filePath}:`, error);
    }
    return schemas;
}
/**
 * Resolve schema reference from code
 */
function resolveSchemaReference(ref, module) {
    if (module[ref]) {
        return module[ref];
    }
    return null;
}
/**
 * Check if a class is decorated with @Entity
 */
function isEntityClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for entity metadata
        const entityMetadata = Reflect.getMetadata('entity', obj);
        return entityMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a class is decorated with @Injectable
 */
function isServiceClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for injectable metadata
        const injectableMetadata = Reflect.getMetadata('injectable', obj);
        return injectableMetadata === true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a class is decorated with @Controller
 */
function isControllerClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for controller metadata
        const controllerMetadata = Reflect.getMetadata('controller', obj);
        return controllerMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a class is decorated with @Schema (Mongoose)
 */
function isSchemaClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for schema metadata
        const schemaMetadata = Reflect.getMetadata('mongoose:schema', obj);
        return schemaMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
/**
 * Get manually registered entities (fallback)
 */
function getManuallyRegisteredEntities() {
    // Import the entity registry from the ORM module
    try {
        const { entityRegistry } = require('../database/modules/neat-typeorm.module.js');
        return Array.from(entityRegistry || []);
    }
    catch (error) {
        // If module not available, return empty array
        return [];
    }
}
/**
 * Get manually registered schemas (fallback)
 */
function getManuallyRegisteredSchemas() {
    // Import the schema registry from the Mongoose module
    try {
        const { schemaRegistry } = require('../database/modules/neat-mongoose.module.js');
        return Array.from(schemaRegistry || []);
    }
    catch (error) {
        // If module not available, return empty array
        return [];
    }
}
// ========================================
// MIDDLEWARE COMPONENT SCANNING
// ========================================
/**
 * Scan for guard classes
 */
export function scanForGuards() {
    const config = getScannerConfig();
    const cacheKey = 'guards';
    // Check cache first
    const cached = getCachedScanResults('guards', cacheKey);
    if (cached) {
        return cached;
    }
    const results = [];
    // Scan all configured directories
    for (const dir of config.directoryConfig.baseDirs) {
        const entities = scanDirectoryForEntities(dir);
        for (const entity of entities) {
            if (isGuardClass(entity)) {
                results.push([entity.name, entity]);
            }
        }
    }
    // Cache results
    setCachedScanResults('guards', cacheKey, results);
    return results;
}
/**
 * Scan for pipe classes
 */
export function scanForPipes() {
    const config = getScannerConfig();
    const cacheKey = 'pipes';
    // Check cache first
    const cached = getCachedScanResults('pipes', cacheKey);
    if (cached) {
        return cached;
    }
    const results = [];
    // Scan all configured directories
    for (const dir of config.directoryConfig.baseDirs) {
        const entities = scanDirectoryForEntities(dir);
        for (const entity of entities) {
            if (isPipeClass(entity)) {
                results.push([entity.name, entity]);
            }
        }
    }
    // Cache results
    setCachedScanResults('pipes', cacheKey, results);
    return results;
}
/**
 * Scan for interceptor classes
 */
export function scanForInterceptors() {
    const config = getScannerConfig();
    const cacheKey = 'interceptors';
    // Check cache first
    const cached = getCachedScanResults('interceptors', cacheKey);
    if (cached) {
        return cached;
    }
    const results = [];
    // Scan all configured directories
    for (const dir of config.directoryConfig.baseDirs) {
        const entities = scanDirectoryForEntities(dir);
        for (const entity of entities) {
            if (isInterceptorClass(entity)) {
                results.push([entity.name, entity]);
            }
        }
    }
    // Cache results
    setCachedScanResults('interceptors', cacheKey, results);
    return results;
}
/**
 * Scan for exception filter classes
 */
export function scanForExceptionFilters() {
    const config = getScannerConfig();
    const cacheKey = 'exceptionFilters';
    // Check cache first
    const cached = getCachedScanResults('exceptionFilters', cacheKey);
    if (cached) {
        return cached;
    }
    const results = [];
    // Scan all configured directories
    for (const dir of config.directoryConfig.baseDirs) {
        const entities = scanDirectoryForEntities(dir);
        for (const entity of entities) {
            if (isExceptionFilterClass(entity)) {
                results.push([entity.name, entity]);
            }
        }
    }
    // Cache results
    setCachedScanResults('exceptionFilters', cacheKey, results);
    return results;
}
/**
 * Check if a class is decorated with @Guard
 */
function isGuardClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for guard metadata
        const guardMetadata = Reflect.getMetadata(Symbol('NEAT:GUARD'), obj);
        return guardMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a class is decorated with @Pipe
 */
function isPipeClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for pipe metadata
        const pipeMetadata = Reflect.getMetadata(Symbol('NEAT:PIPE'), obj);
        return pipeMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a class is decorated with @Interceptor
 */
function isInterceptorClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for interceptor metadata
        const interceptorMetadata = Reflect.getMetadata(Symbol('NEAT:INTERCEPTOR'), obj);
        return interceptorMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a class is decorated with @ExceptionFilter
 */
function isExceptionFilterClass(obj) {
    if (typeof obj !== 'function' || !obj.prototype) {
        return false;
    }
    try {
        // Check for exception filter metadata
        const filterMetadata = Reflect.getMetadata(Symbol('NEAT:EXCEPTION_FILTER'), obj);
        return filterMetadata !== undefined;
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=scanner.js.map