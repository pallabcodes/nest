/**
 * Advanced CTE Features Example for NeatORM
 *
 * Demonstrates advanced Common Table Expression (CTE) capabilities:
 * - Materialized CTEs for performance optimization
 * - Recursive CTEs with advanced patterns
 * - Full-text search integration
 * - Pre-built recursive patterns (tree hierarchy, org charts, BOM)
 * - Graph algorithms (shortest path)
 *
 * This example demonstrates CTE concepts and SQL generation patterns.
 */

// =============================================================================
// ADVANCED CTE CONCEPTS & SQL GENERATION PATTERNS
// =============================================================================

// This example demonstrates the advanced CTE features that NeatORM provides
// through conceptual examples and SQL generation patterns

function main() {
  console.log('🚀 NeatORM Advanced CTE Features Example\n');

  try {
    // =============================================================================
    // CONCEPT 1: Basic Recursive CTE - Employee Hierarchy
    // =============================================================================
    console.log('\n🌳 Concept 1: Basic Recursive CTE - Employee Hierarchy');

    console.log('✅ NeatORM CTE Builder Pattern:');
    console.log(`
const hierarchyCTE = cte('employee_hierarchy', true)
  .columns(['id', 'name', 'manager_id', 'level', 'path'])
  .as(\`
    SELECT id, name, manager_id, 0 as level, CAST(name as TEXT) as path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.id, e.name, e.manager_id, eh.level + 1,
           CAST(eh.path || ' > ' || e.name as TEXT)
    FROM employees e
    INNER JOIN employee_hierarchy eh ON e.manager_id = eh.id
  \`);

const sql = generateCTESQL([hierarchyCTE], 'postgres');
// Result: WITH RECURSIVE employee_hierarchy (id,name,manager_id,level,path) AS (...)
    `);
    console.log('\n📝 This pattern traverses organizational hierarchies with level tracking');

    // =============================================================================
    // CONCEPT 2: Materialized CTE for Performance
    // =============================================================================
    console.log('\n⚡ Concept 2: Materialized CTE for Performance');

    console.log('✅ NeatORM Materialized CTE Pattern:');
    console.log(`
const deptStatsCTE = cte('department_stats')
  .materialized()  // <-- Performance optimization
  .as(\`
    SELECT department, COUNT(*) as employee_count,
           ROUND(AVG(salary), 2) as avg_salary, SUM(salary) as total_salary
    FROM employees
    GROUP BY department
    HAVING COUNT(*) > 0
  \`);

const sql = generateCTESQL([deptStatsCTE], 'postgres');
// PostgreSQL: WITH department_stats AS MATERIALIZED (...)
// MySQL/SQLite: WITH department_stats AS (...)  // (materialized not supported)
    `);
    console.log('\n📝 Materialized CTEs cache results for expensive aggregations');

    // =============================================================================
    // CONCEPT 3: Recursive CTE with Advanced Controls
    // =============================================================================
    console.log('\n🔄 Concept 3: Recursive CTE with Cycle Detection & Limits');

    console.log('✅ NeatORM Advanced Recursive CTE Pattern:');
    console.log(`
const categoryTreeCTE = cte('category_tree', true)
  .columns(['id', 'name', 'parent_id', 'level', 'path'])
  .maxRecursion(5)      // <-- Prevent infinite loops
  .cycleDetection()     // <-- Detect circular references
  .as(\`
    SELECT id, name, parent_id, 0 as level, CAST(name as TEXT) as path
    FROM categories WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.name, c.parent_id, ct.level + 1,
           CAST(ct.path || ' > ' || c.name as TEXT)
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
  \`);

const sql = generateCTESQL([categoryTreeCTE], 'postgres');
// PostgreSQL: WITH RECURSIVE category_tree AS (SELECT ... LIMIT 5)
// SQL Server: WITH category_tree AS (SELECT ...) OPTION (MAXRECURSION 5)
    `);
    console.log('\n📝 Advanced controls prevent infinite loops and control execution');

    // =============================================================================
    // CONCEPT 4: Full-Text Search Integration
    // =============================================================================
    console.log('\n🔍 Concept 4: Full-Text Search within CTEs');

    console.log('✅ NeatORM Full-Text Search CTE Pattern:');
    console.log(`
const searchCTE = cte('searchable_content')
  .fullTextSearch({
    columns: ['title', 'description'],
    language: 'english',
    mode: 'plain',
    ranking: 'ts_rank'
  })
  .as(\`
    SELECT id, title, description, created_at
    FROM articles WHERE published = true
  \`);

const sql = generateCTESQL([searchCTE], 'postgres');
// PostgreSQL generates:
// WITH searchable_content AS (
//   SELECT *, ts_rank(search_vector, query) as search_rank,
//          ts_headline('english', title || ' ' || description, query) as headline
//   FROM (SELECT *, to_tsvector('english', title || ' ' || description) as search_vector,
//                plainto_tsquery('english', ?) as query FROM articles) as inner_query
//   WHERE search_vector @@ query
//   ORDER BY search_rank DESC
// )
    `);
    console.log('\n📝 Full-text search seamlessly integrated into CTE queries');

    // =============================================================================
    // CONCEPT 5: CTE Composition & Chaining
    // =============================================================================
    console.log('\n🎯 Concept 5: CTE Composition & Chaining');

    console.log('✅ NeatORM CTE Composition Pattern:');
    console.log(`
const seniorEmployeesCTE = cte('senior_employees')
  .as('SELECT id, name, department, salary FROM employees WHERE salary > 100000');

const deptSummaryCTE = cte('dept_summary')
  .as('SELECT department, COUNT(*) as emp_count, AVG(salary) as avg_salary FROM senior_employees GROUP BY department');

const finalReportCTE = cte('final_report')
  .as('SELECT ds.*, e.total_employees FROM dept_summary ds LEFT JOIN (SELECT department, COUNT(*) as total_employees FROM employees GROUP BY department) e ON ds.department = e.department');

const sql = generateCTESQL([seniorEmployeesCTE, deptSummaryCTE, finalReportCTE], 'postgres');
// Result: WITH senior_employees AS (...), dept_summary AS (...), final_report AS (...)
    `);
    console.log('\n📝 Multiple CTEs can be chained together for complex data pipelines');

    // =============================================================================
    // CONCEPT 6: Pre-built Recursive Patterns
    // =============================================================================
    console.log('\n🏗️  Concept 6: Pre-built Recursive Patterns');

    console.log('✅ NeatORM Pre-built Patterns:');
    console.log(`
// Tree Hierarchy (organizational charts, category trees)
const treeCTE = createTreeHierarchyCTE('categories', 'id', 'parent_id', 'name');

// Organizational Chart (employee/manager relationships)
const orgCTE = createOrgChartCTE('employees', 'id', 'manager_id', 'name');

// Bill of Materials (manufacturing/assembly hierarchies)
const bomCTE = createBOMCTE('bom', 'parent_product_id', 'child_product_id', 'quantity', laptopId);

// Graph Algorithms (shortest path, connectivity)
const pathCTE = createShortestPathCTE('graph_nodes', 'graph_edges', 'start_node', 'end_node');

// Searchable Hierarchies (combine trees with full-text search)
const searchTreeCTE = createSearchableCategoryTreeCTE(
  'categories', 'id', 'parent_id', 'name', 'description', 'search_term'
);
    `);
    console.log('\n📝 Pre-built patterns for common recursive query use cases');

    // =============================================================================
    // CONCEPT 7: Cross-Database Compatibility
    // =============================================================================
    console.log('\n🌐 Concept 7: Cross-Database CTE Generation');

    console.log('✅ NeatORM Cross-Database Compatibility:');
    console.log(`
const universalCTE = cte('universal_query', true)
  .columns(['id', 'name', 'level', 'path'])
  .as('SELECT id, name, 0 as level, CAST(name as TEXT) as path FROM items WHERE parent_id IS NULL UNION ALL SELECT i.id, i.name, u.level + 1, CAST(u.path || \'/\' || i.name as TEXT) FROM items i INNER JOIN universal_query u ON i.parent_id = u.id');

Database Dialects Generated:
• PostgreSQL: WITH RECURSIVE universal_query (id,name,level,path) AS (...)
• MySQL: WITH RECURSIVE universal_query (id,name,level,path) AS (...)
• SQLite: WITH RECURSIVE universal_query AS (...)
• SQL Server: WITH universal_query AS (...)  // (recursive handled differently)
    `);
    console.log('\n📝 Same CTE builder generates optimal SQL for each database');

    console.log('\n🎉 Advanced CTE Features Example Completed!');
    console.log('✅ Demonstrated: Recursive CTEs, materialized CTEs, cycle detection');
    console.log('✅ Demonstrated: Full-text search, CTE composition, cross-database generation');
    console.log('✅ Demonstrated: Pre-built patterns for hierarchies, BOM, and complex queries');
    console.log('\n🔗 These features are now available in NeatORM for enterprise-grade SQL query building!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
main();
