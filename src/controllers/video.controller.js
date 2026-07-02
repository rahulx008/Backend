import mongoose, { isValidObjectId } from "mongoose";
import { categories } from '../constants.js';
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js';

// Publish video
const publishVideo = asyncHandler(async (req, res) => {
    const { title, description, category } = req.body;

    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!title.trim() || !description.trim() || !category) {
        throw new ApiError(400, "Title, Description and Category all fields are required");
    }
    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video and Tumbnail files are required");
    }

    if (!categories.includes(category)) {
        throw new ApiError(400, "Invalid category");
    }

    const videoUpload = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);


    if (!videoUpload || !thumbnailUpload) {
        throw new ApiError(400, "Error while uploading video file");
    }

    const videoDetails = await Video.create({
        title,
        description,
        owner: req.user._id,
        category,
        videoFile: videoUpload?.secure_url,
        thumbnail: thumbnailUpload?.secure_url,
        video_publicId: videoUpload?.public_id,
        thumbnail_publicId: thumbnailUpload?.public_id
    });

    if (!videoDetails) {
        throw new ApiError(400, "Error while publishing video");
    }

    return res.status(200).json(
        new ApiResponse(200, videoDetails, "Video published successfully")
    )
});

// Get video by id
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video Id is required");
    }

    // this is a mongoose validator 
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: ([
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
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
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                owner: { $first: "$owner" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, { $ifNull: [{ $arrayElemAt: ["$likes.likedBy", 0] }, []] }] },
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
                category: 1,
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

    //add the video to the user's watch history

    const watch = await User.findByIdAndUpdate(req.user._id, {
        $addToSet: {
            watchHistory: videoId
        }
    }, { new: true });

    if (!watch) {
        throw new ApiError(500, "Error while updating watch history");
    }


    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
})

// Delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video Id is required");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(400, "Only owner can delete the video");
    }
    const result = await Promise.all(
        [deleteOnCloudinary(video.video_publicId, "video"),
        deleteOnCloudinary(video.thumbnail_publicId, "image"),
        Video.findByIdAndDelete(videoId),
        Comment.deleteMany({ video: videoId }),
        Like.deleteMany({ video: videoId })]
    );

    const { deleteVideoCloudResult, deleteThumbnailCloudResult, deleteVideoResult,
        deleteCommentResult, deleteLikeResult } = result;

    if (deleteVideoCloudResult?.result !== "ok") {
        new ApiError(500, "Error while deleting video from cloudinary");
    }
    if (deleteThumbnailCloudResult?.result !== "ok") {
        new ApiError(500, "Error while deleting thumbnail from cloudinary");
    }

    if (!deleteVideoResult) {
        new ApiError(500, "Error while deleting video from database");
    }
    if (deleteCommentResult?.acknowledged && await Comment.countDocuments({ video: videoId }) > 0) {
        new ApiError(500, "Error while deleting comments");
    }
    if (deleteLikeResult?.acknowledged && await Like.countDocuments({ video: videoId }) > 0) {
        new ApiError(500, "Error while deleting comments");
    }
    return res.status(200).json(
        new ApiResponse(200, { videoId }, "Video deleted successfully")
    )
})

// Update video details
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description, category } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!videoId) {
        throw new ApiError(400, "Video Id is required");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }
    if (!title.trim() || !description.trim() || !category.trim()) {
        throw new ApiError(400, "Title, Description and Category all fields are required");
    }
    if (!categories.includes(category)) {
        throw new ApiError(400, "Invalid category");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(400, "Only owner can update the video");
    }

    //upload thumbnail
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
        throw new ApiError(400, "Error while uploading thumbnail");
    }

    //delete the old thumbnail
    const deleteThumbnailCloudResult = await deleteOnCloudinary(video.thumbnail_publicId, "image");
    if (deleteThumbnailCloudResult.result !== "ok") {
        throw new ApiError(500, "Error while deleting old thumbnail from cloudinary");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                category,
                thumbnail: thumbnail.secure_url,
                thumbnail_publicId: thumbnail.public_id
            }
        },
        { new: true }
    )

    if (!updatedVideo) {
        throw new ApiError(400, "Error while updating video");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video details updated successfully")
    )
})

