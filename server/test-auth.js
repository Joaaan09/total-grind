const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

console.log('--- DIAGNOSTIC START ---');
console.log('Node Version:', process.version);
try {
    console.log('Mongoose Version:', require('mongoose/package.json').version);
} catch (e) {
    console.log('Mongoose Version: unknown');
}
console.log('URI Defined:', !!MONGO_URI);

if (MONGO_URI) {
    // Mask password carefully
    const masked = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
    console.log('Target URI:', masked);
} else {
    console.error('CRITICAL: MONGO_URI is missing!');
}

async function run() {
    if (!MONGO_URI) process.exit(1);

    try {
        console.log('Attempting connection...');
        await mongoose.connect(MONGO_URI, {
            authSource: 'admin',
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected successfully!');

        const admin = new mongoose.mongo.Admin(mongoose.connection.db);
        const info = await admin.buildInfo();
        console.log('Remote MongoDB Version:', info.version);

        process.exit(0);
    } catch (err) {
        console.error('❌ Connection Failed');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        console.error('Code:', err.code);
        console.error('CodeName:', err.codeName);
        if (err.cause) console.error('Cause:', err.cause);
        process.exit(1);
    }
}

run();
