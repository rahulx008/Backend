import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

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

export const Video = mongoose.model("Video", videoSchema);