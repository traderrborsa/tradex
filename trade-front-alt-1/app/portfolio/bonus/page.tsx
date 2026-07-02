import { redirect } from 'next/navigation';

export default function BonusRedirect() {
  redirect('/finance?tab=campaign');
}
