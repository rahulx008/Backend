import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Video } from "../models/video.model.js";

const subscribeChannel = asyncHandler(async (req, res) => {
    
    const user = req.user;

    const channelId = req.params.channelId;

    if(!channelId){
        throw new ApiError(400, "Channel Id is required");
    }

    const channel = await User.findOne({username: channelId});
    
    if(!channel){
        throw new ApiError(400, "Channel not found");
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: user._id,
        channel: channel._id
    })

    if(isSubscribed){
        throw new ApiError(400, "User is already subscribed to the channel");
    }
    // Logic to subscribe the user to the channel
    const subscription = await Subscription.create({
        subscriber: user._id,
        channel: channel._id
    })

    if(!subscription){
        throw new ApiError(500, "Error while subscribing to the channel");
    }
    
    return res.status(200).json(new ApiResponse(200, subscription, "Subscribed successfully"));
})  

const unsubscribeChannel = asyncHandler(async(req,res)=>{
    const user = req.user;
    const channelId = req.params.channelId;
    if(!channelId){
        throw new ApiError(400, "Channel Id is required");
    }

    const channel = await User.findOne({username: channelId});
    if(!channel){
        throw new ApiError(400, "Channel not found");
    }

    const subscription = await Subscription.findOneAndDelete({
        subscriber: user._id,
        channel: channel._id
    });

    if(!subscription){
        throw new ApiError(400, "User is not subscribed to the channel");
    }

    return res.status(200).json(new ApiResponse(200, subscription, "Unsubscribed successfully"));
})

const getSubscribedVideos = asyncHandler(async (req, res) => {
    const subscriberId = req.user?._id;

    // Find all channels the user is subscribed to
    const subscriptions = await Subscription.find({ subscriber: subscriberId });
    const channelIds = subscriptions.map((sub) => sub.channel);

    if (channelIds.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, [], "User has no subscriptions")
        );
    }

    // Find all published videos of these channels
    const videos = await Video.find({
        owner: { $in: channelIds },
        isPublished: true
    })
    .populate("owner", "fullName username avatar")
    .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, videos, "Subscription videos fetched successfully")
    );
});

export {
    subscribeChannel, unsubscribeChannel, getSubscribedVideos
};