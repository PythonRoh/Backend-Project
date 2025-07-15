import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Set the destination for uploaded files
    // Here, we are using a temporary directory
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // Set the filename for uploaded files
    // Here, we are using the original name of the file
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
});
