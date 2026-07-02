import { redirect } from 'next/navigation';

export default function CreditRedirect() {
  redirect('/finance?tab=credit');
}
