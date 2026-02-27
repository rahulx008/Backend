import { isValidObjectId } from 'mongoose';
import Like from '../models/like.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';


const toggleLikeOnVideo = asyncHandler(async (req, res) => {
    const videoId = req.body;
    const userId = req.user?._id;

    if (!videoId ) {
        throw new ApiError(400, 'Video ID is required');
    }
    
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid Video ID');
    }

    const existingLike = await Like.findOneAndDelete({
        likedBy: userId,
        video: videoId
    })

    if (existingLike) {
        return res.status(200).json(
            new ApiResponse(
                200,
                existingLike,
                { message: 'Like removed from video' }
            )
        );
    }

    const newLike = await Like.create({
        likedBy: userId,
        video: videoId
    });

    if(!newLike) {
        throw new ApiError(500, 'Failed to add like to video');
    }

    if(newLike) {
        return res.status(201).json(
            new ApiResponse(201, newLike, { message: 'Like added to video' })
        );
    }
})

const toggleLikeOnComment = asyncHandler(async (req, res) => {
    const commentId = req.body;
    const userId = req.user?._id;

    if (!commentId ) {
        throw new ApiError(400, 'Comment ID is required');
    }
    
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid Comment ID');
    }
    
    const existingLike = await Like.findOneAndDelete({
        likedBy: userId,
        comment: commentId
    })
    
    if (existingLike) {
        return res.status(200).json(
            new ApiResponse(200, existingLike, { message: 'Like removed from comment' })
        );
    }

    const newLike = await Like.create({
        likedBy: userId,
        comment: commentId
    });
    if(!newLike) {
        throw new ApiError(500, 'Failed to add like to comment');
    }
    
    return res.status(201).json(
        new ApiResponse(201, newLike, { message: 'Like added to comment' })
    );
})

export { toggleLikeOnVideo, toggleLikeOnComment }