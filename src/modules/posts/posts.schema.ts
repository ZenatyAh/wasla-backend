import { z } from "zod"

const postCategorySchema = z.enum(["OFFER", "REQUEST"]);
const serviceModeSchema = z.enum(["ONLINE", "OFFLINE"]);
const postStatusSchema = z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]);
const postSortSchema = z.enum(["relevance", "newest", "nearest"]);

export const createPostSchema = z.object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title must be at most 200 characters'),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be at most 5000 characters'),
    category: postCategorySchema,
    serviceMode: serviceModeSchema,
    assignedTimeCredits: z.number().int().positive().max(100000),
    status: postStatusSchema.optional(),
})

export const updatePostSchema = createPostSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    })

export const searchPostsQuerySchema = z
    .object({
        q: z.string().trim().min(1).optional(),
        category: postCategorySchema.optional(),
        serviceMode: serviceModeSchema.optional(),
        minCredits: z.coerce.number().int().positive().optional(),
        maxCredits: z.coerce.number().int().positive().optional(),
        minTrustRating: z.coerce.number().min(0).max(5).optional(),
        sort: postSortSchema.optional(),
    })
    .refine((data) => {
        if (data.minCredits !== undefined && data.maxCredits !== undefined) {
            return data.minCredits <= data.maxCredits
        }
        return true
    }, { message: "minCredits must be <= maxCredits" })

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type SearchPostsQuery = z.infer<typeof searchPostsQuerySchema>
