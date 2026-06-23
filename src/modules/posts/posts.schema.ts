import { z } from "zod"

const postCategorySchema = z.enum(["OFFER", "REQUEST"]);
const serviceModeSchema = z.enum(["ONLINE", "OFFLINE"]);
const postStatusSchema = z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]);

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

export const listPostsQuerySchema = z.object({
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const searchPostsSchema = z.object({
    query: z.string().trim().min(1).max(500),
    topK: z.number().int().min(1).max(50).optional().default(20),
    threshold: z.number().min(0).max(1).optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>
export type SearchPostsInput = z.infer<typeof searchPostsSchema>
