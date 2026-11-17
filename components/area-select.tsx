'use client';

/** Dropdown under an admin photo: choosing an area saves it straight away. */
export function AreaSelect({ kind, sourceId, imageId, value, options, label }: { kind: string; sourceId: string; imageId: string; value: string; options: Array<[string, string]>; label: string }) {
  return <form action="/api/admin/catalog-images" method="post" className="area-select">
    <input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="returnTo" value="media" />
    <input type="hidden" name="imageId" value={imageId} /><input type="hidden" name="action" value="area" />
    <select name="area" defaultValue={value} aria-label={label} onChange={event => event.currentTarget.form?.requestSubmit()}>
      <option value="">{label}</option>
      {options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </select>
    <noscript><button>Lưu</button></noscript>
  </form>;
}
