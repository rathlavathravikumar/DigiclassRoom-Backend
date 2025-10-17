import "./config/dotenv.js"

import app from "./app.js";
import { dbConnect } from "./db/index.js";




const PORT=process.env.PORT || 3001

dbConnect().
then(()=>{
    app.listen(PORT,()=>{ 
    console.log(`server is listening at ${PORT}`)

})
})
.catch((err)=>{
    console.log("failing to connect to database " , err);
})
