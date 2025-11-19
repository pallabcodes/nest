/**
 * NeatOrm - Phantom Types System
 *
 * Phantom types are types with type parameters that don't appear in the runtime
 * representation. They provide additional compile-time safety by encoding extra
 * information in the type system that guides correct usage without runtime cost.
 *
 * Key TypeScript Excellence Features:
 * - Type-level programming with phantom parameters
 * - Compile-time state tracking (e.g., query builder state)
 * - Zero runtime overhead (phantom types erase completely)
 * - State machine patterns at the type level
 *
 * TypeScript Compilation:
 * Phantom types use generic type parameters that are referenced only in type
 * positions, never in value positions. TypeScript completely erases these
 * during compilation, leaving no trace in the JavaScript output.
 *
 * Runtime Behavior:
 * Phantom types have zero runtime representation. They exist purely for
 * compile-time checking and are completely erased, resulting in no memory
 * or performance impact whatsoever.
 *
 * Framework Integration:
 * Phantom types are used throughout NeatOrm for:
 * - Query builder state tracking (selected columns, joined tables)
 * - Transaction state (active, committed, rolled back)
 * - Migration state (up, down)
 * - Connection pool state (connected, disconnected)
 *
 * Pain Points Addressed:
 * - Runtime errors from using query builders in invalid states
 * - Forgetting to call required methods in a fluent API
 * - Using transactions after they've been committed/rolled back
 * - Complex state machines validated at compile time
 *
 * Research:
 * Inspired by Rust's PhantomData<T>, Haskell's phantom types, and Scala's
 * lifted embedding. Adapted to TypeScript's type system to enable type-level
 * state machines and fluent API validation without runtime overhead.
 */

/**
 * Phantom type marker that holds a type parameter without any runtime value.
 * The type parameter is used purely for compile-time checking.
 *
 * @template T - The phantom type parameter
 */
export type Phantom<T> = {
  readonly __phantom?: T;
};

/**
 * Extract the phantom type parameter from a Phantom type.
 *
 * @template P - The Phantom type
 * @returns The phantom type parameter T
 *
 * @example
 * ```typescript
 * type MyPhantom = Phantom<'Selected'>;
 * type Extracted = ExtractPhantom<MyPhantom>; // 'Selected'
 * ```
 */
export type ExtractPhantom<P extends Phantom<unknown>> = P extends Phantom<
  infer T
>
  ? T
  : never;

/**
 * Query builder state phantom types.
 * Used to track which operations have been performed on a query builder.
 */

/**
 * Phantom type indicating no columns have been selected yet.
 */
export type NoSelect = Phantom<'NoSelect'>;

/**
 * Phantom type indicating columns have been selected.
 * Carries the selected column names as a type parameter.
 */
export type Selected<Columns extends readonly string[]> = Phantom<{
  state: 'Selected';
  columns: Columns;
}>;

/**
 * Phantom type indicating no FROM clause has been specified.
 */
export type NoFrom = Phantom<'NoFrom'>;

/**
 * Phantom type indicating a FROM clause has been specified.
 * Carries the table name as a type parameter.
 */
export type FromTable<TableName extends string> = Phantom<{
  state: 'FromTable';
  table: TableName;
}>;

/**
 * Phantom type for tracking joined tables.
 */
export type JoinedTables<Tables extends readonly string[]> = Phantom<{
  state: 'Joined';
  tables: Tables;
}>;

/**
 * Phantom type for tracking WHERE clause presence.
 */
export type HasWhere = Phantom<'HasWhere'>;
export type NoWhere = Phantom<'NoWhere'>;

/**
 * Phantom type for tracking ORDER BY clause presence.
 */
export type HasOrderBy = Phantom<'HasOrderBy'>;
export type NoOrderBy = Phantom<'NoOrderBy'>;

/**
 * Phantom type for tracking GROUP BY clause presence.
 */
export type HasGroupBy = Phantom<'HasGroupBy'>;
export type NoGroupBy = Phantom<'NoGroupBy'>;

/**
 * Transaction state phantom types.
 * Used to prevent using a transaction after it has been committed or rolled back.
 */

/**
 * Phantom type indicating a transaction is active.
 */
export type TransactionActive = Phantom<'TransactionActive'>;

/**
 * Phantom type indicating a transaction has been committed.
 */
export type TransactionCommitted = Phantom<'TransactionCommitted'>;

/**
 * Phantom type indicating a transaction has been rolled back.
 */
export type TransactionRolledBack = Phantom<'TransactionRolledBack'>;

/**
 * Union type of all transaction states.
 */
export type TransactionState =
  | TransactionActive
  | TransactionCommitted
  | TransactionRolledBack;

