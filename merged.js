const fs = require('fs');

const [, , path_srt] = process.argv;

if (!path_srt) {
  console.error('❌ Usage: node merged.js path_to_srt');
  process.exit(1);
}

function parseSRT(file) {
  const content = fs.readFileSync(file, 'utf-8');
  return content.split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);
}

// ⏱️ Fungsi untuk mengubah string waktu jadi detik
function timeToSeconds(timeStr) {
  const [h, m, s] = timeStr.split(':');
  const [sec, ms] = s.split(',');
  return Number(h) * 3600 + Number(m) * 60 + Number(sec) + Number(ms) / 1000;
}

// 🕒 Cari detik awal dari subtitle pertama
function getFirstStartTime(blocks) {
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length >= 2) {
      const match = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})/);
      if (match) {
        return timeToSeconds(match[1]);
      }
    }
  }
  return 25; // default fallback
}

// 🔍 Fungsi untuk mencari gap waktu >= 30 detik
function findTimeGaps(blocks, minGapSeconds = 30) {
  const gaps = [];
  
  for (let i = 0; i < blocks.length - 1; i++) {
    const currentBlock = blocks[i];
    const nextBlock = blocks[i + 1];
    
    const currentLines = currentBlock.split(/\r?\n/);
    const nextLines = nextBlock.split(/\r?\n/);
    
    if (currentLines.length >= 2 && nextLines.length >= 2) {
      // Ambil waktu selesai dari subtitle saat ini
      const currentTimeMatch = currentLines[1].match(/\d{2}:\d{2}:\d{2},\d{3} --> (\d{2}:\d{2}:\d{2},\d{3})/);
      // Ambil waktu mulai dari subtitle berikutnya  
      const nextTimeMatch = nextLines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (currentTimeMatch && nextTimeMatch) {
        const currentEndTime = timeToSeconds(currentTimeMatch[1]);
        const nextStartTime = timeToSeconds(nextTimeMatch[1]);
        const gap = nextStartTime - currentEndTime;
        
        if (gap >= minGapSeconds) {
          gaps.push({
            position: i + 1, // Posisi untuk insert (setelah subtitle ke-i)
            currentIndex: i,
            nextIndex: i + 1,
            currentEndTime: currentEndTime,
            nextStartTime: nextStartTime,
            gapDuration: gap,
            currentSubtitle: currentLines.slice(2).join('\n'), // Text subtitle saat ini
            nextSubtitle: nextLines.slice(2).join('\n') // Text subtitle berikutnya
          });
        }
      }
    }
  }
  
  return gaps;
}

// 🎯 Fungsi untuk insert subtitle ke dalam gap
function insertSubtitleInGap(blocks, gapInfo, newSubtitleText) {
  const startTime = gapInfo.currentEndTime + 1; // Mulai 1 detik setelah subtitle sebelumnya
  const endTime = Math.min(startTime + 15, gapInfo.nextStartTime - 1); // Durasi 5 detik atau hingga 1 detik sebelum subtitle berikutnya
  
  // Format waktu
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };
  
  const newSubtitle = [
    '0', // Nomor akan di-renumber nanti
    `${formatTime(startTime)} --> ${formatTime(endTime)}`,
    newSubtitleText
  ].join('\n');
  
  // Insert subtitle baru
  const newBlocks = [...blocks];
  newBlocks.splice(gapInfo.position, 0, newSubtitle);
  
  // Renumber semua subtitle
  return newBlocks.map((block, i) => {
    const lines = block.split(/\r?\n/);
    lines[0] = String(i + 1);
    return lines.join('\n');
  });
}

// 📊 Fungsi untuk menampilkan semua gap yang ditemukan
function showTimeGaps(file) {
  const blocks = parseSRT(file);
  const gaps = findTimeGaps(blocks);
  
  console.log(`\n🔍 Ditemukan ${gaps.length} gap waktu >= 25 detik:\n`);
  
  gaps.forEach((gap, index) => {
    console.log(`${index + 1}. Gap ${gap.gapDuration.toFixed(1)} detik`);
    console.log(`   Posisi: Setelah subtitle #${gap.currentIndex + 1}`);
    console.log(`   Waktu: ${gap.currentEndTime.toFixed(1)}s → ${gap.nextStartTime.toFixed(1)}s`);
    console.log(`   Subtitle sebelum: "${gap.currentSubtitle}"`);
    console.log(`   Subtitle sesudah: "${gap.nextSubtitle}"`);
    console.log('');
  });
  
  return gaps;
}

// 🔄 Ubah durasi promosi.srt
function adjustPromoDuration(promoBlock, endSeconds) {
  const lines = promoBlock.split(/\r?\n/);
  if (lines.length < 2) return promoBlock;

  const start = "00:00:00,000";
  const endSec = Math.min(endSeconds, 25); // maksimal 25 detik
  const sec = Math.floor(endSec);
  const ms = Math.floor((endSec - sec) * 1000);
  const end = `00:00:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  lines[1] = `${start} --> ${end}`;

  return lines.join('\n');
}

// 🔄 Proses utama
const blocks1 = parseSRT('promosi.srt');
const blocks2 = parseSRT(path_srt);

const firstStart = getFirstStartTime(blocks2);
const promoFixed = adjustPromoDuration(blocks1[0], firstStart);

// Gabungkan dan renumber
const merged = [promoFixed, ...blocks2]
  .map((block, i) => {
    const lines = block.split(/\r?\n/);
    lines[0] = String(i + 1);
    return lines.join('\n');
  });

fs.writeFileSync(path_srt, merged.join('\n\n'), 'utf-8');

const gaps = showTimeGaps(path_srt);

if(gaps.length > 3) gaps.splice(0, gaps.length - 3);

if (gaps.length > 0) {
  let blocks = parseSRT(path_srt);
  
  for (let i = gaps.length - 1; i >= 0; i--) {
    const gap = gaps[i];
    console.log(i);
    blocks = insertSubtitleInGap(blocks, gap, "Join Channel telegram @dongworld agar tidak ketinggalan update.");
    console.log(`✅ Subtitle berhasil disisipkan pada gap ${i + 1} (${gap.gapDuration.toFixed(1)} detik)!`);
  }

  console.log(`🎉 Total ${gaps.length} subtitle promosi berhasil disisipkan!`);

  fs.writeFileSync(path_srt, blocks.join('\n\n'), 'utf-8');
}

console.log(`✅ Merged SRT with dynamic promo duration written to ${path_srt}`);
