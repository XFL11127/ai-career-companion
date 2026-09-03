import { redirect } from 'next/navigation';

export default function DiagnosePage() {
  redirect('/assistant?tab=diagnose');
}