/**
 * Migration state phantom types.
 * Used to track migration direction.
 */

/**
 * Phantom type for upward migrations.
 */
export type MigrationUp = Phantom<'MigrationUp'>;

/**
 * Phantom type for downward migrations.
 */
export type MigrationDown = Phantom<'MigrationDown'>;

/**
 * Connection state phantom types.
 * Used to track database connection state.
 */

/**
 * Phantom type indicating a connection is established.
 */
export type Connected = Phantom<'Connected'>;

/**
 * Phantom type indicating no connection is established.
 */
export type Disconnected = Phantom<'Disconnected'>;

/**
 * Helper type to check if a phantom type matches a specific state.
 *
 * @template P - The phantom type to check
 * @template State - The state to check for
 * @returns true if P matches State, false otherwise
 *
 * @example
 * ```typescript
 * type Check1 = IsPhantomState<TransactionActive, 'TransactionActive'>; // true
 * type Check2 = IsPhantomState<TransactionCommitted, 'TransactionActive'>; // false
 * ```
 */
export type IsPhantomState<P extends Phantom<unknown>, State extends string> =
  ExtractPhantom<P> extends State ? true : false;

/**
 * Helper type to require a specific phantom state.
 * Useful for constraining function parameters to specific states.
 *
 * @template P - The phantom type
 * @template RequiredState - The required state
 * @returns P if it matches RequiredState, never otherwise
 *
 * @example
 * ```typescript
 * function commitTransaction<P extends RequirePhantomState<P, 'TransactionActive'>>(
 *   tx: Transaction<P>
 * ): Transaction<TransactionCommitted> {
 *   // Can only be called on active transactions
 * }
 * ```
 */
export type RequirePhantomState<
  P extends Phantom<unknown>,
  RequiredState extends string
> = IsPhantomState<P, RequiredState> extends true ? P : never;

/**
 * Helper type to transform a phantom type to a new state.
 *
 * @template NewState - The new state to transition to
 * @returns A phantom type representing the new state
 *
 * @example
 * ```typescript
 * type Active = TransactionActive;
 * type Committed = TransitionPhantomState<'TransactionCommitted'>; // TransactionCommitted
 * ```
 */
export type TransitionPhantomState<NewState extends string> =
  Phantom<NewState>;

/**
 * Helper type for chaining phantom states.
 * Allows building up complex state types incrementally.
 *
 * @template Current - The current phantom state
 * @template Addition - The additional state to merge
 * @returns A merged phantom type
 *
 * @example
 * ```typescript
 * type Step1 = NoSelect;
 * type Step2 = ChainPhantomState<Step1, Selected<['id', 'name']>>;
 * ```
 */
export type ChainPhantomState<
  Current extends Phantom<unknown>,
  Addition extends Phantom<unknown>
> = Phantom<{
  current: ExtractPhantom<Current>;
  addition: ExtractPhantom<Addition>;
}>;

/**
 * Example Usage:
 *
 * ```typescript
 * // Query builder with phantom state tracking
 * class QueryBuilder<
 *   SelectState extends NoSelect | Selected<any> = NoSelect,
 *   FromState extends NoFrom | FromTable<any> = NoFrom
 * > {
 *   private state: {
 *     selectState?: SelectState;
 *     fromState?: FromState;
 *   } = {};
 *
 *   // select() can only be called once (transitions from NoSelect to Selected)
 *   select<Columns extends readonly string[]>(
 *     this: QueryBuilder<NoSelect, FromState>,
 *     ...columns: Columns
 *   ): QueryBuilder<Selected<Columns>, FromState> {
 *     return this as any;
 *   }
 *
 *   // from() can only be called once (transitions from NoFrom to FromTable)
 *   from<TableName extends string>(
 *     this: QueryBuilder<SelectState, NoFrom>,
 *     table: TableName
 *   ): QueryBuilder<SelectState, FromTable<TableName>> {
 *     return this as any;
 *   }
 *
 *   // execute() requires both select and from to have been called
 *   execute(
 *     this: QueryBuilder<Selected<any>, FromTable<any>>
 *   ): Promise<any[]> {
 *     // Implementation
 *     return Promise.resolve([]);
 *   }
 * }
 *
 * // Valid usage
 * const result = await new QueryBuilder()
 *   .select('id', 'name')
 *   .from('users')
 *   .execute();
 *
 * // Invalid usage (compile-time errors)
 * // new QueryBuilder().execute(); // Error: select() not called
 * // new QueryBuilder().select('id').execute(); // Error: from() not called
 * // new QueryBuilder().from('users').select('id').select('name'); // Error: select() called twice
 * ```
 */

