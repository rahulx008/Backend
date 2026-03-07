import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { categories } from "../constants.js";

const videoSchema = new Schema({
    title:{
        type: String,
        required:true
    },
    description:{
        type: String,
        required:true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref:"User"
    },
    views:{
        type: Number,
        default:0
    },
    category:{
        type: String,
        enum: categories
    },
    isPublished:{
        type: Boolean,
        default: true
    },
    videoFile:{
        type: String, //cloudinary url
        required:true
    },
    thumbnail:{
        type: String, //cloudinary url
        required:true
    },
    video_publicId:{
        type: String, //cloudinary public id
        required:true
    },
    thumbnail_publicId:{
        type: String, //cloudinary public id
        required:true
    }

},{timestamps: true}
    
)

videoSchema.plugin(mongooseAggregatePaginate);
videoSchema.index({ title: "text", description: "text", views:1, _id: 1, createdAt: 1 });

export const Video = mongoose.model("Video", videoSchema);