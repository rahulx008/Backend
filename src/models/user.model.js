import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String, //cloudinary url
            required:true,
        },
        coverImage:{
            type:String, //cloudinary url
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true, "Password is required"]
        },
        refreshToken:{
            type:String
        }
    },{timestamps: true}
)

userSchema.pre("save", async function(){
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10 );
    
})


// definition of isPasswordCorrect fn which compares using Bcript compare fn.. 
userSchema.methods.isPasswordCorrect = async function (password){
    
    return await bcrypt.compare(password, this.password);
}

// definition of generateAccessToken fn which compares using jwt sign fn.. 
userSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        {
            _id: this.id,
            username: this.username,
            email: this.email,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        {
            _id: this.id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema); 