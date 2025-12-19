require("dotenv").config({ quiet: true });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));

// Định nghĩa Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tên không được để trống"],
    minlength: [2, "Tên phải có ít nhất 2 ký tự"],
  },
  age: {
    type: Number,
    required: [true, "Tuổi không được để trống"],
    min: [0, "Tuổi phải >= 0"],
  },
  email: {
    type: String,
    required: [true, "Email không được để trống"],
    match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
  },
  address: String,
});

const User = mongoose.model("User", UserSchema);

// API: Lấy danh sách người dùng (có phân trang + tìm kiếm)
app.get("/api/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;
    const users = await User.find(filter).skip(skip).limit(limit);
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({ page, limit, total, totalPages, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Tạo người dùng mới
app.post("/api/users", async (req, res) => {
  try {
    const { name, age, email, address } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email đã tồn tại trong hệ thống" });
    }
    const newUser = await User.create({ name, age, email, address });
    res
      .status(201)
      .json({ message: "Tạo người dùng thành công", data: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API: Cập nhật người dùng
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, email, address } = req.body;
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return res.status(400).json({ error: "Email đã tồn tại trong hệ thống" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, age, email, address },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({ message: "Cập nhật người dùng thành công", data: updatedUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API: Xóa người dùng
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