// get all videos
const getAllVideos = asyncHandler(async (req, res) => {
    const { query, category = "trending", userId, cursor, limit = "10" } = req.query;

    // console.log(req.query);

    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(limitNum) || limitNum <= 0) {
        limitNum = 10;
    }

    let searchResults = null;

    if (query) {
        const searchPipeline = [
            {
                $search: {
                    index: "search-index",
                    text: {
                        query: query,
                        path: ["title", "description"]
                    }
                }
            },
            { $match: { isPublished: true } },
            { $project: { _id: 1 } },
        ];

        searchResults = await Video.aggregate(searchPipeline);

        // console.log("Search results for query:", query, searchResults);
    }

    const pipeline = [];

    // Filter if user id given in req
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User Id");
        }
        pipeline.push(
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            }
        );
    }
    // Filter by `$search` results if applicable
    if (searchResults) {
        const searchIds = searchResults.map((result) => result._id);
        // console.log("Search IDs count:", searchIds.length);
        // console.log("Search IDs:", searchIds);

        pipeline.push(
            {
                $match: {
                    _id: { $in: searchIds },
                }
            }
        );
    }
    // Filter by category if provided
    if (category) {
        if (!categories.includes(category)) {
            throw new ApiError(400, 'Invalid category.')

        } else if (category !== 'trending') {
            pipeline.push({
                $match: {
                    category: category
                }
            })
        }
    }
    // Filter published videos
    pipeline.push({
        $match: {
            isPublished: true,
        },
    });

    // Join with the users collection
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        }
    );

    // Project fields to return
    pipeline.push({
        $project: {
            _id: 1,
            thumbnail: 1,
            title: 1,
            description: 1,
            duration: 1,
            views: 1,
            owner: {
                _id: 1,
                avatar: 1,
                fullName: 1,
                username: 1,
                createdAt: 1,
            },
            createdAt: 1,
            category: 1
        },
    }
    );

    //Cursor based pagination (only apply when NOT searching)
    // Step A: check if cursor is provided and add a match stage to the pipeline
    if (cursor && !searchResults) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, "Invalid cursor");
        }
        pipeline.push({
            $match: {
                _id: { $lt: new mongoose.Types.ObjectId(cursor) }
            }
        })
    }
    // Step B: Add a sort stage to the pipeline
    const sortStage = category === 'trending' ? { views: -1, _id: -1 } : { createdAt: -1, _id: -1 };
    pipeline.push({
        $sort: sortStage
    });
    // Step C: Add a limit stage to the pipeline (fetch one extra record to check if there's a next page)
    pipeline.push({
        $limit: limitNum + 1
    });

    // Step 3: Use `aggregatePaginate` for pagination
    const videos = await Video.aggregate(pipeline);

    // console.log("Aggregated videos count:", videos.length);
    // console.log("Aggregated videos:", videos);

    let nextCursor = null;
    let hasMore = false;

    if (videos.length > limitNum) {
        hasMore = true;
        nextCursor = videos[limitNum]._id.toString();
        videos.pop();
    }

    /* This was an example of offset based pagination with AggregatePaginate */

    // const filteredVideos = await Video.aggregatePaginate(videos, {
    //     page: parseInt(page),
    //     limit: parseInt(limit),
    //     sort: (category === 'trending') ? { views: -1 } : { createdAt: -1 },
    // });


    // Step 4 : Respond with paginated videos
    return res.status(200).json(
        new ApiResponse(200, { videos, hasMore, nextCursor }, "Videos fetched successfully")
    );
})

// get relatedVideos 
const getRelatedVideos = asyncHandler(async (req, res) => {
    const { videoId } = req.query;
    if (!videoId) {
        throw new ApiError(400, "Video Id is required");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const relatedVideos = await Video.aggregate([
        {
            $match: {
                category: video.category,
                _id: { $ne: video._id },
                isPublished: true
            }
        },
        { $sample: { size: 10 } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                owner: 1,
                createdAt: 1
            }
        }
    ])

    if (relatedVideos.length === 0) {
        throw new ApiError(404, "No related videos found");
    }

    return res.status(200).json(
        new ApiResponse(200, relatedVideos, "Related videos fetched successfully")
    )
})

//sea

export { deleteVideo, getAllVideos, getRelatedVideos, getVideoById, publishVideo, updateVideo };

