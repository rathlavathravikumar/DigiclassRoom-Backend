// Notice Model
/*notice {
  _id: string (pk)
  title: string
  content: text
  admin_id: object (admin._id)
  target : string
}*/

import mongoose,{ Schema } from "mongoose";
const noticeSchema= new Schema({
    title :{
        type : String,
        required :true,
        trim : true
    },
    content :{
        type : String,
        required :true,
        trim :true
    },
    admin_id:{
         type : Schema.Types.ObjectId,
         ref : "Admin",
        //  required :true jwt required
    },
    priority:{
        type : String,
        enum: ["normal", "important", "urgent"],
        required : true,
    },
    target :{
        type : String,
        enum: ["all", "students", "teachers"],
        required : true,
    }
},{timestamps:true}
);

export const Notice= mongoose.model("Notice",noticeSchema);