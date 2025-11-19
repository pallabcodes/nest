/**
 * Plugin Marketplace and Registry System
 *
 * Provides enterprise-grade plugin management including:
 * - Plugin discovery and search
 * - Installation and updates
 * - Enterprise governance and approval
 * - Plugin compatibility validation
 * - Audit trails and compliance
 *
 * @module plugins/marketplace
 */

import type {
  Plugin,
  PluginMetadata,
  PluginInstance,
} from './plugin-interface.js';

/**
 * Plugin information for marketplace display.
 */
export interface PluginInfo {
  /**
   * Plugin metadata.
   */
  metadata: PluginMetadata;

  /**
   * Download statistics.
   */
  downloads: number;

  /**
   * User rating (1-5).
   */
  rating: number;

  /**
   * Number of ratings.
   */
  ratingCount: number;

  /**
   * Last updated timestamp.
   */
  updatedAt: Date;

  /**
   * Plugin size in bytes.
   */
  size?: number;

  /**
   * Supported NeatORM versions.
   */
  compatibleVersions: string[];

  /**
   * Publisher information.
   */
  publisher: {
    name: string;
    email?: string;
    website?: string;
    verified: boolean;
  };

  /**
   * Security scan results.
   */
  security: {
    scannedAt: Date;
    vulnerabilities: number;
    risk: 'low' | 'medium' | 'high' | 'critical';
  };

  /**
   * License information.
   */
  license: string;

  /**
   * Plugin tags for categorization.
   */
  tags: string[];
}

/**
 * Plugin installation options.
 */
export interface PluginInstallOptions {
  /**
   * Version to install (defaults to latest).
   */
  version?: string;

  /**
   * Whether to install dependencies automatically.
   */
  installDependencies?: boolean;

  /**
   * Whether to run post-install hooks.
   */
  runPostInstall?: boolean;

  /**
   * Custom configuration for the plugin.
   */
  config?: Record<string, unknown>;

  /**
   * Whether to activate the plugin immediately.
   */
  activateImmediately?: boolean;
}

/**
 * Plugin marketplace interface.
 */
export interface PluginMarketplace {
  /**
   * Search for plugins by query.
   */
  search(query: string, options?: {
    category?: string;
    sortBy?: 'downloads' | 'rating' | 'updated' | 'relevance';
    limit?: number;
    offset?: number;
  }): Promise<PluginInfo[]>;

  /**
   * Get detailed information about a plugin.
   */
  getInfo(pluginId: string): Promise<PluginInfo>;

  /**
   * Get plugins by category.
   */
  getByCategory(category: string): Promise<PluginInfo[]>;

  /**
   * Get trending/popular plugins.
   */
  getTrending(limit?: number): Promise<PluginInfo[]>;

  /**
   * Get featured plugins.
   */
  getFeatured(): Promise<PluginInfo[]>;

  /**
   * Download and install a plugin.
   */
  install(pluginId: string, options?: PluginInstallOptions): Promise<PluginInstance>;

  /**
   * Check for plugin updates.
   */
  checkUpdates(): Promise<Array<{
    pluginId: string;
    currentVersion: string;
    latestVersion: string;
    changelog?: string;
  }>>;

  /**
   * Update a plugin to the latest version.
   */
  update(pluginId: string): Promise<void>;

  /**
   * Update all plugins.
   */
  updateAll(): Promise<void>;

  /**
   * Uninstall a plugin.
   */
  uninstall(pluginId: string): Promise<void>;

  /**
   * Get installation statistics.
   */
  getStats(): Promise<{
    totalPlugins: number;
    totalDownloads: number;
    categories: Record<string, number>;
    publishers: Array<{
      name: string;
      pluginCount: number;
      totalDownloads: number;
    }>;
  }>;
}

/**
 * Enterprise plugin registry for governance and compliance.
 */
export interface EnterprisePluginRegistry extends PluginMarketplace {
  /**
   * Register a plugin for enterprise approval.
   */
  registerForApproval(plugin: Plugin, submitter: string): Promise<string>;

  /**
   * Approve a plugin for enterprise use.
   */
  approvePlugin(pluginId: string, approver: string, approvalNotes?: string): Promise<void>;

  /**
   * Reject a plugin submission.
   */
  rejectPlugin(pluginId: string, approver: string, reason: string): Promise<void>;

  /**
   * Get pending plugin approvals.
   */
  getPendingApprovals(): Promise<Array<{
    pluginId: string;
    submittedBy: string;
    submittedAt: Date;
    metadata: PluginMetadata;
  }>>;

  /**
   * Validate plugin compatibility with enterprise standards.
   */
  validateCompatibility(plugin: Plugin): Promise<CompatibilityResult>;

