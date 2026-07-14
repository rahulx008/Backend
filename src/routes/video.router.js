import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { publishVideo, getVideoById, updateVideo, deleteVideo, getAllVideos, getRelatedVideos } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

const uploadMiddleware = upload.fields([
    {
        name: "video",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1
    }
])

router.route("/getvideo/:videoId").get(
    verifyJWT, 
    getVideoById);

router.route("/publish").post(
    verifyJWT,
    uploadMiddleware,
    publishVideo
);

router.route("/update/:videoId").patch(
    verifyJWT,
    upload.single("thumbnail"), 
    updateVideo
);

router.route("/delete/:videoId").delete(
    verifyJWT, 
    deleteVideo
);

router.route("/getAllVideos").get(
    verifyJWT, 
    getAllVideos
);

router.route("/relatedVideos").get(
    verifyJWT, 
    getRelatedVideos
);
export default router;