import {Router} from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleLikeOnComment, toggleLikeOnVideo, getLikedVideos } from "../controllers/like.controller.js";

const router = Router();

router.route("/toggleLikeOnComment").patch(
    verifyJWT, 
    toggleLikeOnComment
);

router.route("/toggleLikeOnVideo").patch(
    verifyJWT, 
    toggleLikeOnVideo
);

router.route("/get-liked-videos").get(
    verifyJWT,
    getLikedVideos
);

export default router;