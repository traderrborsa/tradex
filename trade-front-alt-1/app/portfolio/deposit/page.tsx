import { redirect } from 'next/navigation';

export default function DepositRedirect() {
  redirect('/finance?tab=deposit');
}
