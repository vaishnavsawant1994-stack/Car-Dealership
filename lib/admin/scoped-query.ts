/** Keep independent authorization and user-search OR clauses conjunctive. */
export function andFilters<T extends object>(...filters: Array<T | undefined>): { AND: T[] } {
  return { AND: filters.filter((filter): filter is T => filter !== undefined && Object.keys(filter).length > 0) }
}
