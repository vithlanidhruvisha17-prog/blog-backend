const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require('dns');
const postRoutes = require('./routes/postRoutes');

dns.setServers(["1.1.1.1" , "8.8.8.8"]);
dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', postRoutes);
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/uploads', express.static('uploads'));

console.log("Connecting to:", process.env.MONGO_URI); 

mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 15000 
})
.then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    console.log("🚀 Connection Host:", mongoose.connection.host);
})
.catch(err => {
    console.log("❌ DB Connection Error Details:", err.message);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));