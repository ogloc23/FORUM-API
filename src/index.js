import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./graphql/schemas.js";
import { resolvers } from "./graphql/resolvers.js";
import { protect } from "./utils/auth.js";
import jwt from "jsonwebtoken";
import  Topic  from "./models/Topic.js";
import  User  from "./models/User.js";
import  Course  from "./models/Course.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit the process if the DB connection fails
  }
};

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    let user = null;

    // Protecting the route with JWT token
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1]; // Extract token from headers
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }

    return { user, models: { Topic, User, Course } }; // ✅ Adding models to context
  },
});

// Start the server
const startServer = async () => {
  await connectDB(); // Establish MongoDB connection first
  await server.start(); // Start Apollo server
  server.applyMiddleware({ app }); // Apply Apollo Server middleware to Express

  app.listen(port, () => {
    console.log(
      `🚀 Server is running at http://localhost:${port}${server.graphqlPath}`
    );
  });
};

// Start the application
startServer();
