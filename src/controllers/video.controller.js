import asyncHandler from "../utils/asyncHandler.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { isValidObjectId } from "mongoose";

// Publish video
const publishVideo = asyncHandler(async (req, res)=>{
    const {title, description} = req.body;
    
    const videoLocalPath = req.files?.video[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if(!title || !description){
        throw new ApiError(400, "Title and Description are required");
    }
    if(!videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "Video and Tumbnail files are required");
    }

    const [videoUpload, thumbnailUpload] = await Promise.all(
        uploadOnCloudinary(videoLocalPath),
        uploadOnCloudinary(thumbnailLocalPath)
    );

    if(!videoUpload || !thumbnailUpload){
        throw new ApiError(400, "Error while uploading video file");
    }
    
    const videoDetails = Video.create({
        title,
        description,
        owner: req.user._id,
        videoFile: videoUpload?.secure_url,
        thumbnail: thumbnailUpload?.secure_url,
        video_publicId: videoUpload?.public_id,
        thumbnail_publicId: thumbnailUpload?.public_id
    })

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
            _id: videoId,
            isPublished: true
            } 
        },
        {   $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {$lookup:{
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        },
                        $addFields:{
                            subscribersCount: {$size: "$subscribers"},
                            isSubscribed: {
                                $cond:{ 
                                    if: {$in: [req.user._id, "$subscribers.subscriber"]},
                                    then: true,
                                    else: false
                                }
                            }
                        },
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }                    
                    }    
                ]
            }
        },
        {   $lookup:{
                from:"likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"    
            },
        },
        {
            $addFields:{
                likesCount: {$size: "$likes"},
                owner:{$first: $owner},
                isLiked: {
                    $cond: {
                        if: {$in: [req.user._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
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


export {publishVideo, getVideoById};