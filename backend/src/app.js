require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const qRoutes = require('./routes/question.routes');
const examRoutes = require('./routes/exam.routes');
const attemptRoutes = require('./routes/attempt.routes');
const courseRoutes = require('./routes/course.routes');
const supportRoutes = require('./routes/support.routes');

const app = express();
app.use(cors());
app.use(express.json());

// connect DB
connectDB();

// routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', qRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/support', supportRoutes);

// health
app.get('/', (req,res) => res.send('EduMaster API OK'));

module.exports = app;
