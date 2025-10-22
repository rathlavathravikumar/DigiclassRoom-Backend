import express, { json } from 'express'
import cors from 'cors'
import { errorHandler } from './middlewares/error.middleware.js'

const app=express()

const ORIGINS_ENV = process.env.CORS_ORIGIN || process.env.cors_ORIGIN || '';
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8084',
  'http://127.0.0.1:8084',
  'http://localhost:8085',
  'http://127.0.0.1:8085',
  'http://127.0.0.1:42709',
  'http://localhost:42709',
  'http://127.0.0.1:41491',
  'http://localhost:41491',
  'http://127.0.0.1:38017',
  'http://localhost:38017',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const ORIGIN_LIST = (
  ORIGINS_ENV
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const ALLOWED_ORIGINS = ORIGIN_LIST.length ? ORIGIN_LIST : DEFAULT_ORIGINS;

app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    console.log('Allowed origins:', ALLOWED_ORIGINS);
    
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    console.log('Origin not allowed:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
import marksRoute from './routes/marks.route.js'
import noticesPublicRoute from './routes/notices.route.js'
import submissionsRoute from './routes/submissions.route.js'
import meetingRoute from './routes/meeting.route.js'
import attendanceRoute from './routes/attendance.route.js'
import statsRoute from './routes/stats.route.js'
import progressRoute from './routes/progress.route.js'
import passwordResetRoute from './routes/passwordReset.route.js'
  
app.use("/healthcheck",healthcheckRouter)
app.use("/upload",uploadsRoute)
app.use("/api/v1/admin",adminRouter)
app.use("/api/v1/teacher",teacherRouter)
app.use("/api/v1/student",studentRouter)
app.use("/api/v1/courses", courseRoute)
app.use("/api/v1/assignments", assignmentsRoute)
app.use("/api/v1/tests", testsRoute)
app.use("/api/v1/marks", marksRoute)
app.use("/api/v1/notices", noticesPublicRoute)
app.use("/api/v1/submissions", submissionsRoute)
app.use("/api/v1/meetings", meetingRoute)
app.use("/api/v1/attendance", attendanceRoute)
app.use("/api/v1", statsRoute)
app.use("/api/v1/progress", progressRoute)
app.use("/api/v1/auth", passwordResetRoute)

app.get('/',(req,res)=>{
    res.status(200).send("welcome to DigLibrary")
})



export default app