  /**
   * Get audit trail for plugin management.
   */
  getAuditLog(options?: {
    pluginId?: string;
    action?: 'install' | 'update' | 'uninstall' | 'approve' | 'reject';
    user?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditEntry[]>;

  /**
   * Set enterprise policies for plugin management.
   */
  setPolicies(policies: EnterprisePolicies): Promise<void>;

  /**
   * Get current enterprise policies.
   */
  getPolicies(): Promise<EnterprisePolicies>;
}

/**
 * Plugin compatibility validation result.
 */
export interface CompatibilityResult {
  /**
   * Whether the plugin is compatible.
   */
  compatible: boolean;

  /**
   * Compatibility score (0-100).
   */
  score: number;

  /**
   * Issues found during validation.
   */
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    code: string;
  }>;

  /**
   * Recommendations for compatibility improvement.
   */
  recommendations: string[];

  /**
   * Tested NeatORM versions.
   */
  testedVersions: string[];
}

/**
 * Audit entry for plugin management actions.
 */
export interface AuditEntry {
  /**
   * Unique audit entry ID.
   */
  id: string;

  /**
   * Timestamp of the action.
   */
  timestamp: Date;

  /**
   * User who performed the action.
   */
  user: string;

  /**
   * Action performed.
   */
  action: 'install' | 'update' | 'uninstall' | 'approve' | 'reject' | 'register';

  /**
   * Plugin ID affected.
   */
  pluginId: string;

  /**
   * Plugin version (if applicable).
   */
  version?: string;

  /**
   * Additional details about the action.
   */
  details?: Record<string, unknown>;

  /**
   * IP address of the user.
   */
  ipAddress?: string;

  /**
   * User agent string.
   */
  userAgent?: string;
}

/**
 * Enterprise policies for plugin management.
 */
export interface EnterprisePolicies {
  /**
   * Require approval for all plugin installations.
   */
  requireApproval: boolean;

  /**
   * Allowed plugin publishers.
   */
  allowedPublishers: string[];

  /**
   * Blocked plugin categories.
   */
  blockedCategories: string[];

  /**
   * Maximum security risk level allowed.
   */
  maxSecurityRisk: 'low' | 'medium' | 'high';

  /**
   * Require security scan before installation.
   */
  requireSecurityScan: boolean;

  /**
   * Minimum rating required for auto-approval.
   */
  minRatingForAutoApproval?: number;

  /**
   * Automatic updates policy.
   */
  autoUpdates: {
    enabled: boolean;
    schedule: 'daily' | 'weekly' | 'monthly';
    requireApproval: boolean;
  };

  /**
   * Plugin size limits.
   */
  sizeLimits: {
    maxSize: number; // in bytes
    warnSize: number; // in bytes
  };

  /**
   * Dependency approval requirements.
   */
  dependencyApproval: {
    requireApproval: boolean;
    allowedLicenses: string[];
  };
}

/**
 * Plugin categories for organization.
 */
export enum PluginCategory {
  LOGGING = 'logging',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  INTEGRATION = 'integration',
  ANALYTICS = 'analytics',
  TESTING = 'testing',
  DEVELOPMENT = 'development',
  ENTERPRISE = 'enterprise',
  UTILITIES = 'utilities',
}

/**
 * Plugin marketplace implementation.
 */
export class MarketplaceImpl implements PluginMarketplace {
  private plugins: Map<string, PluginInfo> = new Map();

  constructor(private registryUrl?: string) {}

  async search(query: string, options: {
    category?: string;
    sortBy?: 'downloads' | 'rating' | 'updated' | 'relevance';
    limit?: number;
    offset?: number;
  } = {}): Promise<PluginInfo[]> {
    // Implementation would query the marketplace API
    const allPlugins = Array.from(this.plugins.values());

    let filtered = allPlugins.filter(plugin => {
      const matchesQuery = query.toLowerCase().split(' ').every(term =>
        plugin.metadata.name.toLowerCase().includes(term) ||
        plugin.metadata.description?.toLowerCase().includes(term) ||
        plugin.metadata.keywords?.some(keyword => keyword.toLowerCase().includes(term))
      );

      const matchesCategory = !options.category ||
        plugin.tags.includes(options.category);

      return matchesQuery && matchesCategory;
    });

    // Sort results
    switch (options.sortBy) {
      case 'downloads':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'updated':
        filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      default:
        // relevance - keep current order
        break;
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    return filtered.slice(offset, offset + limit);
  }

  async getInfo(pluginId: string): Promise<PluginInfo> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    return plugin;
  }

  async getByCategory(category: string): Promise<PluginInfo[]> {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.tags.includes(category));
  }

