const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video");

    return {
      folder: isVideo ? "videos" : "images",
      resource_type: isVideo ? "video" : "image",
      public_id: Date.now() + "-" + file.originalname,
    };
  },
});

module.exports = multer({ storage });
