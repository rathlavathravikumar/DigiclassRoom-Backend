import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { fileUpload } from "../utils/cloudinary.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { Submission } from "../models/submissions.model.js";

const router=Router();

router.route("/").post(upload.single("File"),async (req,res)=>{
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

router.post("/submit", authenticate, authorizeRoles("student"), upload.single("Upload File"), async (req, res) => {
  const filePath = req.file?.path;
  const { type, ref_id, course_id, text, link } = req.body || {};
  if (!filePath) return res.status(400).json({ message: "file not found" });
  if (!type || !ref_id) return res.status(400).json({ message: "Missing required fields" });
  try {
    const uploadResponse = await fileUpload(filePath);
    const doc = await Submission.findOneAndUpdate(
      { type, ref_id, student_id: req.user._id },
      {
        $set: {
          type,
          ref_id,
          student_id: req.user._id,
          course_id: course_id || undefined,
          file_url: uploadResponse.secure_url,
          text: text || undefined,
          link: link || undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: "Submitted", data: doc });
  } catch (error) {
    return res.status(500).json({ message: "Upload/submit failed" });
  }
});

export default router 