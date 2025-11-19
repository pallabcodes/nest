/**
 * NeatORM Telescope Web Dashboard
 *
 * Provides a web-based interface for monitoring and debugging NeatORM operations.
 * Features real-time updates, charts, and detailed insights.
 *
 * @module telescope/web-dashboard
 */

import type { Telescope, TelescopeEntry, TelescopeStats } from './telescope-interface.js';

/**
 * Web dashboard configuration.
 */
export interface WebDashboardConfig {
  /**
   * Port to run the dashboard on.
   */
  port: number;

  /**
   * Host to bind to.
   */
  host: string;

  /**
   * Authentication configuration.
   */
  auth?: {
    enabled: boolean;
    username?: string;
    password?: string;
  };

  /**
   * Auto-refresh interval in milliseconds.
   */
  refreshInterval: number;

  /**
   * Maximum entries to display in lists.
   */
  maxEntries: number;
}

/**
 * Web dashboard implementation.
 */
export class WebDashboard {
  private telescope: Telescope;
  private config: WebDashboardConfig;
  private server?: any;
  private clients: Set<any> = new Set();

  constructor(telescope: Telescope, config: Partial<WebDashboardConfig> = {}) {
    this.telescope = telescope;
    this.config = {
      port: 8888,
      host: 'localhost',
      refreshInterval: 5000,
      maxEntries: 100,
      ...config,
    };
  }

