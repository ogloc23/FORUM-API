import mongoose from 'mongoose';
import Course from './models/Course.js';

const courses = [
  { title: 'JavaScript', description: 'Ask questions and share tips for JavaScript, jQuery, React, Node, D3 - anything that touches the vast JavaScript and npm ecosystem.' },
  { title: 'Python', description: 'Ask questions and share tips related to Python and any tools in the Python ecosystem.' },
  { title: 'HTML-CSS', description: 'Ask about anything related to HTML and CSS, including web design tools like Sass and Bootstrap' },
  { title: 'Backend Development', description: 'Discuss Linux, SQL, Git, Node.js / Django, Docker, NGINX, and any sort of database / server tools.'},
  { title: 'C#', description: 'Ask questions and share tips related to C# and any tools in the .NET ecosystem.'},
];

const seedCourses = async () => {
  try {
    await mongoose.connect("mongodb+srv://vj1502003:victor2003@meghee-backend-academy.i162e.mongodb.net/?retryWrites=true&w=majority&appName=Meghee-Backend-Academy", {});

    for (const course of courses) {
      const existingCourse = await Course.findOne({ title: course.title });
      if (!existingCourse) {
        const newCourse = new Course(course);
        await newCourse.save();
      }
    }

    console.log('Courses seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding courses:', error);
    process.exit(1);
  }
};

seedCourses();
