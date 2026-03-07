import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createComment, deleteComment, updateComment, togglePinComment, getComments, getReplies } from "../controllers/comment.controller.js";

const router = Router();

router.route("/create").post(
    verifyJWT, 
    createComment
);
router.route("/update/:commentId").patch(
    verifyJWT, 
    updateComment
);

router.route("/delete/:commentId").delete(
    verifyJWT, 
    deleteComment
);

router.route("/togglePin/:commentId").patch(
    verifyJWT, 
    togglePinComment
);

router.route("/getComments").get(
    verifyJWT, 
    getComments
);

router.route("/getReplies/:commentId").get(
    verifyJWT, 
    getReplies
);

export default router;