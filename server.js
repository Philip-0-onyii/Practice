
// Simple Blogging API (Student Version)
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/simple_blog_api');

// User Schema
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  password: String
});
const User = mongoose.model('User', userSchema);

// Blog Schema
const blogSchema = new mongoose.Schema({
  title: { type: String, unique: true },
  description: String,
  author: String,
  state: { type: String, default: 'draft' },
  read_count: { type: Number, default: 0 },
  reading_time: Number,
  tags: [String],
  body: String,
  timestamp: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', blogSchema);

// Reading time calculator
function readingTime(text) {
  const words = text.split(' ').length;
  return Math.ceil(words / 200);
}

// Register
app.post('/signup', function(req, res) {
  const { first_name, last_name, email, password } = req.body;
  bcrypt.hash(password, 10, function(err, hash) {
    if (err) return res.send(err);
    const user = new User({ first_name, last_name, email, password: hash });
    user.save(function(err) {
      if (err) return res.send(err);
      res.send('User registered successfully');
    });
  });
});

// Login
app.post('/login', function(req, res) {
  const { email, password } = req.body;
  User.findOne({ email }, function(err, user) {
    if (err || !user) return res.send('User not found');
    bcrypt.compare(password, user.password, function(err, result) {
      if (!result) return res.send('Wrong password');
      const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1h' });
      res.send({ message: 'Login successful', token });
    });
  });
});

// Verify token middleware
function verify(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.send('No token');
  jwt.verify(token, 'secretkey', function(err, decoded) {
    if (err) return res.send('Invalid token');
    req.userId = decoded.id;
    next();
  });
}

// Create blog
app.post('/blogs', verify, function(req, res) {
  const { title, description, tags, body } = req.body;
  const blog = new Blog({
    title, description, tags, body, author: req.userId,
    reading_time: readingTime(body)
  });
  blog.save(function(err) {
    if (err) return res.send(err);
    res.send('Blog created in draft');
  });
});

// Publish blog
app.put('/blogs/publish/:id', verify, function(req, res) {
  Blog.findByIdAndUpdate(req.params.id, { state: 'published' }, function(err) {
    if (err) return res.send(err);
    res.send('Blog published');
  });
});

// Get all published blogs
app.get('/blogs', function(req, res) {
  Blog.find({ state: 'published' }, function(err, blogs) {
    if (err) return res.send(err);
    res.send(blogs);
  });
});

// Get single blog
app.get('/blogs/:id', function(req, res) {
  Blog.findById(req.params.id, function(err, blog) {
    if (err || !blog) return res.send('Not found');
    blog.read_count += 1;
    blog.save(function() {
      res.send(blog);
    });
  });
});

// User blogs
app.get('/myblogs', verify, function(req, res) {
  Blog.find({ author: req.userId }, function(err, blogs) {
    if (err) return res.send(err);
    res.send(blogs);
  });
});

// Update blog
app.put('/blogs/:id', verify, function(req, res) {
  Blog.findByIdAndUpdate(req.params.id, req.body, function(err) {
    if (err) return res.send(err);
    res.send('Blog updated');
  });
});

// Delete blog
app.delete('/blogs/:id', verify, function(req, res) {
  Blog.findByIdAndDelete(req.params.id, function(err) {
    if (err) return res.send(err);
    res.send('Blog deleted');
  });
});

app.listen(3000, function() {
  console.log('Simple Blog API running on port 3000');
});