  async getTrending(limit: number = 10): Promise<PluginInfo[]> {
    return Array.from(this.plugins.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  async getFeatured(): Promise<PluginInfo[]> {
    // Return plugins marked as featured (implementation specific)
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.rating >= 4.5 && plugin.downloads > 1000)
      .slice(0, 5);
  }

  async install(pluginId: string, options?: PluginInstallOptions): Promise<PluginInstance> {
    // Implementation would download and install the plugin
    throw new Error('Plugin installation not implemented in this demo');
  }

  async checkUpdates(): Promise<Array<{
    pluginId: string;
    currentVersion: string;
    latestVersion: string;
    changelog?: string;
  }>> {
    // Implementation would check for updates
    return [];
  }

  async update(pluginId: string): Promise<void> {
    // Implementation would update the plugin
    throw new Error('Plugin update not implemented in this demo');
  }

  async updateAll(): Promise<void> {
    const updates = await this.checkUpdates();
    for (const update of updates) {
      await this.update(update.pluginId);
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    // Implementation would uninstall the plugin
    throw new Error('Plugin uninstallation not implemented in this demo');
  }

  async getStats(): Promise<{
    totalPlugins: number;
    totalDownloads: number;
    categories: Record<string, number>;
    publishers: Array<{
      name: string;
      pluginCount: number;
      totalDownloads: number;
    }>;
  }> {
    const plugins = Array.from(this.plugins.values());

    const categories: Record<string, number> = {};
    const publishers: Map<string, { pluginCount: number; totalDownloads: number }> = new Map();

    let totalDownloads = 0;

    for (const plugin of plugins) {
      totalDownloads += plugin.downloads;

      // Count categories
      for (const tag of plugin.tags) {
        categories[tag] = (categories[tag] || 0) + 1;
      }

      // Aggregate publisher stats
      const pubName = plugin.publisher.name;
      const pubStats = publishers.get(pubName) || { pluginCount: 0, totalDownloads: 0 };
      pubStats.pluginCount++;
      pubStats.totalDownloads += plugin.downloads;
      publishers.set(pubName, pubStats);
    }

    return {
      totalPlugins: plugins.length,
      totalDownloads,
      categories,
      publishers: Array.from(publishers.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      })),
    };
  }

  /**
   * Register a plugin in the marketplace (for publishers).
   */
  registerPlugin(plugin: Plugin, additionalInfo: Partial<PluginInfo>): void {
    const info: PluginInfo = {
      metadata: plugin.metadata,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      updatedAt: new Date(),
      compatibleVersions: ['*'],
      publisher: {
        name: 'Unknown',
        verified: false,
        ...additionalInfo.publisher,
      },
      security: {
        scannedAt: new Date(),
        vulnerabilities: 0,
        risk: 'low',
        ...additionalInfo.security,
      },
      license: 'MIT',
      tags: [],
      ...additionalInfo,
    };

    this.plugins.set(plugin.metadata.id, info);
  }
}

/**
 * Enterprise plugin registry implementation.
 */
export class EnterpriseRegistryImpl extends MarketplaceImpl implements EnterprisePluginRegistry {
  private pendingApprovals: Map<string, {
    plugin: Plugin;
    submittedBy: string;
    submittedAt: Date;
  }> = new Map();

  private policies: EnterprisePolicies = {
    requireApproval: true,
    allowedPublishers: [],
    blockedCategories: [],
    maxSecurityRisk: 'high',
    requireSecurityScan: true,
    autoUpdates: {
      enabled: false,
      schedule: 'weekly',
      requireApproval: true,
    },
    sizeLimits: {
      maxSize: 10 * 1024 * 1024, // 10MB
      warnSize: 5 * 1024 * 1024,  // 5MB
    },
    dependencyApproval: {
      requireApproval: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
    },
  };

  private auditLog: AuditEntry[] = [];

  async registerForApproval(plugin: Plugin, submitter: string): Promise<string> {
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.pendingApprovals.set(approvalId, {
      plugin,
      submittedBy: submitter,
      submittedAt: new Date(),
    });

    this.addAuditEntry({
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      user: submitter,
      action: 'register',
      pluginId: plugin.metadata.id,
      details: { approvalId },
    });

    return approvalId;
  }

  async approvePlugin(pluginId: string, approver: string, approvalNotes?: string): Promise<void> {
    // Find the plugin in pending approvals
    const approvalEntry = Array.from(this.pendingApprovals.entries())
      .find(([, entry]) => entry.plugin.metadata.id === pluginId);

    if (!approvalEntry) {
      throw new Error(`Plugin ${pluginId} not found in pending approvals`);
    }

    const [approvalId, entry] = approvalEntry;

    // Register the plugin in the marketplace
    this.registerPlugin(entry.plugin, {
      publisher: {
        name: approver,
        verified: true,
      },
      tags: ['enterprise-approved'],
    });

    // Remove from pending approvals
    this.pendingApprovals.delete(approvalId);

    this.addAuditEntry({
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      user: approver,
      action: 'approve',
      pluginId,
      details: { approvalNotes, approvalId },
    });
  }

