import {
  TopicFriendshipIllustration,
  TopicCommunicationIllustration,
  TopicConfidenceIllustration,
  TopicBullyingIllustration,
} from '../components/Illustrations';

export const TOPIC_CARDS = [
  {
    id: 'friendship',
    title: 'Hubungan Pertemanan yang Tidak Sehat',
    shortTitle: 'Hubungan Pertemanan',
    desc: 'Merasa dijauhi teman, lingkaran pertemanan tidak sehat, atau merasa tidak dianggap.',
    Illustration: TopicFriendshipIllustration,
  },
  {
    id: 'communication',
    title: 'Komunikasi Asertif & Efektif',
    shortTitle: 'Komunikasi Asertif',
    desc: 'Menyampaikan pendapat secara asertif dan sopan tanpa takut salah atau menimbulkan salah paham.',
    Illustration: TopicCommunicationIllustration,
  },
  {
    id: 'confidence',
    title: 'Kepercayaan Diri',
    shortTitle: 'Kepercayaan Diri',
    desc: 'Rasa minder, gugup tampil di depan kelas, atau ragu dengan potensi diri sendiri.',
    Illustration: TopicConfidenceIllustration,
  },
  {
    id: 'bullying',
    title: 'Mencegah Bullying',
    shortTitle: 'Mencegah Bullying',
    desc: 'Menghadapi, mencegah, atau melaporkan tindakan perundungan di lingkungan sekolah.',
    Illustration: TopicBullyingIllustration,
  },
];
