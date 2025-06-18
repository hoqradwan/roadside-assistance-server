import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Express } from "express";
import { Request } from "express";
import createHttpError from "http-errors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";  // Updated import for v3
import multerS3 from "multer-s3";
import { max_file_size, UPLOAD_FOLDER } from "../config";

// Configurations
const UPLOAD_PATH = UPLOAD_FOLDER || "public/images";
const MAX_FILE_SIZE = Number(max_file_size) || 5 * 1024 * 1024;  // 5 MB max size
const ALLOWED_FILE_TYPES = [
  ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx",".svg"
];

// AWS S3 setup for AWS SDK v3
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = process.env;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be defined in environment variables.");
}

const s3 = new S3Client({
  region: AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

// Storage configuration for S3 using multer-s3
const storage = multerS3({
  s3,
  bucket: process.env.AWS_BUCKET_NAME || "your-bucket-name",  // Replace with your bucket name
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const extName = path.extname(file.originalname);
    const fileName = `${Date.now()}-${file.originalname.replace(extName, "")}${extName}`;
    
    // Store file names in req.body (useful for later processing)
    if (file.fieldname === "image") {
      req.body.image = fileName;
    } else if (file.fieldname === "driverLicense") {
      req.body.driverLicense = fileName;
    }

    cb(null, fileName); // S3 file name
  },
});

// File filter to restrict file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  let extName = path.extname(file.originalname).toLowerCase();
  const isAllowedFileType = ALLOWED_FILE_TYPES.includes(extName);
  if (!isAllowedFileType) {
    return cb(createHttpError(400, "File type not allowed"));
  }
  cb(null, true);
};

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default upload;
// import multer, { FileFilterCallback } from "multer";
// import path from "path";
// import { Express } from "express";
// import { Request } from "express";
// import createHttpError from "http-errors";
// import { max_file_size, UPLOAD_FOLDER } from "../config";

// const UPLOAD_PATH = UPLOAD_FOLDER || "public/images";
// const MAX_FILE_SIZE = Number(max_file_size) || 5 * 1024 * 1024;

// const ALLOWED_FILE_TYPES = [
//   ".jpg",
//   ".jpeg",
//   ".png",
//   ".xlsx",
//   ".xls",
//   ".csv",
//   ".pdf",
//   ".doc",
//   ".docx",
//   ".mp3",
//   ".wav",
//   ".ogg",
//   ".mp4",
//   ".avi",
//   ".mov",
//   ".mkv",
//   ".webm",
//   ".svg",
// ];

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, UPLOAD_PATH);
//   },
//   filename: function (
//     req: Request,
//     file: Express.Multer.File,
//     cb: (error: Error | null, filename: string) => void,
//   ) {
//     const extName = path.extname(file.originalname);

//     const fileName = `${Date.now()}-${file.originalname.replace(
//       extName,
//       "",
//     )}${extName}`;
//     req.body.image = fileName;
//     cb(null, fileName);
//   },
// });

// const fileFilter = (
//   req: Request,
//   file: Express.Multer.File,
//   cb: FileFilterCallback,
// ) => {
//   let extName = path.extname(file.originalname).toLocaleLowerCase();
//   const isAllowedFileType = ALLOWED_FILE_TYPES.includes(extName);
//   if (!isAllowedFileType) {
//     return cb(createHttpError(400, "File type not allowed"));
//   }

//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: MAX_FILE_SIZE,
//   },
// });

// export default upload;
