import {Router} from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleLikeOnComment, toggleLikeOnVideo } from "../controllers/like.controller.js";

const router = Router();

router.route("/toggleLikeOnComment").patch(
    verifyJWT, 
    toggleLikeOnComment
);

router.route("/toggleLikeOnVideo").patch(
    verifyJWT, 
    toggleLikeOnVideo
);

export default router;