import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";

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

export {
    subscribeChannel
};