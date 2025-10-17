import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { fileUpload } from "../utils/cloudinary.js";

const router=Router();

router.route("/").post(upload.single("avatar"),async (req,res)=>{
    const filePath=req.file.path
    if(!filePath) res.status(404).send("file not found")
    try{
        const uploadResponse=await fileUpload(filePath)
        
        res.status(200).json({
            message: "File uploaded successfully",
            url: uploadResponse.secure_url,   //direct Cloudinary link
            public_id: uploadResponse.public_id, // useful if you want to delete later
            resource_type: uploadResponse.resource_type
        });
    }catch(error){
        res.status(404).send("failure in uploading the file")
    }

})

export default router 