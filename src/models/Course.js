import mongoose from 'mongoose';
import slugify from 'slugify';

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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Automatically create createdAt and updatedAt fields
);

CourseSchema.pre('save', function (next) {
  if (this.isModified('tittle')) {
    this.slug = slugify(this.title, { lower: true, strict:true });
  }
  next();
});




const Course = mongoose.model('Course', CourseSchema);

export default Course;
