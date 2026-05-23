const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'blog_media',
        resource_type: 'auto', 
        allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov']
    },
});

const upload = multer({ storage: storage });

router.get('/test', (req, res) => res.send("Routes are working!"));

// 1. Saari posts fetch karne wala route (Updated with populate)
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = { title: { $regex: search, $options: 'i' } };
        }

        const posts = await Post.find(query)
            .populate('author', 'username')
            .populate('likes', 'username') // ✨ Like karne walo ka naam manga liya
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: "Error fetching posts" });
    }
});

// 2. Apni posts fetch karne wala route (Yahan change chahiye tha aapko!)
router.get('/my-posts', auth, async (req, res) => {
    try {
        // Token se aane wali string ID
        const userId = req.user.id || req.user._id; 
        console.log("Searching posts for User ID:", userId);

        if (!userId) {
            return res.status(400).json({ message: "Token mein user ID nahi mili" });
        }

        // ✨ .populate('likes', 'username') laga diya taaki ID ki jagah naam aaye
        const posts = await Post.find({ 
            author: new mongoose.Types.ObjectId(userId) 
        })
        .populate('author', 'username')
        .populate('likes', 'username') 
        .sort({ createdAt: -1 });
        
        console.log(`Query Success: Found ${posts.length} posts for this user`);
        res.json(posts);
    } catch (err) {
        console.error("Database Query Fail:", err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// 3. Single post fetch karne wala route (Updated with populate)
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username')
            .populate('likes', 'username'); // ✨ Idhar bhi add kar diya safety ke liye
            
        if (!post) return res.status(404).json({ message: "Post nahi mila!" });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: "Invalid ID format" });
    }
});

router.post('/create', auth, upload.array('files', 5), async (req, res) => {
    try {
        const { title, content } = req.body;
        
        const mediaFiles = req.files.map(file => ({
            url: file.path,
            resourceType: file.mimetype.startsWith('video') ? 'video' : 'image'
        }));

        const newPost = new Post({ 
            title, 
            content, 
            media: mediaFiles, 
            author: req.user.id 
        });

        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ message: "Cloudinary upload fail ho gaya!" });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post nahi mila!" });
        if (post.author.toString() !== req.user.id) return res.status(401).json({ message: "Unauthorized" });
        post = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

router.put('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post.likes.includes(req.user.id)) {
            post.likes = post.likes.filter(id => id.toString() !== req.user.id);
        } else {
            post.likes.push(req.user.id);
        }
        await post.save();
        
        // ✨ Like karne ke baad bhi updated populated data bhej rahe hain
        const updatedPost = await Post.findById(req.params.id).populate('likes', 'username');
        res.json(updatedPost.likes);
    } catch (err) { res.status(500).json("Error liking post"); }
});

router.post('/:id/comment', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const newComment = {
            user: req.user.id,
            username: req.user.username,
            text: req.body.text
        };
        post.comments.push(newComment);
        await post.save();
        res.json(post.comments);
    } catch (err) { res.status(500).json("Error commenting"); }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post nahi mila!" });
        if (post.author.toString() !== req.user.id) return res.status(401).json({ message: "Unauthorized" });
        await post.deleteOne();
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

module.exports = router;