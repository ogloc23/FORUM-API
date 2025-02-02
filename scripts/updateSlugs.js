import mongoose from 'mongoose';
import Topic from '../src/models/Topic.js'; // Adjust path based on your structure

const updateSlugs = async () => {
  try {
    await mongoose.connect("mongodb+srv://vj1502003:victor2003@meghee-backend-academy.i162e.mongodb.net/?retryWrites=true&w=majority&appName=Meghee-Backend-Academy", {});

    const topics = await Topic.find();
    for (const topic of topics) {
      topic.slug = topic.title.toLowerCase().replace(/\s+/g, '-'); // Generate slug from title
      await topic.save();
    }

    console.log('✅ Slugs updated successfully');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error updating slugs:', error);
    mongoose.connection.close();
  }
};

updateSlugs();
