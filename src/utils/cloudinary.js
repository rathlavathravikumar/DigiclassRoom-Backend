import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";



    // Configuration
    cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_NAME, 
        api_key: process.env.CLOUDINARY_KEY, 
        api_secret: process.env.CLOUDINARY_SECRET,
    });
    
    const fileUpload=async (filePath)=>{
    // Upload an image
    try{
        if(!filePath) return null
     const uploadResponse = await cloudinary.uploader
       .upload(
           filePath,
           {resource_type:"auto"}
       )
        fs.unlinkSync(filePath)
        return uploadResponse

    }catch(error){
        console.log(error)
        fs.unlinkSync(filePath)
        return null
    }
       
};

export { fileUpload }