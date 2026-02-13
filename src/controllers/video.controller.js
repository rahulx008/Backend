import {uploadOnCloudinary, deleteOnCloudinary} from '../utils/cloudinary.js'
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import mongoose, { isValidObjectId } from "mongoose";

// Publish video
const publishVideo = asyncHandler(async (req, res)=>{
    const {title, description} = req.body;
    
    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!title || !description){
        throw new ApiError(400, "Title and Description are required");
    }
    if(!videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "Video and Tumbnail files are required");
    }

    const videoUpload = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);


    if(!videoUpload || !thumbnailUpload){
        throw new ApiError(400, "Error while uploading video file");
    }
    
    const videoDetails = await Video.create({
        title,
        description,
        owner: req.user._id,
        videoFile: videoUpload?.secure_url,
        thumbnail: thumbnailUpload?.secure_url,
        video_publicId: videoUpload?.public_id,
        thumbnail_publicId: thumbnailUpload?.public_id
    });

    if(!videoDetails){
        throw new ApiError(400, "Error while publishing video");
    }
    
    return res.status(200).json(
        new ApiResponse(200, videoDetails, "Video published successfully")
    )
});

// Get video by id
const getVideoById = asyncHandler(async (req, res)=>{
    const {videoId} = req.params;
    if(!videoId){
        throw new ApiError(400, "Video Id is required");
    }

    // this is a mongoose validator 
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }

    const video = await Video.aggregate([
        {   $match: {
            _id: new mongoose.Types.ObjectId(videoId),
            isPublished: true
            } 
        },
        {   $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: ([
                    {   $lookup:{
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {   $addFields:{
                            subscribersCount: {$size: "$subscribers"},
                            isSubscribed: {
                                $cond:{ 
                                    if: {$in: [req.user?._id,  "$subscribers.subscriber"]},
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {    $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }                    
                    }    
                ])
            }
        },
        {   $lookup:{
                from:"likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"    
            },
        },
        {   $addFields:{
                likesCount: {$size: "$likes"},
                owner:{$first: "$owner"},
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {   $project: {
                title: 1,
                description: 1,
                owner: 1, //<--
                views: 1,
                videoFile: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: 1, //<--
                isLiked: 1, //<--
            }
        }
    ])

    if (video.length === 0) {
        throw new ApiError(404, "Video either does not exist or is unpublished");
    }

  // Increment the view count for the video
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    

    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
})

// Delete video
const deleteVideo = asyncHandler(async(req, res)=>{
    const {videoId} = req.params;
    if(!videoId){
        throw new ApiError(400, "Video Id is required");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }
    const video = await Video.findById(videoId);
    
    if(!video){
        throw new ApiError(404, "Video not found");
    }
    
    if(!video.owner.equals(req.user._id)){
        throw new ApiError(400, "Only owner can delete the video");
    }
    const result = await Promise.all(
        [deleteOnCloudinary(video.video_publicId, "video"),
        deleteOnCloudinary(video.thumbnail_publicId, "image"),
        Video.findByIdAndDelete(videoId),
        Comment.deleteMany({video: videoId}),
        Like.deleteMany({video: videoId})]
    );

    const {deleteVideoCloudResult, deleteThumbnailCloudResult, deleteVideoResult,
        deleteCommentResult, deleteLikeResult}=result;
    
    if(deleteVideoCloudResult?.result!=="ok"){
        new ApiError(500, "Error while deleting video from cloudinary");
    }
    if(deleteThumbnailCloudResult?.result!=="ok"){
        new ApiError(500, "Error while deleting thumbnail from cloudinary");
    }

    if(!deleteVideoResult){
        new ApiError(500, "Error while deleting video from database");
    }
    if(deleteCommentResult?.acknowledged && await Comment.countDocuments({video: videoId})>0){
        new ApiError(500, "Error while deleting comments");
    }
    if(deleteLikeResult?.acknowledged && await Like.countDocuments({video: videoId})>0){
        new ApiError(500, "Error while deleting comments");
    }
    return res.status(200).json(
        new ApiResponse(200, {videoId}, "Video deleted successfully")
    )
}) 

// Update video details
const updateVideo = asyncHandler(async(req, res)=>{
    const {videoId} = req.params;
    const {title, description} = req.body;
    const thumbnailLocalPath = req.file?.path;

    if(!videoId){
        throw new ApiError(400, "Video Id is required");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }
    if(!title || !description){
        throw new ApiError(400, "Title and Description are required");
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }
    if(!video.owner.equals(req.user._id)){
        throw new ApiError(400, "Only owner can update the video");
    }

    //upload thumbnail
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if(!thumbnail){
        throw new ApiError(400, "Error while uploading thumbnail");
    }

    //delete the old thumbnail
    const deleteThumbnailCloudResult = await deleteOnCloudinary(video.thumbnail_publicId, "image");
    if(deleteThumbnailCloudResult.result!=="ok"){
        throw new ApiError(500, "Error while deleting old thumbnail from cloudinary");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail: thumbnail.secure_url,
                thumbnail_publicId: thumbnail.public_id
            }
        },
        {new: true}
    )

    if(!updatedVideo){
        throw new ApiError(400, "Error while updating video");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video details updated successfully")
    )
})

export {publishVideo, getVideoById, deleteVideo, updateVideo};