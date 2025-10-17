import express, { json } from 'express'
import cors from 'cors'
import { errorHandler } from './middlewares/error.middleware.js'

const app=express()

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || process.env.cors_ORIGIN || 'http://localhost:8080';
app.use(cors({
    origin: ALLOWED_ORIGIN,
    credentials: true
}));


import logger from "./logger.js";
import morgan from "morgan";

const morganFormat = ":method :url :status :response-time ms";

app.use(  // for the logger the request and response
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

app.use(express.json({limit:'16kb'}))
app.use(express.urlencoded({limit:'16kb'}))
app.use(express.static('public'))
app.use(errorHandler)

//import routers
import healthcheckRouter from "./routes/healthcheck.route.js"
import uploadsRoute from './routes/uploads.route.js'
import studentRouter  from './routes/student.route.js'
import  teacherRouter  from './routes/teacher.route.js'
import  adminRouter  from './routes/admin.route.js'
import courseRoute from './routes/course.route.js'
import assignmentsRoute from './routes/assignments.route.js'
import testsRoute from './routes/tests.route.js'
  
app.use("/healthcheck",healthcheckRouter)
app.use("/upload",uploadsRoute)
app.use("/api/v1/admin",adminRouter)
app.use("/api/v1/teacher",teacherRouter)
app.use("/api/v1/student",studentRouter)
app.use("/api/v1/courses", courseRoute)
app.use("/api/v1/assignments", assignmentsRoute)
app.use("/api/v1/tests", testsRoute)

app.get('/',(req,res)=>{
    res.status(200).send("welcome to DigLibrary")
})



export default app
