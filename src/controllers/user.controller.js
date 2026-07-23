import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// cookie options helper: use secure+SameSite=None in production, relaxed for local development
const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
};

const generateAccessAndRefreshTokens = async (_id) => {
    try {
        const user = await User.findById(_id);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        //validateBeforeSave is kept false because we dont want to validate other fields again.
        // only refresh token field is being updated here.
        await user.save({ validateBeforeSave: false });
        //console.log("Token Generated:", accessToken);

        return { accessToken, refreshToken }
    } catch (error) {
        new ApiError(500, "Something went wrong while generating refresh and access token");
    }


}

// User Registration Method
const registerUser = asyncHandler(async (req, res) => {
    /*
        #1 data from frontend
        #2 validation - not empty
        #3 check if user already exists: username, email
        #4 check for images, check for avatar
        #5 upload them to cloudinary, avatar
        #6 create user object - create entry in db
        #7 remove password and refresh token field from response
        #8 check for user creation
        #9 return res
    */

    //#1 - data from frontend
    const {
        fullname, email, username, password
    } = req.body;


    // #2 validation - not empty
    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // #3 check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    //#4 check for images, check for avatar

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    // const avatarLocalPath =req.files?.avatar[0]?.path;
    // const coverImageLocalPath =req.files?.coverImage[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;



    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let coverImageLocalPath;
    if (req.files?.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // console.log(avatarLocalPath);

    // #5 upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    // #6 create user object - create entry in db   
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });


    //#7 remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    //#8 check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Error while registering the user");
    }
    console.log("User created in DB");

    return res.status(200).json(
        new ApiError(200, createdUser, "User registered Successfully")
    )
})

// User Login Method 
const loginUser = asyncHandler(async (req, res) => {
    /*
        #1 req body -> data
        #2 username or email
        #3 find the user
        #4 password check
        #5 access and refresh token
        #6 send cookie
    */

    //#1 req body -> data
    const { username, password, email } = req.body;

    //#2 username or email
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    //#3 find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(400, "User does not exist");
    }

    //#4 password check
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    //#5 access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

// User Logout Method
const logoutUser = asyncHandler(async (req, res) => {
    //get current user id
    //clear refreshToken
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        })

    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"))

})

//refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }


        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }

})

// get current logged in user
const getCurrentUser = asyncHandler(async (req, res) => {
    //the req.user is coming from the verifyJWT middleware
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        ))
});

// change the password
const changeUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

// update account details
const changeAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, username, email } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                username: username.toLowerCase(),
                email
            }
        },
        // it returns the updated and new value.
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
})

// update avatar image
const updateAvatar = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    const upload = await uploadOnCloudinary(coverImageLocalPath);

    if (!upload.url) {
        throw new ApiError(400, "Error while uploading avatar on cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: upload.url
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));


});

// update cover image
const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is required");
    }
    const upload = await uploadOnCloudinary(coverImageLocalPath);

    if (!upload.url) {
        throw new ApiError(400, "Error while uploading cover image on cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: upload.url
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));


});

// get user channel profile
const getUserChannelDetails = asyncHandler(async (req, res) => {
    const username = req.params.username;
    if (!username) {
        throw new ApiError(400, "User name is required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
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
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel.length) {
        throw new ApiError(400, "Channel does not exists");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel details fetched successfully"));
});

// get watch history
const getUserWatchHistory = asyncHandler(async (req, res) => {
    const userWatchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
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
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    if (!userWatchHistory.length) {
        throw new ApiError(400, "Error while fetching watch history");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, userWatchHistory[0].watchHistory, "Watch history fetched successfully"));
});

//clear watch history
const clearWatchHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User id is required");
    }
    const user = await User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                watchHistory: 1
            }
        },
        { new: true }
    );

    if (!user) {
        throw new ApiError(400, "Error while deleting watch history");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Watch history deleted successfully"));
});


export {
    registerUser, loginUser, logoutUser, refreshAccessToken, getCurrentUser,
    changeUserPassword, changeAccountDetails, updateAvatar, updateCoverImage,
    getUserChannelDetails, getUserWatchHistory, clearWatchHistory
};