import registerAdminSchema from "../utils/registeration.validation.js"
import ApiErrorResponse  from "../utils/ApiErrorResponse.js"
import { invalid } from "joi"

const registerAdmin=async(req,res)=>{
        const { name,institute,email,password } =req.body
    //    const { error } = registerAdminSchema.validate()

    //    if(error) res.status(404).send(ApiErrorResponse(404,"invalid"))
}