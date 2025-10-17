
/*
student[icon:student]{
  _id string pk
  name string
  email string
  password string
  class_id object class
  refreshToken string
  createdAt date
  updatedAt date
}*/

import mongoose,{ Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const studentSchema=new Schema({

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
    class_id:{
        type : Schema.Types.ObjectId,
        ref : "Class",
        required : true
    },
    refreshToken :{
        type : String,
    }
}, {timestamps :true}
)

studentSchema.pre("save",async function(next){ //HOOKS
    if(!this.isModified("password")) return next()
    this.password=await bcrypt.hash(this.password,10)
})

studentSchema.methods.isCurrentPassword=function(password){
    return  bcrypt.compare(password,this.password)
}

studentSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
        _id:this._id,
        role: "student"
        },

        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn:process.env.ACCESS_TOKEN_EXPIRY }
    )
}
studentSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id: this._id,
            role : "student"
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )
}
export const Student=mongoose.model("Student",studentSchema)