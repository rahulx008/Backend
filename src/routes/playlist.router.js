import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, createPlaylist);
router.route("/user/:userId").get(verifyJWT, getUserPlaylists);
router.route("/:playlistId").get(verifyJWT, getPlaylistById);
router.route("/add-video").patch(verifyJWT, addVideoToPlaylist);
router.route("/remove-video").patch(verifyJWT, removeVideoFromPlaylist);
router.route("/delete/:playlistId").delete(verifyJWT, deletePlaylist);
router.route("/update/:playlistId").patch(verifyJWT, updatePlaylist);

export default router;
