import { isValidObjectId } from 'mongoose';
import {Like} from '../models/like.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';


const toggleLikeOnVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.body;
    const userId = req.user?._id;
    
    if (!videoId ) {
        throw new ApiError(400, 'Video ID is required');
    }
    
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid Video ID');
    }

    const likeDoc = await Like.findOne({ video: videoId });

    if (!likeDoc) {
        // No like document, create new
        const newLike = await Like.create({
            video: videoId,
            likedBy: [userId]
        });
        return res.status(201).json(
            new ApiResponse(201, newLike, { message: 'Like added to video' })
        );
    }

    // Like document exists
    if (likeDoc.likedBy.includes(userId)) {
        // User has liked, remove like
        await Like.updateOne({ video: videoId }, { $pull: { likedBy: userId } });
        return res.status(200).json(
            new ApiResponse(200, null, { message: 'Like removed from video' })
        );
    } else {
        // User hasn't liked, add like
        await Like.updateOne({ video: videoId }, { $addToSet: { likedBy: userId } });
        return res.status(201).json(
            new ApiResponse(201, null, { message: 'Like added to video' })
        );
    }
})

const toggleLikeOnComment = asyncHandler(async (req, res) => {
    const {commentId} = req.body;
    const userId = req.user?._id;

    if (!commentId ) {
        throw new ApiError(400, 'Comment ID is required');
    }
    //console.log(commentId);

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid Comment ID');
    }
    
    const likeDoc = await Like.findOne({ comment: commentId });

    if (!likeDoc) {
        // No like document, create new
        const newLike = await Like.create({
            comment: commentId,
            likedBy: [userId]
        });
        return res.status(201).json(
            new ApiResponse(201, newLike, { message: 'Like added to comment' })
        );
    }

    // Like document exists
    if (likeDoc.likedBy.includes(userId)) {
        // User has liked, remove like
        await Like.updateOne({ comment: commentId }, { $pull: { likedBy: userId } });
        return res.status(200).json(
            new ApiResponse(200, null, { message: 'Like removed from comment' })
        );
    } else {
        // User hasn't liked, add like
        await Like.updateOne({ comment: commentId }, { $addToSet: { likedBy: userId } });
        return res.status(201).json(
            new ApiResponse(201, null, { message: 'Like added to comment' })
        );
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const likedDocs = await Like.find({
        likedBy: userId,
        video: { $ne: null }
    }).populate({
        path: "video",
        populate: {
            path: "owner",
            select: "fullName username avatar"
        }
    });

    const videos = likedDocs
        .map(doc => doc.video)
        .filter(video => video !== null && video !== undefined);

    return res.status(200).json(
        new ApiResponse(200, videos, "Liked videos fetched successfully")
    );
})

export { toggleLikeOnVideo, toggleLikeOnComment, getLikedVideos }