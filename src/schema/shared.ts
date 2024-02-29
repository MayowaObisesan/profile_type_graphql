import { builder } from '../builder'

export const SortOrder = builder.enumType('SortOrder', {
    values: ['asc', 'desc'] as const,
})