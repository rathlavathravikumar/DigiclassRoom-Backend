/*teacher {
  _id: string (pk)
  name: string
  email: string
  password: string
  courses_taught: object[] (course._id)
  createdAt: date
  updatedAt: date
}*/

import mongoose,{ Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const teacherSchema=new Schema({

    name :{
        type:String,
        required:true,
        trim:true
    },
    email : {
        type:String,
        required:true,
        trim :true
    },
    password:{
        type : String,
        required : true,
        trim : true
    },
    clg_id: {
        type: String,
        trim: true,
        default: ""
    },
    admin_id: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    },
    courses_taught:[{
        type : Schema.Types.ObjectId,
        ref : "Course",
        required : false
    }],
    refreshToken :{
        type : String,
    },
    passwordResetToken: {
        type: String,
    },
    passwordResetExpiry: {
        type: Date,
    }
}, {timestamps :true}
)

// Unique clg_id per admin for teachers
teacherSchema.index({ admin_id: 1, clg_id: 1 }, { unique: true, partialFilterExpression: { clg_id: { $type: 'string', $ne: '' } } });

teacherSchema.pre("save",async function(next){ //HOOKS
    if(!this.isModified("password")) return next()
    this.password=await bcrypt.hash(this.password,10)
})

teacherSchema.methods.isCurrentPassword=function(password){
    return  bcrypt.compare(password,this.password)
}

teacherSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
        _id:this._id,
        role: "teacher",
        admin_id: this.admin_id
        },

        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn:process.env.ACCESS_TOKEN_EXPIRY }
    )
}
teacherSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id: this._id,
            role : "teacher",
            admin_id: this.admin_id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )
}
export const Teacher=mongoose.model("Teacher",teacherSchema)