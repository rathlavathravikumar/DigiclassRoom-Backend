import { Notice } from "../models/notice.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";

const createNotice= async (req,res)=>{
    try {
        //  const adminId = req.user._id;
         const {title,content,priority,target} =req.body;
         if(!title || !content || !priority || !target){
           throw new ApiErrorResponse(404,"values are empty")
         }

         const notice= await Notice.create({
            title,
            content,
            priority,
            target,
            // admin_id : adminId
         });

        res.status(201).send(new Apiresponse(201,notice,"successfully notice uploaded"));

    } catch (error) {
        console.log("failde to createNotice:", error.message)
       throw new ApiErrorResponse(500,"failed to createNotice");
    }
}



export { createNotice }