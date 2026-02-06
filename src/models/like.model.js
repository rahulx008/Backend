import mongoose from "mongoose";
import { Schema } from 'mongoose';

const likeSchema = new mongoose.Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        default: null
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},
{timestamps: true})  

likeSchema.index({video:1, comment:1}, {unique: true});

export const Like = mongoose.model("Like", likeSchema);