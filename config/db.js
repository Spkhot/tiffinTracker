const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // await will "wait" for the connection to finish
    await mongoose.connect(process.env.MONGO_URI);

    // If the line above doesn't throw an error, it means we connected successfully
    console.log('MongoDB connected...');

  } catch (err) {
    // If anything goes wrong during connection, it will be "caught" here
    console.error(err.message);
    process.exit(1); // Optional: Exit the process with failure
  }
};

module.exports = connectDB;