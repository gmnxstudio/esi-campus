const fs = require('fs');
const path = require('path');

async function generate() {
    try {
        const sharp = require('sharp');
        const sourcePath = "C:\\Users\\INTEL\\.gemini\\antigravity\\brain\\640f5023-8977-4d80-b9cd-e8e6fb88f3b5\\app_icon_512_1772685137502.png";
        const outputDir = path.join(__dirname, '..', 'public', 'icons');
        const publicDir = path.join(__dirname, '..', 'public');
        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const srcBuffer = fs.readFileSync(sourcePath);

        for (const size of sizes) {
            const outPath = path.join(outputDir, `icon-${size}x${size}.png`);
            await sharp(srcBuffer).resize(size, size).png().toFile(outPath);
            console.log(`✅ icon-${size}x${size}.png`);
        }

        // PWA Apple Touch Icon
        await sharp(srcBuffer).resize(180, 180).png().toFile(path.join(outputDir, 'apple-touch-icon.png'));
        await sharp(srcBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
        console.log(`✅ apple-touch-icon.png`);

        // Favicon
        await sharp(srcBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
        await sharp(srcBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
        console.log(`✅ favicon.png & favicon.ico`);

        console.log('\nAll icons generated successfully!');
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

generate();
