import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://vj1502003:victor2003@meghee-backend-academy.i162e.mongodb.net/?retryWrites=true&w=majority&appName=Meghee-Backend-Academy"; // Change this if using MongoDB Atlas

mongoose.connect(MONGO_URI, {

});

const replySchema = new mongoose.Schema({
  updatedAt: Date,
});

const Reply = mongoose.model("Reply", replySchema, "replies");

async function updateReplies() {
  try {
    const result = await Reply.updateMany({}, { $set: { updatedAt: new Date() } });
    console.log("Updated replies:", result);
  } catch (error) {
    console.error("Error updating replies:", error);
  } finally {
    mongoose.connection.close();
  }
}

updateReplies();
