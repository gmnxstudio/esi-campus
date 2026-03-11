const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match) {
        envConfig[match[1]] = match[2].trim();
    }
});

const url = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const key = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || envConfig['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(url, key);

const baseColors = [
    "#c8a97e", // Latte
    "#e8a5a5", // Rose
    "#a5c8a5", // Sage
    "#a5b8e8", // Sky
    "#c4a5e8", // Lavender
    "#e8c4a5", // Peach
    "#a5e8cc", // Mint
    "#a5b5c8"  // Slate
];

function getColor(subject) {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % baseColors.length;
    return baseColors[idx];
}

const classesToInsert = [
    // === Selasa (Tuesday) = 2 ===
    {
        subject: "MANAJEMEN KEUANGAN DAN INVESTASI",
        day_of_week: 2,
        start_time: "09:45:00",
        end_time: "11:35:00",
        room: "EA 04.03",
        color_code: getColor("MANAJEMEN KEUANGAN DAN INVESTASI")
    },
    {
        subject: "DIGITAL TRANSFORMATION OF INDUSTRY",
        day_of_week: 2,
        start_time: "13:00:00",
        end_time: "15:45:00",
        room: "EA 03.05",
        color_code: getColor("DIGITAL TRANSFORMATION OF INDUSTRY")
    },
    {
        subject: "SISTEM INFORMASI MANAJEMEN",
        day_of_week: 2,
        start_time: "15:45:00",
        end_time: "17:35:00",
        room: "EA 04.04",
        color_code: getColor("SISTEM INFORMASI MANAJEMEN")
    },
    // === Rabu (Wednesday) = 3 ===
    {
        subject: "PENGANTAR AKUNTANSI BIAYA (205009)",
        day_of_week: 3,
        start_time: "07:00:00",
        end_time: "09:45:00",
        room: "EC 03.03",
        color_code: getColor("PENGANTAR AKUNTANSI BIAYA (205009)")
    },
    {
        subject: "PEMASARAN MEDIA SOSIAL",
        day_of_week: 3,
        start_time: "15:45:00",
        end_time: "18:30:00",
        room: "EA 02.04",
        color_code: getColor("PEMASARAN MEDIA SOSIAL")
    },
    // === Kamis (Thursday) = 4 ===
    {
        subject: "MANAJEMEN KEUANGAN DAN INVESTASI",
        day_of_week: 4,
        start_time: "09:45:00",
        end_time: "11:35:00",
        room: "EA 03.06",
        color_code: getColor("MANAJEMEN KEUANGAN DAN INVESTASI")
    },
    {
        subject: "KEPEMIMPINAN TRANSFORMASIONAL",
        day_of_week: 4,
        start_time: "13:00:00",
        end_time: "15:45:00",
        room: "PS 01.03",
        color_code: getColor("KEPEMIMPINAN TRANSFORMASIONAL")
    },
    {
        subject: "Pendidikan Agama Kristen",
        day_of_week: 4,
        start_time: "15:45:00",
        end_time: "18:30:00",
        room: "EC 04.04",
        color_code: getColor("Pendidikan Agama Kristen")
    },
    // === Jumat (Friday) = 5 ===
    {
        subject: "RISET PEMASARAN",
        day_of_week: 5,
        start_time: "13:00:00",
        end_time: "15:45:00",
        room: "EC 02.03",
        color_code: getColor("RISET PEMASARAN")
    }
];

async function run() {
    console.log(`Starting to insert ${classesToInsert.length} classes...`);

    // Clear existing for clean slate? No, let's just insert. Or delete all classes first since it's "semester ini akan selalau mengambil kelas ini"? 
    // Wait, the user said "masukan semua jadwal ini kedalam sistem ... semester ini akan selalau mengambil kelas ini". I'll clear the table first to avoid duplicate dummy data.

    console.log('Clearing existing classes...');
    await supabase.from('classes').delete().neq('id', '0'); // Delete all

    for (const c of classesToInsert) {
        const { error } = await supabase.from('classes').insert(c);
        if (error) {
            console.error('Error inserting:', c.subject, error.message);
        } else {
            console.log(`✅ Success: ${c.subject} (${c.room})`);
        }
    }
    console.log('Done!');
}

run();
