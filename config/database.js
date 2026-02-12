const mongoose = require('mongoose');
const dns = require('node:dns/promises');
require('dotenv').config();
dns.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.53']);
const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        console.log('MongoDB URI:', process.env.MONGODB_URI);
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
        console.log('Database:', conn.connection.name);
        console.log('Connection state: Ready');
    } catch (error) {
        console.error('MongoDB Atlas connection failed:', error.message);
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        if (error.name === 'MongooseServerSelectionError') {
            console.error('\n=== MONGODB ATLAS CONNECTION TROUBLESHOOTING ===');
            console.error('1. Check IP whitelist in MongoDB Atlas Dashboard');
            console.error('2. Verify cluster is running and not paused');
            console.error('3. Check network connectivity and firewall settings');
            console.error('4. Try using direct connection string format');
            console.error('5. Check if MongoDB Atlas cluster name matches connection string');
            console.error('6. Verify DNS resolution: nslookup cluster0.nwh9ggm.mongodb.net');
            console.error('=== END TROUBLESHOOTING ===\n');
        }
        process.exit(1);
    }
};
module.exports = connectDB;
