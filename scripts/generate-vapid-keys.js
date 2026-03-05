// Script to generate VAPID keys for Web Push
// Run with: node scripts/generate-vapid-keys.js

const webPush = require("web-push");

const keys = webPush.generateVAPIDKeys();

console.log("\n🔑 VAPID Keys Generated!\n");
console.log("Add these to your .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:praishe@campus.app`);
console.log("\n⚠️  Keep your VAPID_PRIVATE_KEY secret!\n");
