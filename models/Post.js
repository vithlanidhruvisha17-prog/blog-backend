const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },

    media: [{ 
        url: String,      
        resourceType: String 
    }],
    
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);