  /**
   * Start the web dashboard server.
   */
  async start(): Promise<void> {
    // In a real implementation, this would start an Express.js server
    // For this demo, we'll create a simple HTTP server using Node.js built-ins

    const http = await import('http');

    this.server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (error) {
        console.error('Dashboard request error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`🔭 NeatORM Telescope Dashboard running at http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the web dashboard server.
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('🔭 NeatORM Telescope Dashboard stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Handle HTTP requests.
   */
  private async handleRequest(req: any, res: any): Promise<void> {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Basic auth check
    if (this.config.auth?.enabled && !this.checkAuth(req)) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="NeatORM Telescope"',
        'Content-Type': 'text/plain',
      });
      res.end('Authentication required');
      return;
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handling
    if (url.pathname === '/' && req.method === 'GET') {
      await this.serveDashboard(res);
    } else if (url.pathname === '/api/stats' && req.method === 'GET') {
      await this.serveStats(res, url);
    } else if (url.pathname === '/api/entries' && req.method === 'GET') {
      await this.serveEntries(res, url);
    } else if (url.pathname === '/api/search' && req.method === 'GET') {
      await this.serveSearch(res, url);
    } else if (url.pathname === '/ws' && req.method === 'GET') {
      // WebSocket upgrade would be handled here in a real implementation
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('WebSocket not implemented in demo');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  /**
   * Serve the main dashboard HTML page.
   */
  private async serveDashboard(res: any): Promise<void> {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve statistics API endpoint.
   */
  private async serveStats(res: any, url: URL): Promise<void> {
    const timeRange = this.parseTimeRange(url);
    const stats = await this.telescope.getStats(timeRange);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
  }

  /**
   * Serve entries API endpoint.
   */
  private async serveEntries(res: any, url: URL): Promise<void> {
    const params = url.searchParams;
    const options: any = {
      limit: parseInt(params.get('limit') || '50'),
      offset: parseInt(params.get('offset') || '0'),
    };

    if (params.get('type')) {
      options.type = params.get('type');
    }

    if (params.get('tags')) {
      options.tags = params.get('tags').split(',');
    }

    const timeRange = this.parseTimeRange(url);
    if (timeRange) {
      options.startDate = timeRange.start;
      options.endDate = timeRange.end;
    }

    const entries = await this.telescope.getStorage().retrieve(options);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entries, null, 2));
  }

  /**
   * Serve search API endpoint.
   */
  private async serveSearch(res: any, url: URL): Promise<void> {
    const query = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type') as any;
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const results = await this.telescope.getDashboard().search(query, { type, limit });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results, null, 2));
  }

  /**
   * Check basic authentication.
   */
  private checkAuth(req: any): boolean {
    if (!this.config.auth?.enabled) return true;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    return username === this.config.auth.username && password === this.config.auth.password;
  }

  /**
   * Parse time range from URL parameters.
   */
  private parseTimeRange(url: URL): { start: Date; end: Date } | undefined {
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    if (start && end) {
      return {
        start: new Date(start),
        end: new Date(end),
      };
    }

    // Default to last hour
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

    return { start: startDate, end: endDate };
  }

  /**
   * Generate the main dashboard HTML.
   */
  private generateDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeatORM Telescope</title>
    <style>
        ${this.getDashboardCSS()}
    </style>
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>🔭 NeatORM Telescope</h1>
            <div class="dashboard-controls">
                <button onclick="refresh()">Refresh</button>
                <button onclick="clearEntries()">Clear</button>
            </div>
        </header>

        <div class="dashboard-grid">
            <div class="stats-panel">
                <h2>📊 Statistics</h2>
                <div id="stats-content">Loading...</div>
            </div>

            <div class="queries-panel">
                <h2>🔍 Recent Queries</h2>
                <div id="queries-content">Loading...</div>
            </div>

            <div class="transactions-panel">
                <h2>🔄 Transactions</h2>
                <div id="transactions-content">Loading...</div>
            </div>

            <div class="performance-panel">
                <h2>⚡ Performance</h2>
                <div id="performance-content">Loading...</div>
            </div>
        </div>

        <div class="search-panel">
            <h2>🔎 Search Entries</h2>
            <input type="text" id="search-input" placeholder="Search queries, transactions, etc..." onkeyup="search()">
            <div id="search-results"></div>
        </div>
    </div>

    <script>
        ${this.getDashboardJS()}
    </script>
</body>
</html>`;
  }

  /**
   * Get dashboard CSS styles.
   */
  private getDashboardCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }

        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .dashboard-header h1 {
            color: #2563eb;
        }

        .dashboard-controls button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
        }

        .dashboard-controls button:hover {
            background: #1d4ed8;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stats-panel, .queries-panel, .transactions-panel, .performance-panel, .search-panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stats-panel h2, .queries-panel h2, .transactions-panel h2, .performance-panel h2, .search-panel h2 {
            margin-bottom: 15px;
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }

        .stat-item:last-child {
            border-bottom: none;
        }

        .stat-value {
            font-weight: bold;
            color: #2563eb;
        }

        .entry-item {
            padding: 10px;
            margin: 5px 0;
            background: #f9fafb;
            border-radius: 4px;
            border-left: 4px solid #2563eb;
        }

        .entry-item.error {
            border-left-color: #dc2626;
            background: #fef2f2;
        }

        .entry-item.slow {
            border-left-color: #f59e0b;
            background: #fffbeb;
        }

        .entry-sql {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            color: #374151;
            margin: 5px 0;
        }

        .entry-meta {
            font-size: 11px;
            color: #6b7280;
        }

        #search-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            margin-bottom: 15px;
        }

        .loading {
            color: #6b7280;
            font-style: italic;
        }

        .error {
            color: #dc2626;
        }

        .success {
            color: #059669;
        }
    `;
  }

