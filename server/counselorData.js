// ============================================================================
// SociaCare AI - Data Topik, Skenario 11 Layar UI/UX, Tips Sosial, & Artikel
// ============================================================================

const TOPICS = [
  {
    id: 'friendship',
    title: 'Hubungan Pertemanan yang Tidak Sehat',
    shortTitle: 'Hubungan Pertemanan',
    screenNumber: 5,
    description: 'Merasa dijauhi teman, hubungan pertemanan toksik, atau merasa tidak dianggap di lingkaran pertemanan.',
    greeting:
      'Terima kasih sudah memilih topik ini. Boleh ceritakan lebih detail, apa yang sedang kamu alami?',
    exampleUserFirst:
      'Aku merasa teman-temanku mulai menjauh dan aku merasa tidak dianggap.',
    probingQuestion:
      'Aku mengerti. Sejak kapan kamu merasakan hal tersebut?',
    generalSolution: {
      intro: 'Aku paham perasaanmu. Berikut beberapa hal yang bisa kamu lakukan:',
      checklist: [
        'Sampaikan perasaanmu secara baik-baik.',
        'Coba bangun komunikasi yang lebih terbuka.',
        'Cari teman yang saling mendukung.',
        'Jika berlanjut, jangan ragu untuk cerita ke guru BK.',
      ],
      footer: 'Menurut kamu, langkah mana yang paling sesuai?',
      quickReplies: [
        'Sampaikan perasaan baik-baik',
        'Bangun komunikasi terbuka',
        'Cari teman yang mendukung',
        'Cerita ke Guru BK',
      ],
    },
    topicSpecificSolution: {
      intro: 'Bagus! Ingat, pertemanan yang sehat adalah yang saling menghargai dan mendukung, ya.',
      checklist: [],
      tipBox: {
        title: 'Tips Tambahan:',
        text: 'Jangan takut untuk menyampaikan perasaanmu dengan cara yang sopan.',
      },
      footer: 'Ada hal lain yang ingin kamu tanyakan?',
      quickReplies: ['Masih ada', 'Tidak, cukup'],
    },
  },
  {
    id: 'communication',
    title: 'Komunikasi Efektif',
    shortTitle: 'Komunikasi',
    screenNumber: 6,
    description: 'Kesulitan menyampaikan pendapat, takut salah bicara, atau sering terjadi salah paham dengan teman.',
    greeting:
      'Terima kasih sudah memilih topik ini. Boleh ceritakan lebih detail, apa yang sedang kamu alami?',
    exampleUserFirst:
      'Aku sering bingung dan gugup kalau mau menyampaikan pendapat ke teman-temanku.',
    probingQuestion:
      'Aku mengerti. Sejak kapan kamu merasakan kesulitan saat berbicara dengan mereka?',
    generalSolution: {
      intro: 'Aku paham perasaanmu. Berikut beberapa hal yang bisa kamu lakukan:',
      checklist: [
        'Sampaikan perasaanmu secara baik-baik.',
        'Coba bangun komunikasi yang lebih terbuka.',
        'Cari teman yang saling mendukung.',
        'Jika berlanjut, jangan ragu untuk cerita ke guru BK.',
      ],
      footer: 'Menurut kamu, langkah mana yang paling sesuai?',
      quickReplies: [
        'Coba komunikasi lebih terbuka',
        'Berlatih bicara pelan-pelan',
        'Minta contoh kalimat sopan',
      ],
    },
    topicSpecificSolution: {
      intro: 'Komunikasi yang baik bisa dimulai dari hal sederhana, misalnya:',
      checklist: [
        'Gunakan bahasa yang jelas dan sopan.',
        'Dengarkan lawan bicara hingga selesai.',
        'Hindari memotong pembicaraan.',
      ],
      tipBox: {
        title: 'Tips Tambahan:',
        text: 'Gunakan kalimat "Aku merasa..." daripada menyalahkan lawan bicara agar temanmu lebih mudah menerima.',
      },
      footer: 'Kalau kamu mau, aku juga bisa kasih contoh kalimatnya!',
      quickReplies: ['Beri contoh kalimatnya', 'Masih ada', 'Tidak, cukup'],
    },
  },
  {
    id: 'confidence',
    title: 'Kepercayaan Diri',
    shortTitle: 'Kepercayaan Diri',
    screenNumber: 7,
    description: 'Merasa minder, takut tampil di depan kelas, atau sering membandingkan diri sendiri dengan orang lain.',
    greeting:
      'Terima kasih sudah memilih topik ini. Boleh ceritakan lebih detail, apa yang sedang kamu alami?',
    exampleUserFirst:
      'Aku merasa kurang percaya diri saat harus berbicara atau tampil di depan teman-teman.',
    probingQuestion:
      'Aku mengerti. Sejak kapan kamu merasakan hal tersebut, dan di situasi apa biasanya muncul?',
    generalSolution: {
      intro: 'Aku paham perasaanmu. Berikut beberapa hal yang bisa kamu lakukan:',
      checklist: [
        'Sampaikan perasaanmu secara baik-baik.',
        'Coba bangun komunikasi yang lebih terbuka.',
        'Cari teman yang saling mendukung.',
        'Jika berlanjut, jangan ragu untuk cerita ke guru BK.',
      ],
      footer: 'Menurut kamu, langkah mana yang paling sesuai?',
      quickReplies: [
        'Kenali kelebihan diriku',
        'Berani mencoba hal kecil',
        'Cari teman yang mendukung',
      ],
    },
    topicSpecificSolution: {
      intro: 'Rasa kurang percaya diri itu wajar, kok. Kamu bisa mulai dengan:',
      checklist: [
        'Kenali kelebihanmu.',
        'Berani mencoba hal baru sedikit demi sedikit.',
        'Fokus pada proses, bukan hasil sempurna.',
      ],
      tipBox: {
        title: 'Tips Tambahan:',
        text: 'Catat 3 hal kecil yang berhasil kamu lakukan setiap hari untuk melatih apresiasi diri.',
      },
      footer: 'Ingat, kamu punya potensi yang besar! 💙',
      quickReplies: ['Masih ada', 'Tidak, cukup'],
    },
  },
  {
    id: 'bullying',
    title: 'Mencegah Bullying',
    shortTitle: 'Bullying',
    screenNumber: 8,
    description: 'Mengalami atau melihat tindakan perundungan (ejekan, pengucilan, cyberbullying) di lingkungan sekolah.',
    greeting:
      'Terima kasih sudah memilih topik ini. Boleh ceritakan lebih detail, apa yang sedang kamu alami?',
    exampleUserFirst:
      'Aku melihat ada teman yang sering diejek di kelas dan aku takut hal itu juga terjadi padaku.',
    probingQuestion:
      'Aku mengerti. Sejak kapan kamu melihat atau merasakan hal tersebut?',
    generalSolution: {
      intro: 'Aku paham perasaanmu. Berikut beberapa hal yang bisa kamu lakukan:',
      checklist: [
        'Sampaikan perasaanmu secara baik-baik.',
        'Coba bangun komunikasi yang lebih terbuka.',
        'Cari teman yang saling mendukung.',
        'Jika berlanjut, jangan ragu untuk cerita ke guru BK.',
      ],
      footer: 'Menurut kamu, langkah mana yang paling sesuai?',
      quickReplies: [
        'Dukung teman yang jadi korban',
        'Cerita & lapor ke Guru BK',
        'Jaga keamanan diri & teman',
      ],
    },
    topicSpecificSolution: {
      intro: 'Bullying bukanlah hal yang bisa dibenarkan. Kamu bisa:',
      checklist: [
        'Tidak ikut menertawakan.',
        'Mendukung teman yang menjadi korban.',
        'Melaporkan ke guru BK jika melihatnya.',
        'Menjaga lingkungan sekolah tetap aman.',
      ],
      tipBox: {
        title: 'Tips Tambahan:',
        text: 'Menyimpan bukti dan bercerita ke orang dewasa terpercaya (Guru BK/Orang Tua) adalah langkah berani, bukan mengadu.',
      },
      footer: 'Kamu tidak sendirian, ya! 💙',
      quickReplies: ['Masih ada', 'Tidak, cukup'],
    },
  },
];

