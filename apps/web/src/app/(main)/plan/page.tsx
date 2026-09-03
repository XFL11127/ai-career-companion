import { redirect } from 'next/navigation';

export default function PlanPage() {
  redirect('/assistant?tab=plan');
}