  /**
   * Get dashboard JavaScript.
   */
  private getDashboardJS(): string {
    return `
        let refreshInterval;

        async function loadData() {
            try {
                const [stats, queries, transactions] = await Promise.all([
                    fetch('/api/stats').then(r => r.json()),
                    fetch('/api/entries?type=query&limit=10').then(r => r.json()),
                    fetch('/api/entries?type=transaction&limit=10').then(r => r.json())
                ]);

                updateStats(stats);
                updateQueries(queries);
                updateTransactions(transactions);
                updatePerformance(stats);
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        }

        function updateStats(stats) {
            const content = document.getElementById('stats-content');
            content.innerHTML = \`
                <div class="stat-item">
                    <span>Total Queries:</span>
                    <span class="stat-value">\${stats.performance.totalQueries}</span>
                </div>
                <div class="stat-item">
                    <span>Avg Query Time:</span>
                    <span class="stat-value">\${stats.performance.avgQueryTime.toFixed(2)}ms</span>
                </div>
                <div class="stat-item">
                    <span>Slow Queries:</span>
                    <span class="stat-value">\${stats.performance.slowQueries}</span>
                </div>
                <div class="stat-item">
                    <span>Cache Hit Rate:</span>
                    <span class="stat-value">\${stats.performance.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                    <span>Total Exceptions:</span>
                    <span class="stat-value">\${stats.errors.totalExceptions}</span>
                </div>
            \`;
        }

        function updateQueries(queries) {
            const content = document.getElementById('queries-content');
            content.innerHTML = queries.map(query => \`
                <div class="entry-item \${query.metrics?.duration > 1000 ? 'slow' : ''}">
                    <div class="entry-sql">\${query.content.sql.substring(0, 100)}\${query.content.sql.length > 100 ? '...' : ''}</div>
                    <div class="entry-meta">
                        \${query.metrics?.duration}ms • \${query.content.dialect} • \${query.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            \`).join('') || '<div class="loading">No queries yet</div>';
        }

        function updateTransactions(transactions) {
            const content = document.getElementById('transactions-content');
            content.innerHTML = transactions.map(tx => \`
                <div class="entry-item \${tx.content.error ? 'error' : ''}">
                    <div>Transaction \${tx.content.transactionId}</div>
                    <div class="entry-meta">
                        \${tx.content.queries?.length || 0} queries • \${tx.metrics?.duration}ms • \${tx.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            \`).join('') || '<div class="loading">No transactions yet</div>';
        }

        function updatePerformance(stats) {
            const content = document.getElementById('performance-content');
            content.innerHTML = \`
                <div class="stat-item">
                    <span>Memory Usage:</span>
                    <span class="stat-value">\${(stats.health.memoryUsage / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="stat-item">
                    <span>Active Connections:</span>
                    <span class="stat-value">\${stats.health.activeConnections}</span>
                </div>
                <div class="stat-item">
                    <span>Pool Utilization:</span>
                    <span class="stat-value">\${stats.health.connectionPoolUtilization.toFixed(1)}%</span>
                </div>
            \`;
        }

        async function search() {
            const query = document.getElementById('search-input').value;
            if (query.length < 3) {
                document.getElementById('search-results').innerHTML = '';
                return;
            }

            try {
                const results = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`).then(r => r.json());
                const content = document.getElementById('search-results');
                content.innerHTML = results.map(result => \`
                    <div class="entry-item">
                        <div>\${result.type.toUpperCase()}: \${JSON.stringify(result.content).substring(0, 200)}...</div>
                        <div class="entry-meta">\${result.timestamp}</div>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Search failed:', error);
            }
        }

        async function refresh() {
            await loadData();
        }

        async function clearEntries() {
            if (confirm('Are you sure you want to clear all entries?')) {
                try {
                    await fetch('/api/clear', { method: 'POST' });
                    await loadData();
                } catch (error) {
                    console.error('Failed to clear entries:', error);
                }
            }
        }

        // Initial load
        loadData();

        // Auto-refresh
        refreshInterval = setInterval(loadData, ${this.config.refreshInterval});
    `;
  }
}

/**
 * Create and start a web dashboard.
 */
export async function createWebDashboard(
  telescope: Telescope,
  config: Partial<WebDashboardConfig> = {}
): Promise<WebDashboard> {
  const dashboard = new WebDashboard(telescope, config);
  await dashboard.start();
  return dashboard;
}
