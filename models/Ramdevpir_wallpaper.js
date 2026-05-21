const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  url: String,
  public_id: String,
  type: String, // image | video
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ramdevpir_wallpaper", MediaSchema);
