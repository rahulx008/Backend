import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new mongoose.Schema({

    content: {
        type: String,
        required: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },
    isPinned: {
        type:Boolean,
        default: false
    }
    
}, {timestamps: true})

commentSchema.index({video:1, isPinned:1});
commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
