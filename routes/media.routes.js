const express = require("express");
const upload = require("../middleware/upload");
const Ramdevpir_wallpaper = require("../models/Ramdevpir_wallpaper");
const cloudinary = require("../config/cloudinary");


const router = express.Router();

// Upload image/video
router.post("/upload", upload.single("file"), async (req, res) => {

  console.log("REQ FILE:", req.file);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const isVideo = req.file.mimetype.startsWith("video");

    const media = await Ramdevpir_wallpaper.create({
      url: req.file.path,
      public_id: req.file.filename,
      type: isVideo ? "video" : "image"
    });

    res.json({
      success: true,
      media: {
        id: media._id,
        url: media.url,
        type: media.type
      }
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// Get all media

// Get all media with pagination
router.get("/media", async (req, res) => {
  try {
    // Pagination params
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const skip = (page - 1) * limit;

    // Total count
    const total = await Ramdevpir_wallpaper.countDocuments();

    // Fetch paginated data
    const media = await Ramdevpir_wallpaper.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format response
    const response = media.map(item => ({
      id: item._id,
      url: item.url,
      type: item.type
    }));

    res.status(200).json({
      success: true,
      status: 200,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: response
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Failed to fetch media"
    });
  }
});


router.delete("/media/:id", async (req, res) => {
  try {
    const media = await Ramdevpir_wallpaper.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    await cloudinary.uploader.destroy(media.public_id, {
      resource_type: media.type
    });


    await Ramdevpir_wallpaper.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});


module.exports = router;
