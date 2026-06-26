import { z } from "zod"

const postCategorySchema = z.enum(["OFFER", "REQUEST"]);
const serviceModeSchema = z.enum(["ONLINE", "OFFLINE"]);
const postStatusSchema = z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]);

const baseCreatePostSchema = z.object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title must be at most 200 characters'),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be at most 5000 characters'),
    category: postCategorySchema,
    serviceMode: serviceModeSchema,
    assignedTimeCredits: z.number().int().positive().max(100000),
    status: postStatusSchema.optional(),
    city: z.string().trim().min(2, 'City must be at least 2 characters').optional(),
    area: z.string().trim().min(2, 'Area must be at least 2 characters').optional(),
});

export const createPostSchema = baseCreatePostSchema.refine(
    (data) => {
        if (data.serviceMode === "OFFLINE") {
            return !!data.city && !!data.area;
        }
        return true;
    },
    {
        message: "City and Area are required for offline services",
        path: ["city"], // Assign error to city (or area)
    }
);

export const updatePostSchema = baseCreatePostSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    })

export const listPostsQuerySchema = z.object({
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const searchPostsFiltersSchema = z.object({
    category: postCategorySchema.optional(),
    serviceMode: serviceModeSchema.optional(),
    minCredits: z.number().int().nonnegative().optional(),
    maxCredits: z.number().int().nonnegative().optional(),
    location: z.string().trim().min(1).optional(),
})

export const searchPostsSchema = z.object({
    query: z.string().trim().min(1).max(500),
    topK: z.number().int().min(1).optional(),
    threshold: z.number().min(0).max(1).optional(),
    filters: searchPostsFiltersSchema.optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>
export type SearchPostsInput = z.infer<typeof searchPostsSchema>

export const postIdParamSchema = z.object({
    postId: z.coerce.number().int().positive(),
});

