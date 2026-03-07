import {Comment} from '../models/comment.model.js';
import {Video} from '../models/video.model.js';
import {Like} from '../models/like.model.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import { isValidObjectId } from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import mongoose from 'mongoose';

const createComment = asyncHandler(async (req, res) => {
    const {videoId, commentId, content} = req.body;
    const userId = req.user?._id;

    if(!videoId || !content || content.trim() === '') {
        throw new ApiError(400, 'Video ID and content are required');
    }

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID');
    }
    if(commentId && !isValidObjectId(commentId)){
        throw new ApiError(400, 'Invalid comment ID');
    }
    if(!content || content.trim() === '') {
        throw new ApiError(400, 'Content is required');
    }

    const comment = await Comment.create({
        content: req.body.content,
        video: videoId || null,
        owner: userId,
        parentId: commentId || null
    });

    if(!comment) {
        throw new ApiError(500, 'Server Error: Failed to create comment/Reply');
    }

    return res.status(201).json(new ApiResponse(201, comment, "Comment/Reply created successfully"));
})

// session example for delete comment and its replies and likes in a transaction to maintain data integrity
const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const userId = req.user?._id;
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid comment ID');
    }
    
    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(404, 'Comment not found');
    }
    if(!comment.owner._id.equals(userId) && !comment.video.owner._id.equals(userId)) {
        throw new ApiError(403, 'You are not authorized to delete this comment');
    }

    //check if the comment has replies
    const hasReplies = await Comment.exists({ parentId: commentId });
    const hasLikes = await Like.exists({ comment: commentId });

    if(!hasReplies && !hasLikes) {
        await Comment.findByIdAndDelete(commentId);

        return res.status(200).json(
            new ApiResponse(200, null, "Comment deleted successfully")
        );
    }
    

    // If there are replies or likes, we need to delete them as well in a transaction
    /*  We have to ensure that if any part of the deletion process fails (e.g., deleting likes or replies), 
        we can roll back the entire operation to maintain data integrity.
        steps:
            1. Start a transaction
            2. Delete likes associated with the comment
            3. Find all replies to the comment and delete their likes and the replies themselves
            4. Finally, delete the main comment
            5. Commit the transaction if everything is successful, or abort if any step fails
     */


    // Start a session for transaction
    const session = await mongoose.startSession();

    try{
        session.startTransaction()
        
        // Delete likes on the comment
        await Like.deleteMany( { comment: commentId },
            { session }
        )

        // Find all replies to this comment
        const replies = await Comment.find(
            { parentId: commentId },
            { _id: 1 },
            { session }
        )

        const replyIds = replies.map(r => r._id)

        // Delete likes on replies and the replies themselves
        if (replyIds.length > 0) {
            await Like.deleteMany({ comment: { $in: replyIds } }, { session });
            await Comment.deleteMany({ _id: { $in: replyIds } }, { session });
        }

        // Finally, delete the main comment
        await Comment.findByIdAndDelete(commentId, { session });

        // Commit the transaction
        await session.commitTransaction();
        return res.status(200).json(
            new ApiResponse(200, null, "Comment and its replies deleted successfully")
        );

    } catch (err) {
        await session.abortTransaction()
        console.error(err);
        throw new ApiError(500, 'Server Error: Failed to delete comment');

    } finally {
        session.endSession();
    }
    
    
    
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;
    const userId = req.user?._id;

    if(!content || content.trim() === '') {
        throw new ApiError(400, 'Content is required');
    }

    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(404, 'Comment not found');
    }
    console.log(comment.owner._id, userId);
    if(!comment.owner._id.equals(userId)) {
        throw new ApiError(403, 'You are not authorized to update this comment');
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
})

const togglePinComment = asyncHandler(async (req, res) => {
    const {commentId, videoId} = req.query;
    const userId = req.user?._id;

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid comment ID');
    }
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID');
    }

    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, 'Video not found');
    }
    if(!video.owner._id.equals(userId)) {
        throw new ApiError(403, 'Only the video owner can pin comments');
    }

    const pin = await Comment.findOneAndUpdate(
        {_id: commentId, video: videoId},
        [{ $set: { isPinned: { $not: "$isPinned" } } }],
        { new: true, updatePipeline: true }
    );

    if(!pin) {
        throw new ApiError(404, 'failed to toggle pin status');
    }
    
    return res.status(200).json(new ApiResponse(200, pin, 
        pin.isPinned ? "Comment pinned successfully" : "Comment unpinned successfully"
    ));
})

const getComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query;

    

    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID');
    }

    const comments = await Comment.aggregate([
        { $match: { 
            video: new mongoose.Types.ObjectId(videoId), 
            parentId: null 
        }},
        { $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner',
            pipeline: [
                { $project: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    avatar: 1
                }}
            ]
        }},
        { $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'parentId',
            as: 'replies'

        }},
        { $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'comment',
            as: 'likes'
        }},
        { $addFields: {
            likesCount: { $size: '$likes' },
            repliesCount: { $size: '$replies' },
            owner: { $arrayElemAt: ['$owner', 0] },
            // owner: { $first: '$owner' } // Alternative to $arrayElemAt for getting the first element
            isLiked: {
                $cond: {
                    if: { $in: [new mongoose.Types.ObjectId(req.user?._id), '$likes.likedBy'] },
                    then: true,
                    else: false
                }
            }
        }},
        { $project: {
            likes: 0,
            replies: 0,
            __v: 0

        }},
        { $sort: { isPinned: -1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ])

    const totalComments = await Comment.countDocuments({ video: new mongoose.Types.ObjectId(videoId), parentId: null });

    const totalPages = Math.ceil(totalComments / limit);

    return res.status(200).json(
        new ApiResponse(200, 
            {   comments: comments,
                totalComments: totalComments,
                totalPages: totalPages,
                currentPage: page
            },      
            "Comments fetched successfully"
        )
    );
})

const getReplies = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {page = 1, limit = 10} = req.query;
    
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid comment ID');
    }
    
    const replies = await Comment.aggregate([
        { $match: { parentId: new mongoose.Types.ObjectId(commentId) }},
        { $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner',
            pipeline: [
                { $project: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    avatar: 1
                }}
            ]
        }},
        { $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'comment',
            as: 'likes'
        }},
        { $addFields: {
            likesCount: { $size: '$likes' },
            owner: { $arrayElemAt: ['$owner', 0] },
            isLiked: {
                $cond: {
                    if: { $in: [new mongoose.Types.ObjectId(req.user?._id), '$likes.likedBy'] },
                    then: true,
                    else: false
                }
            }
        }},
        { $project: {
            content: 1,
            owner: 1,
            likesCount: 1,
            isLiked: 1,
            createdAt: 1,
            updatedAt: 1
        }},
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ])

    const totalReplies = await Comment.countDocuments({ parentId: new mongoose.Types.ObjectId(commentId) });

    const totalPages = Math.ceil(totalReplies / limit);

    return res.status(200).json(
        new ApiResponse(200, 
            {   replies: replies,
                totalReplies: totalReplies,
                totalPages: totalPages,
                currentPage: page
            },      
            "Replies fetched successfully"
        )
    );
})



export {
    createComment, deleteComment, updateComment, togglePinComment, getComments, getReplies
}