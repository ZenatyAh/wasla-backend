import { Router } from "express"
import { authMiddleware } from "../../common/middleware/auth.middleware.js"
import validate from "../../common/middleware/validateResource.js"
import {
    createPostController,
    deletePostController,
    getPostByIdController,
    listMyPostsController,
    listPublishedPostsController,
    listSavedPostsController,
    savePostController,
    searchPostsController,
    unsavePostController,
    updatePostController} from "./posts.controller.js"
import { createPostSchema, searchPostsSchema, updatePostSchema } from "./posts.schema.js"

const router = Router()

router.get("/", listPublishedPostsController)

router.use(authMiddleware)

router.post("/", validate(createPostSchema), createPostController)
router.get("/me", listMyPostsController);
router.get("/saved", listSavedPostsController)
router.post("/search", validate(searchPostsSchema), searchPostsController)
router.get("/:postId", getPostByIdController)
router.patch("/:postId", validate(updatePostSchema), updatePostController)
router.delete("/:postId", deletePostController)
router.post("/:postId/save", savePostController)
router.delete("/:postId/save", unsavePostController)

export default router;