const REFLECTION_CLOSING = {
  intro:
    'Terima kasih sudah berbagi cerita hari ini. Semoga percakapan ini membantu kamu memahami permasalahan dan menemukan langkah yang tepat. 💙',
  checklist: [],
  footer:
    'Jika masih merasa kesulitan, jangan ragu untuk menghubungi guru BK, ya. Kamu berharga!',
  quickReplies: ['Lihat Pesan Akhir 💙', 'Buka Fitur Lainnya', 'Hubungi Guru BK'],
  isClosing: true,
};

const SOCIAL_TIPS = [
  {
    id: 'tip-1',
    category: 'Hubungan Pertemanan',
    title: 'Mengenali Ciri Pertemanan yang Sehat',
    summary: 'Jangan takut untuk menyampaikan perasaanmu dengan cara yang sopan.',
    points: [
      'Teman yang baik menghargai batasan pribadimu dan tidak memaksamu melakukan hal yang membuatmu tidak nyaman.',
      'Saat terjadi kesalahpahaman, bicarakan secara empat mata dengan tenang.',
      'Kualitas pertemanan jauh lebih penting daripada jumlah teman yang banyak namun membuatmu lelah mental.',
    ],
  },
  {
    id: 'tip-2',
    category: 'Komunikasi Efektif',
    title: 'Rumus Komunikasi "I-Message" (Pesan Aku)',
    summary: 'Gunakan bahasa yang jelas, sopan, dan dengarkan lawan bicara hingga selesai.',
    points: [
      'Awali dengan "Aku merasa..." bukan "Kamu selalu...", contoh: "Aku merasa sedih saat pembicaraanku dipotong."',
      'Jaga kontak mata yang ramah dan nada suara yang tenang.',
      'Hindari memotong pembicaraan dan berikan respon singkat bahwa kamu menyimak.',
    ],
  },
  {
    id: 'tip-3',
    category: 'Kepercayaan Diri',
    title: 'Langkah Kecil Membangun Percaya Diri di Sekolah',
    summary: 'Fokus pada proses perkembangan dirimu, bukan pada hasil yang harus sempurna.',
    points: [
      'Kenali minimal 3 kelebihan unik yang kamu miliki di bidang akademik maupun non-akademik.',
      'Berani mencoba hal baru sedikit demi sedikit, misalnya bertanya satu hal di kelas.',
      'Berhenti membandingkan proses belajarmu dengan pencapaian orang lain di media sosial.',
    ],
  },
  {
    id: 'tip-4',
    category: 'Mencegah Bullying',
    title: 'Menjadi "Upstander" untuk Mencegah Bullying',
    summary: 'Bullying bukanlah hal yang bisa dibenarkan. Kamu tidak sendirian!',
    points: [
      'Tidak ikut menertawakan atau menyebarkan ejekan baik secara langsung maupun di grup chat.',
      'Dampingi dan ajak bicara teman yang terlihat dikucilkan agar ia tahu ia tidak sendirian.',
      'Segera laporkan ke Guru BK secara rahasia jika melihat tindakan perundungan.',
    ],
  },
];

