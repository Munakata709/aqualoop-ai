// This route reads the dynamic [id] segment at request time (no fixed set of AWG ids to
// prerender), so it's excluded from static prerendering.
export const instant = false;

import { AwgDetailClient } from "./AwgDetailClient";

export default async function AwgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AwgDetailClient awgId={id} />;
}
