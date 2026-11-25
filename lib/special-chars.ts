/** Characters the writer may need that are not on the keyboard. Grouped like the "special characters" box of a word processor, and searchable. */
export type SpecialChar = { text: string; label: string; /** More words to find it by (English and without accents). */ keywords?: string };
export type SpecialGroup = { name: string; items: SpecialChar[] };

export const SPECIAL_GROUPS: SpecialGroup[] = [
  { name: 'Hay dùng ở Việt Nam', items: [
    { text: '₫', label: 'Đồng Việt Nam', keywords: 'dong vnd currency tien' },
    { text: 'm²', label: 'Mét vuông', keywords: 'square metre meter area dien tich sqm' },
    { text: 'm³', label: 'Mét khối', keywords: 'cubic metre' },
    { text: '°C', label: 'Độ C', keywords: 'celsius degree temperature nhiet do' },
    { text: '°', label: 'Độ', keywords: 'degree' },
    { text: '×', label: 'Dấu nhân', keywords: 'times multiply' },
    { text: '–', label: 'Gạch ngang vừa (khoảng: 9–17)', keywords: 'en dash range' },
    { text: '—', label: 'Gạch ngang dài', keywords: 'em dash' },
    { text: '…', label: 'Dấu ba chấm', keywords: 'ellipsis' },
    { text: '·', label: 'Chấm giữa', keywords: 'middle dot interpunct' },
  ] },
  { name: 'Dấu câu', items: [
    { text: '“', label: 'Nháy kép mở', keywords: 'quote left double' }, { text: '”', label: 'Nháy kép đóng', keywords: 'quote right double' },
    { text: '‘', label: 'Nháy đơn mở', keywords: 'quote left single' }, { text: '’', label: 'Nháy đơn đóng / dấu lược', keywords: 'apostrophe right single' },
    { text: '«', label: 'Ngoặc kép góc mở', keywords: 'guillemet' }, { text: '»', label: 'Ngoặc kép góc đóng', keywords: 'guillemet' },
    { text: '•', label: 'Chấm tròn', keywords: 'bullet' }, { text: '‹', label: 'Góc đơn mở' }, { text: '›', label: 'Góc đơn đóng' },
    { text: '¿', label: 'Chấm hỏi ngược', keywords: 'spanish question' }, { text: '¡', label: 'Chấm than ngược', keywords: 'spanish exclamation' },
  ] },
  { name: 'Tiền tệ', items: [
    { text: '₫', label: 'Đồng', keywords: 'dong vnd' }, { text: '$', label: 'Đô la', keywords: 'dollar usd' }, { text: '€', label: 'Euro', keywords: 'eur' },
    { text: '£', label: 'Bảng Anh', keywords: 'pound gbp' }, { text: '¥', label: 'Yên / Nhân dân tệ', keywords: 'yen jpy yuan cny' }, { text: '₩', label: 'Won Hàn Quốc', keywords: 'won krw' },
    { text: '₽', label: 'Rúp Nga', keywords: 'ruble rub' }, { text: '¢', label: 'Xu', keywords: 'cent' },
  ] },
  { name: 'Toán và đo lường', items: [
    { text: '±', label: 'Cộng trừ', keywords: 'plus minus' }, { text: '÷', label: 'Dấu chia', keywords: 'divide' }, { text: '≈', label: 'Xấp xỉ', keywords: 'approximately about' },
    { text: '≠', label: 'Khác', keywords: 'not equal' }, { text: '≤', label: 'Nhỏ hơn hoặc bằng', keywords: 'less than or equal' }, { text: '≥', label: 'Lớn hơn hoặc bằng', keywords: 'greater than or equal' },
    { text: '½', label: 'Một nửa', keywords: 'half' }, { text: '¼', label: 'Một phần tư', keywords: 'quarter' }, { text: '¾', label: 'Ba phần tư' },
    { text: '%', label: 'Phần trăm', keywords: 'percent' }, { text: '‰', label: 'Phần nghìn', keywords: 'per mille' }, { text: '∞', label: 'Vô cực', keywords: 'infinity' },
    { text: '²', label: 'Mũ hai', keywords: 'superscript two squared' }, { text: '³', label: 'Mũ ba', keywords: 'superscript three cubed' }, { text: 'µ', label: 'Micro', keywords: 'mu micro' },
  ] },
  { name: 'Mũi tên', items: [
    { text: '→', label: 'Phải', keywords: 'arrow right' }, { text: '←', label: 'Trái', keywords: 'arrow left' }, { text: '↑', label: 'Lên', keywords: 'arrow up' }, { text: '↓', label: 'Xuống', keywords: 'arrow down' },
    { text: '↔', label: 'Hai chiều', keywords: 'arrow both' }, { text: '⇒', label: 'Suy ra', keywords: 'implies double arrow' }, { text: '↗', label: 'Lên phải', keywords: 'arrow up right' },
  ] },
  { name: 'Ký hiệu', items: [
    { text: '©', label: 'Bản quyền', keywords: 'copyright' }, { text: '®', label: 'Nhãn hiệu đã đăng ký', keywords: 'registered' }, { text: '™', label: 'Nhãn hiệu', keywords: 'trademark' },
    { text: '§', label: 'Điều khoản', keywords: 'section' }, { text: '¶', label: 'Đoạn', keywords: 'pilcrow paragraph' }, { text: '№', label: 'Số', keywords: 'numero number' },
    { text: '✓', label: 'Dấu tích', keywords: 'check tick yes' }, { text: '✗', label: 'Dấu gạch', keywords: 'cross no x' }, { text: '★', label: 'Sao đặc', keywords: 'star' }, { text: '☆', label: 'Sao rỗng', keywords: 'star' },
    { text: '†', label: 'Dấu dao', keywords: 'dagger footnote' },
  ] },
  { name: 'Chữ Latin có dấu (tên khách, địa danh)', items: [
    ...'áàâãäåæçéèêëíìîïñóòôõöøœúùûüýÿßÁÀÂÃÄÅÆÇÉÈÊËÍÌÎÏÑÓÒÔÕÖØŒÚÙÛÜÝ'.split('').map(text => ({ text, label: text, keywords: 'accent latin letter chu cai' })),
  ] },
  { name: 'Chữ tiếng Việt', items: [
    ...'ăâđêôơưĂÂĐÊÔƠƯ'.split('').map(text => ({ text, label: text, keywords: 'vietnamese letter chu cai tieng viet' })),
  ] },
];

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** The characters whose name or search words contain `query` (accents ignored), grouped; every group when the query is empty. */
export function searchChars(query: string, groups: SpecialGroup[] = SPECIAL_GROUPS): SpecialGroup[] {
  const q = plain(query.trim());
  if (!q) return groups;
  return groups.map(group => ({ name: group.name, items: group.items.filter(item => item.text === query.trim() || plain(`${item.label} ${item.keywords || ''}`).includes(q)) })).filter(group => group.items.length > 0);
}
