const mongoose = require('mongoose');

const mongoose = require('mongoose');

// Testing the NEW dedicated user
const PASSWORD = 'app_password';
const USER = 'app_user';
const HOST = 'mongodb';
const TARGET_DB = 'totalgrind';

// Strategies to test
const strategies = [
    {
        name: 'Dedicated User Strategy',
        // No authSource needed because user is created IN the target DB
        uri: `mongodb://${USER}:${PASSWORD}@${HOST}:27017/${TARGET_DB}`,
        options: { serverSelectionTimeoutMS: 5000 }
    }
];

async function testStrategy(strategy) {
    console.log(`\n--- ${strategy.name} ---`);
    console.log(`URI: ${strategy.uri.replace(PASSWORD, '****')}`);
    console.log(`Options:`, strategy.options);

    try {
        await mongoose.connect(strategy.uri, strategy.options);
        console.log('✅ SUCCESS');
        await mongoose.disconnect();
        return true;
    } catch (err) {
        console.log('❌ FAILED');
        console.log('Error:', err.message);
        return false;
    }
}

async function run() {
    console.log('Starting Multi-Strategy Connectivity Test...');

    let success = false;
    for (const s of strategies) {
        if (await testStrategy(s)) {
            success = true;
            console.log('\n!!! FOUND WORKING STRATEGY !!!');
            console.log('Use this configuration in your code.');
            break;
        }
    }

    if (!success) {
        console.log('\n❌ ALL STRATEGIES FAILED. Network or Server issue likely.');
    }
    process.exit(success ? 0 : 1);
}

run();
