import { redirect } from 'next/navigation';

export default function PackagePage() {
  redirect('/assistant?tab=package');
}
