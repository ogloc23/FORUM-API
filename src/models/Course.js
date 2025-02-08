import mongoose from "mongoose";
import slugify from "slugify";

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic", // Reference to the Topic model
      },
    ],
  },
  { timestamps: true } // Automatically create createdAt and updatedAt fields
);

CourseSchema.pre("save", function (next) {
  if (this.isModified("title")) { // Fixed typo
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Course = mongoose.model("Course", CourseSchema);

export default Course;