  async rejectPlugin(pluginId: string, approver: string, reason: string): Promise<void> {
    // Find and remove from pending approvals
    const approvalEntry = Array.from(this.pendingApprovals.entries())
      .find(([, entry]) => entry.plugin.metadata.id === pluginId);

    if (approvalEntry) {
      const [approvalId] = approvalEntry;
      this.pendingApprovals.delete(approvalId);
    }

    this.addAuditEntry({
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      user: approver,
      action: 'reject',
      pluginId,
      details: { reason },
    });
  }

  async getPendingApprovals(): Promise<Array<{
    pluginId: string;
    submittedBy: string;
    submittedAt: Date;
    metadata: PluginMetadata;
  }>> {
    return Array.from(this.pendingApprovals.entries()).map(([approvalId, entry]) => ({
      pluginId: entry.plugin.metadata.id,
      submittedBy: entry.submittedBy,
      submittedAt: entry.submittedAt,
      metadata: entry.plugin.metadata,
    }));
  }

  async validateCompatibility(plugin: Plugin): Promise<CompatibilityResult> {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      code: string;
    }> = [];

    let score = 100;

    // Check if publisher is allowed
    if (this.policies.allowedPublishers.length > 0) {
      const publisher = plugin.metadata.author;
      if (publisher && !this.policies.allowedPublishers.includes(publisher)) {
        issues.push({
          severity: 'error',
          message: `Publisher ${publisher} is not in the allowed publishers list`,
          code: 'PUBLISHER_NOT_ALLOWED',
        });
        score -= 50;
      }
    }

    // Check dependencies
    if (plugin.metadata.dependencies) {
      for (const [dep, version] of Object.entries(plugin.metadata.dependencies)) {
        // Check if dependency license is allowed
        // This would require looking up dependency information
        // For demo purposes, we'll just check the name
        if (this.policies.dependencyApproval.requireApproval) {
          issues.push({
            severity: 'warning',
            message: `Dependency ${dep}@${version} requires approval`,
            code: 'DEPENDENCY_APPROVAL_REQUIRED',
          });
          score -= 10;
        }
      }
    }

    // Check supported dialects
    if (!plugin.metadata.supportedDialects?.includes('*')) {
      issues.push({
        severity: 'info',
        message: 'Plugin has limited database dialect support',
        code: 'LIMITED_DIALECT_SUPPORT',
      });
      score -= 5;
    }

    return {
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      recommendations: [
        'Ensure all dependencies have approved licenses',
        'Test plugin with your specific NeatORM version',
        'Review plugin security scan results',
      ],
      testedVersions: ['1.0.0', '1.1.0', '2.0.0'],
    };
  }

  async getAuditLog(options: {
    pluginId?: string;
    action?: 'install' | 'update' | 'uninstall' | 'approve' | 'reject';
    user?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditEntry[]> {
    let filtered = [...this.auditLog];

    if (options.pluginId) {
      filtered = filtered.filter(entry => entry.pluginId === options.pluginId);
    }

    if (options.action) {
      filtered = filtered.filter(entry => entry.action === options.action);
    }

    if (options.user) {
      filtered = filtered.filter(entry => entry.user === options.user);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return filtered.slice(offset, offset + limit);
  }

  async setPolicies(policies: EnterprisePolicies): Promise<void> {
    this.policies = { ...this.policies, ...policies };
  }

  async getPolicies(): Promise<EnterprisePolicies> {
    return { ...this.policies };
  }

  private addAuditEntry(entry: AuditEntry): void {
    this.auditLog.push(entry);

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }
}

/**
 * Global marketplace instances.
 */
let globalMarketplace: MarketplaceImpl | null = null;
let globalEnterpriseRegistry: EnterpriseRegistryImpl | null = null;

/**
 * Get the global marketplace instance.
 */
export function getMarketplace(): MarketplaceImpl {
  if (!globalMarketplace) {
    globalMarketplace = new MarketplaceImpl();
  }
  return globalMarketplace;
}

/**
 * Get the global enterprise registry instance.
 */
export function getEnterpriseRegistry(): EnterpriseRegistryImpl {
  if (!globalEnterpriseRegistry) {
    globalEnterpriseRegistry = new EnterpriseRegistryImpl();
  }
  return globalEnterpriseRegistry;
}
