import { serveCatalogImage } from '@/lib/catalog-image';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return serveCatalogImage(request, (await params).id);
}
