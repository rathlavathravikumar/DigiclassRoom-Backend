
/*admin {
  _id: string (pk)
  name: string
  clgName : string
  email: string
  password: string
}*/

import mongoose,{ Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const adminSchema=new Schema({

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
    clgName :{
        type :String,
        required :true,
        trim :true
    },
    password:{
        type : String,
        required : true,
        trim : true
    },
    refreshToken :{
        type : String,
    }
}, {timestamps :true}
)

adminSchema.pre("save",async function(next){ //HOOKS
    if(!this.isModified("password")) return next()
    this.password=await bcrypt.hash(this.password,10)
})

adminSchema.methods.isCurrentPassword=function(password){
    return  bcrypt.compare(password,this.password)
}

adminSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
        _id:this._id,
        role: "admin"
        },

        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn:process.env.ACCESS_TOKEN_EXPIRY }
    )
}
adminSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id: this._id,
            role : "admin"
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )
}
export const Admin=mongoose.model("Admin",adminSchema)