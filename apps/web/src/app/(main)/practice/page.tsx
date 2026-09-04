import { redirect } from 'next/navigation';

export default function PracticePage() {
  redirect('/assistant?tab=practice');
}
