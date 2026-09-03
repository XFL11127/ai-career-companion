import { redirect } from 'next/navigation';

export default function InfoPage() {
  redirect('/assistant?tab=info');
}
