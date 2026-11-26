import { describe, expect, it } from 'vitest';
import { addPictures, numberHeadings, planSections, removePicture, usedPictureIds } from '@/lib/journal-sections';

const body = 'Opening answer.\n\nSecond paragraph.\n\n## First\n\nText.\n\n### Part\n\nMore.\n\n## Second\n\nEnd.\n';
const pic = '![A quiet lane in An Thuong at dusk with apartments](/media/catalog/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)';

describe('planSections', () => {
  it('splits the opening and the ## sections, ### belongs to its ##', () => {
    const sections = planSections(body);
    expect(sections.map(item => item.key)).toEqual(['intro', 'h2-0', 'h2-1']);
    expect(sections.map(item => item.title)).toEqual(['', 'First', 'Second']);
  });
  it('puts a picture after the first paragraph of the opening and right under a heading', () => {
    expect(addPictures(body, 'intro', [pic]).startsWith(`Opening answer.\n\n${pic}\n\nSecond paragraph.`)).toBe(true);
    expect(addPictures(body, 'h2-1', [pic])).toContain(`## Second\n\n${pic}\n\nEnd.`);
  });
  it('keeps several pictures in the order given', () => {
    const two = addPictures(body, 'h2-0', [pic, pic.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')]);
    expect(two.indexOf('aaaaaaaa')).toBeLessThan(two.indexOf('bbbbbbbb'));
    expect(two).toContain('## First\n\n![');
  });
  it('lists the pictures each section has, including the ones under a ###', () => {
    const text = addPictures(addPictures(body, 'h2-0', [pic]), 'h2-1', [pic.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc')]);
    const sections = planSections(text);
    expect(sections[1].pictures.map(item => item.id)).toEqual(['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);
    expect(sections[2].pictures.map(item => item.id)).toEqual(['cccccccc-cccc-cccc-cccc-cccccccccccc']);
    expect([...usedPictureIds(text)].sort()).toEqual(['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc']);
  });
  it('works for a post with no headings and for an empty post', () => {
    expect(planSections('Just text.').map(item => item.key)).toEqual(['intro']);
    expect(addPictures('', 'intro', [pic])).toContain(pic);
    expect(addPictures('Just text.', 'h2-9', [pic])).toContain(pic); // an unknown section falls back to the opening
  });
});

describe('removePicture', () => {
  it('takes the line out without leaving a gap', () => {
    const text = addPictures(body, 'h2-0', [pic]);
    const target = planSections(text)[1].pictures[0];
    expect(removePicture(text, target)).toBe(body);
  });
  it('takes only the picture out of a line with other text', () => {
    const text = `Before ${pic} after.\n\n## A\n`;
    expect(removePicture(text, planSections(text)[0].pictures[0])).toBe('Before  after.\n\n## A\n');
  });
});

describe('numberHeadings', () => {
  it('numbers ## as 1, 2 and ### as 1.1, 2.1', () => {
    expect(numberHeadings([{ level: 2 }, { level: 3 }, { level: 3 }, { level: 2 }, { level: 3 }]).map(item => item.number)).toEqual(['1', '1.1', '1.2', '2', '2.1']);
  });
});