const ARTICLES = [
  {
    id: 'art-1',
    category: 'Hubungan Pertemanan',
    readTime: '3 Menit Baca',
    title: 'Merasa Dijauhi Teman? Ini Cara Menghadapinya Tanpa Panik',
    excerpt:
      'Perubahan dinamika pertemanan di sekolah adalah hal yang sering terjadi. Yuk pahami langkah bijak menyikapinya.',
    content: [
      'Pernahkah kamu merasa teman-teman dekatmu tiba-tiba terlihat sibuk sendiri atau jarang mengajakmu mengobrol? Perasaan sedih, bingung, dan merasa tidak dianggap sangat wajar muncul dalam situasi ini.',
      'Langkah pertama yang bisa kamu lakukan adalah menarik napas tenang dan tidak langsung menyimpulkan hal buruk. Terkadang teman sedang menghadapi masalah pribadi atau kesibukan baru.',
      'Cobalah ajak salah satu teman yang paling kamu percaya untuk mengobrol santai. Sampaikan perasaanmu secara jujur dan baik-baik tanpa menyudutkan. Selain itu, bukalah diri untuk berteman dengan teman-teman lain di kelas atau ekstrakurikuler yang memiliki minat positif yang sama denganmu.',
    ],
  },
  {
    id: 'art-2',
    category: 'Komunikasi Efektif',
    readTime: '4 Menit Baca',
    title: 'Seni Mendengarkan dan Berbicara Sopan agar Dihargai Teman',
    excerpt:
      'Komunikasi efektif bukan tentang siapa yang paling banyak bicara, melainkan bagaimana pesan tersampaikan dengan hangat.',
    content: [
      'Banyak kesalahpahaman antar teman sekolah terjadi bukan karena niat buruk, melainkan cara penyampaian yang kurang tepat atau terburu-buru.',
      'Untuk memulai komunikasi yang efektif: (1) Gunakan bahasa yang jelas dan sopan, (2) Dengarkan lawan bicara hingga selesai sebelum menyiapkan jawaban, dan (3) Hindari memotong pembicaraan.',
      'Ketika kamu menghargai teman yang sedang berbicara, mereka pun akan merasa nyaman dan respek saat giliranmu menyampaikan pendapat.',
    ],
  },
  {
    id: 'art-3',
    category: 'Kepercayaan Diri',
    readTime: '3 Menit Baca',
    title: 'Mengatasi Rasa Minder & Takut Salah Saat Tampil di Kelas',
    excerpt:
      'Rasa kurang percaya diri itu wajar. Kuncinya adalah berani memulai dari langkah kecil dan menghargai setiap proses.',
    content: [
      'Rasa gugup atau takut dinilai buruk oleh orang lain sering kali membuat kita menahan potensi diri. Padahal, setiap siswa sedang berada dalam proses belajar.',
      'Mulailah dengan mengenali kelebihanmu. Kamu tidak harus langsung sempurna di percobaan pertama. Beranikan diri mencoba hal baru sedikit demi sedikit—seperti menyapa teman terlebih dahulu atau menjawab satu pertanyaan sederhana.',
      'Ingatlah bahwa fokus pada proses jauh lebih menenangkan daripada menuntut hasil yang sempurna. Kamu punya potensi yang besar!',
    ],
  },
  {
    id: 'art-4',
    category: 'Mencegah Bullying',
    readTime: '5 Menit Baca',
    title: 'Kenali Jenis Bullying di Sekolah & Langkah Aman Melaporkannya',
    excerpt:
      'Bullying bisa berupa verbal, sosial, fisik, maupun siber. Ketahui peranmu untuk menjaga sekolah tetap aman.',
    content: [
      'Perundungan (bullying) tidak hanya berupa kekerasan fisik, tetapi juga ejekan berulang, pengucilan sengaja dari pergaulan, hingga komentar menyakitkan di media sosial (cyberbullying).',
      'Jika kamu melihat atau mengalaminya, ingat bahwa bullying bukanlah kesalahan korban dan tidak pernah bisa dibenarkan. Jangan ikut menertawakan, berikan dukungan pada teman yang menjadi korban, dan segera ceritakan kepada Guru BK.',
      'Ruang Bimbingan Konseling (BK) adalah tempat yang aman dan rahasia untuk membantumu mencari jalan keluar terbaik.',
    ],
  },
];

module.exports = {
  TOPICS,
  REFLECTION_CLOSING,
  SOCIAL_TIPS,
  ARTICLES,
};
