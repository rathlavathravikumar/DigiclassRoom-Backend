import { Apiresponse } from "../utils/Apiresponse.js";

const healthcheck=(req,res,next)=>{
    res.status(200).json(new Apiresponse(200,null,"health checking"))
}

export { healthcheck }