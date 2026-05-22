const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const actualToken = token.split(" ")[1];
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        
        console.log("Decoded Token Data:", decoded); 

        req.user = decoded.user ? decoded.user : decoded; 
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid Token" });
    }
};